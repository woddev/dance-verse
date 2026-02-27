
-- =============================================
-- CONTRACT GENERATION & EXECUTION ENGINE
-- =============================================

-- 1. CONTRACT TEMPLATES TABLE
CREATE TABLE deals.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  deal_type deals.deal_type NOT NULL,
  template_version TEXT NOT NULL,
  template_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deal_type, template_version)
);

-- Only one active template per deal_type enforced by trigger
CREATE OR REPLACE FUNCTION deals.enforce_single_active_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'deals'
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE deals.contract_templates
    SET is_active = false
    WHERE deal_type = NEW.deal_type AND id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_active_template
BEFORE INSERT OR UPDATE ON deals.contract_templates
FOR EACH ROW EXECUTE FUNCTION deals.enforce_single_active_template();

-- 2. ADD template_id AND template_version_snapshot TO contracts
ALTER TABLE deals.contracts
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES deals.contract_templates(id),
  ADD COLUMN IF NOT EXISTS template_version_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS rendered_body TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID;

-- 3. CONTRACT STATE HISTORY TABLE
CREATE TABLE deals.contract_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES deals.contracts(id),
  previous_state TEXT,
  new_state TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_state_history_contract ON deals.contract_state_history(contract_id);

-- 4. CONTRACT SIGNATURES TABLE
CREATE TABLE deals.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES deals.contracts(id),
  signer_id UUID NOT NULL,
  signer_role TEXT NOT NULL, -- 'producer' or 'admin'
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_signatures_contract ON deals.contract_signatures(contract_id);

-- 5. CONTRACT AUDIT LOG (attempted modifications on locked contracts)
CREATE TABLE deals.contract_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES deals.contracts(id),
  attempted_action TEXT NOT NULL,
  attempted_by UUID,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details TEXT
);

-- 6. UPDATE transition_contract_state TO LOG HISTORY
CREATE OR REPLACE FUNCTION deals.transition_contract_state(
  p_contract_id UUID,
  p_new_state deals.contract_status,
  p_changed_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'deals'
AS $$
DECLARE
  v_current deals.contract_status;
  v_allowed deals.contract_status[];
BEGIN
  SELECT status INTO v_current FROM deals.contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract % not found', p_contract_id; END IF;

  v_allowed := CASE v_current
    WHEN 'generated' THEN ARRAY['sent_for_signature','archived']::deals.contract_status[]
    WHEN 'sent_for_signature' THEN ARRAY['signed_by_producer','archived']::deals.contract_status[]
    WHEN 'signed_by_producer' THEN ARRAY['signed_by_platform']::deals.contract_status[]
    WHEN 'signed_by_platform' THEN ARRAY['fully_executed']::deals.contract_status[]
    WHEN 'fully_executed' THEN ARRAY['archived']::deals.contract_status[]
    ELSE ARRAY[]::deals.contract_status[]
  END;

  IF NOT (p_new_state = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid contract transition from % to %', v_current, p_new_state;
  END IF;

  -- Log state history
  INSERT INTO deals.contract_state_history (contract_id, previous_state, new_state, changed_by)
  VALUES (p_contract_id, v_current::text, p_new_state::text, p_changed_by);

  UPDATE deals.contracts SET status = p_new_state WHERE id = p_contract_id;
END;
$$;

-- 7. ENHANCED IMMUTABILITY TRIGGER
CREATE OR REPLACE FUNCTION deals.prevent_executed_contract_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'deals'
AS $$
BEGIN
  IF OLD.status = 'fully_executed' THEN
    -- Only allow status change to archived by the transition function
    IF NEW.status = 'archived'::deals.contract_status AND
       NEW.template_version_snapshot IS NOT DISTINCT FROM OLD.template_version_snapshot AND
       NEW.pdf_url IS NOT DISTINCT FROM OLD.pdf_url AND
       NEW.hash_checksum IS NOT DISTINCT FROM OLD.hash_checksum AND
       NEW.offer_id IS NOT DISTINCT FROM OLD.offer_id AND
       NEW.template_id IS NOT DISTINCT FROM OLD.template_id AND
       NEW.rendered_body IS NOT DISTINCT FROM OLD.rendered_body THEN
      -- Allow archival transition only
      RETURN NEW;
    END IF;
    -- Log the attempt
    INSERT INTO deals.contract_audit_log (contract_id, attempted_action, attempted_by, details)
    VALUES (OLD.id, 'UPDATE_EXECUTED_CONTRACT', COALESCE(NEW.created_by, OLD.created_by),
            'Attempted to modify fully executed contract');
    RAISE EXCEPTION 'Cannot modify a fully executed contract (id: %)', OLD.id;
  END IF;

  -- For signed_by_producer/signed_by_platform, protect critical fields
  IF OLD.status IN ('signed_by_producer', 'signed_by_platform') THEN
    IF NEW.pdf_url IS DISTINCT FROM OLD.pdf_url OR
       NEW.hash_checksum IS DISTINCT FROM OLD.hash_checksum OR
       NEW.offer_id IS DISTINCT FROM OLD.offer_id OR
       NEW.template_id IS DISTINCT FROM OLD.template_id OR
       NEW.template_version_snapshot IS DISTINCT FROM OLD.template_version_snapshot THEN
      INSERT INTO deals.contract_audit_log (contract_id, attempted_action, attempted_by, details)
      VALUES (OLD.id, 'UPDATE_SIGNED_CONTRACT_FIELDS', COALESCE(NEW.created_by, OLD.created_by),
              'Attempted to modify protected fields on signed contract');
      RAISE EXCEPTION 'Cannot modify protected fields on a signed contract (id: %)', OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 8. PREVENT DELETE ON CONTRACTS
CREATE OR REPLACE FUNCTION deals.prevent_contract_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'deals'
AS $$
BEGIN
  IF OLD.status IN ('signed_by_producer', 'signed_by_platform', 'fully_executed') THEN
    INSERT INTO deals.contract_audit_log (contract_id, attempted_action, details)
    VALUES (OLD.id, 'DELETE_CONTRACT', 'Attempted to delete signed/executed contract');
    RAISE EXCEPTION 'Cannot delete a signed or fully executed contract (id: %)', OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_contract_delete
BEFORE DELETE ON deals.contracts
FOR EACH ROW EXECUTE FUNCTION deals.prevent_contract_delete();

-- 9. GENERATE CONTRACT RPC (called when offer is accepted)
CREATE OR REPLACE FUNCTION public.admin_generate_contract(
  p_user_id UUID,
  p_offer_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE
  v_offer RECORD;
  v_template RECORD;
  v_contract_id UUID;
  v_track RECORD;
  v_producer RECORD;
  v_rendered TEXT;
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  -- Get offer details
  SELECT o.*, t.title AS track_title, t.id AS track_id, t.producer_id
  INTO v_offer
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND o.status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or not in accepted state'; END IF;

  -- Archive any existing contracts for this offer's track (versioning safety)
  UPDATE deals.contracts c
  SET status = 'archived'::deals.contract_status, archived_at = now(), archived_by = p_user_id
  FROM deals.offers o
  WHERE c.offer_id = o.id AND o.track_id = v_offer.track_id
    AND c.status NOT IN ('fully_executed', 'archived');

  -- Get active template for deal_type
  SELECT * INTO v_template
  FROM deals.contract_templates
  WHERE deal_type = v_offer.deal_type AND is_active = true
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active contract template for deal type: %', v_offer.deal_type; END IF;

  -- Get producer details
  SELECT * INTO v_producer FROM deals.producers WHERE id = v_offer.producer_id;

  -- Render template with variable injection
  v_rendered := v_template.template_body;
  v_rendered := replace(v_rendered, '{{producer_legal_name}}', COALESCE(v_producer.legal_name, ''));
  v_rendered := replace(v_rendered, '{{track_title}}', COALESCE(v_offer.track_title, ''));
  v_rendered := replace(v_rendered, '{{deal_type}}', COALESCE(v_offer.deal_type::TEXT, ''));
  v_rendered := replace(v_rendered, '{{buyout_amount}}', COALESCE(v_offer.buyout_amount::TEXT, 'N/A'));
  v_rendered := replace(v_rendered, '{{producer_split_percent}}', COALESCE(v_offer.producer_split_percent::TEXT, 'N/A'));
  v_rendered := replace(v_rendered, '{{platform_split_percent}}', COALESCE(v_offer.platform_split_percent::TEXT, 'N/A'));
  v_rendered := replace(v_rendered, '{{term_length}}', COALESCE(v_offer.term_length, 'N/A'));
  v_rendered := replace(v_rendered, '{{territory}}', COALESCE(v_offer.territory, 'Worldwide'));
  v_rendered := replace(v_rendered, '{{exclusivity_flag}}', CASE WHEN v_offer.exclusivity_flag THEN 'Exclusive' ELSE 'Non-Exclusive' END);
  v_rendered := replace(v_rendered, '{{effective_date}}', to_char(now(), 'Month DD, YYYY'));

  -- Create contract record
  INSERT INTO deals.contracts (
    offer_id, template_id, template_version_snapshot, rendered_body,
    status, created_by
  ) VALUES (
    p_offer_id, v_template.id, v_template.template_version, v_rendered,
    'generated', p_user_id
  ) RETURNING id INTO v_contract_id;

  -- Log initial state
  INSERT INTO deals.contract_state_history (contract_id, previous_state, new_state, changed_by)
  VALUES (v_contract_id, NULL, 'generated', p_user_id);

  RETURN v_contract_id;
END;
$$;

-- 10. SEND CONTRACT FOR SIGNATURE
CREATE OR REPLACE FUNCTION public.admin_send_contract(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  -- Must have a PDF to send
  IF NOT EXISTS (SELECT 1 FROM deals.contracts WHERE id = p_contract_id AND pdf_url IS NOT NULL) THEN
    RAISE EXCEPTION 'Contract must have a PDF before sending for signature';
  END IF;
  PERFORM deals.transition_contract_state(p_contract_id, 'sent_for_signature', p_user_id);
END;
$$;

-- 11. PRODUCER SIGN CONTRACT
CREATE OR REPLACE FUNCTION public.producer_sign_contract(
  p_user_id UUID,
  p_contract_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE
  v_pid UUID;
  v_contract RECORD;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  -- Verify contract belongs to producer's track and is sent_for_signature
  SELECT c.* INTO v_contract
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE c.id = p_contract_id AND t.producer_id = v_pid AND c.status = 'sent_for_signature';
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found, access denied, or not ready for signing'; END IF;

  -- Record signature
  INSERT INTO deals.contract_signatures (contract_id, signer_id, signer_role, ip_address, user_agent)
  VALUES (p_contract_id, p_user_id, 'producer', p_ip_address, p_user_agent);

  -- Update signed_at timestamp
  UPDATE deals.contracts SET producer_signed_at = now() WHERE id = p_contract_id;

  -- Transition state
  PERFORM deals.transition_contract_state(p_contract_id, 'signed_by_producer', p_user_id);
END;
$$;

-- 12. ADMIN SIGN CONTRACT (countersign)
CREATE OR REPLACE FUNCTION public.admin_sign_contract(
  p_user_id UUID,
  p_contract_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE
  v_contract RECORD;
  v_track_id UUID;
  v_offer_id UUID;
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT c.*, o.track_id INTO v_contract
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  WHERE c.id = p_contract_id AND c.status = 'signed_by_producer';
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found or not ready for admin signature'; END IF;

  v_track_id := v_contract.track_id;
  v_offer_id := v_contract.offer_id;

  -- Record signature
  INSERT INTO deals.contract_signatures (contract_id, signer_id, signer_role, ip_address, user_agent)
  VALUES (p_contract_id, p_user_id, 'admin', p_ip_address, p_user_agent);

  -- Update signed_at timestamp
  UPDATE deals.contracts SET admin_signed_at = now() WHERE id = p_contract_id;

  -- Transition contract: signed_by_producer → signed_by_platform → fully_executed
  PERFORM deals.transition_contract_state(p_contract_id, 'signed_by_platform', p_user_id);
  PERFORM deals.transition_contract_state(p_contract_id, 'fully_executed', p_user_id);

  -- CASCADE: Offer → signed
  PERFORM deals.transition_offer_state(v_offer_id, 'signed', p_user_id);

  -- CASCADE: Track → active (from deal_signed)
  PERFORM deals.transition_track_state(v_track_id, 'active', p_user_id);
END;
$$;

-- 13. ADMIN GET CONTRACT DETAIL
CREATE OR REPLACE FUNCTION public.admin_contract_detail(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS TABLE(
  id UUID, offer_id UUID, offer_version INT, track_title TEXT, producer_name TEXT,
  deal_type TEXT, template_version TEXT, rendered_body TEXT,
  pdf_url TEXT, hash_checksum TEXT,
  status deals.contract_status,
  producer_signed_at TIMESTAMPTZ, admin_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, created_by UUID
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT c.id, c.offer_id, o.version_number, t.title, COALESCE(pr.stage_name, pr.legal_name),
    o.deal_type::TEXT, c.template_version_snapshot, c.rendered_body,
    c.pdf_url, c.hash_checksum, c.status,
    c.producer_signed_at, c.admin_signed_at, c.created_at, c.created_by
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  JOIN deals.producers pr ON pr.id = t.producer_id
  WHERE c.id = p_contract_id;
END;
$$;

-- 14. CONTRACT STATE HISTORY
CREATE OR REPLACE FUNCTION public.admin_contract_history(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS TABLE(id UUID, previous_state TEXT, new_state TEXT, changed_by UUID, changed_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT h.id, h.previous_state, h.new_state, h.changed_by, h.changed_at
  FROM deals.contract_state_history h WHERE h.contract_id = p_contract_id ORDER BY h.changed_at ASC;
END;
$$;

-- 15. CONTRACT SIGNATURES LIST
CREATE OR REPLACE FUNCTION public.admin_contract_signatures(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS TABLE(id UUID, signer_id UUID, signer_role TEXT, ip_address TEXT, user_agent TEXT, signed_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT s.id, s.signer_id, s.signer_role, s.ip_address, s.user_agent, s.signed_at
  FROM deals.contract_signatures s WHERE s.contract_id = p_contract_id ORDER BY s.signed_at ASC;
END;
$$;

-- 16. PRODUCER CONTRACT DETAIL (limited fields)
CREATE OR REPLACE FUNCTION public.producer_contract_detail(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS TABLE(
  id UUID, offer_id UUID, offer_version INT, track_title TEXT,
  deal_type TEXT, template_version TEXT, rendered_body TEXT,
  status deals.contract_status,
  producer_signed_at TIMESTAMPTZ, admin_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  RETURN QUERY
  SELECT c.id, c.offer_id, o.version_number, t.title,
    o.deal_type::TEXT, c.template_version_snapshot, c.rendered_body,
    c.status, c.producer_signed_at, c.admin_signed_at, c.created_at
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE c.id = p_contract_id AND t.producer_id = v_pid
    AND c.status != 'generated'; -- Can't see until sent_for_signature
END;
$$;

-- 17. ALL CONTRACTS FOR ADMIN LIST VIEW
CREATE OR REPLACE FUNCTION public.admin_all_contracts(p_user_id UUID)
RETURNS TABLE(
  id UUID, offer_id UUID, track_title TEXT, producer_name TEXT,
  offer_version INT, deal_type TEXT, status deals.contract_status,
  producer_signed_at TIMESTAMPTZ, admin_signed_at TIMESTAMPTZ,
  pdf_url TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT c.id, c.offer_id, t.title, COALESCE(pr.stage_name, pr.legal_name),
    o.version_number, o.deal_type::TEXT, c.status,
    c.producer_signed_at, c.admin_signed_at, c.pdf_url, c.created_at
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  JOIN deals.producers pr ON pr.id = t.producer_id
  WHERE c.status != 'archived'
  ORDER BY c.created_at DESC;
END;
$$;

-- 18. ARCHIVE CONTRACT (for re-negotiation)
CREATE OR REPLACE FUNCTION public.admin_archive_contract(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_status deals.contract_status;
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT status INTO v_status FROM deals.contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF v_status = 'fully_executed' THEN
    IF NOT public.is_super_admin(p_user_id) THEN
      RAISE EXCEPTION 'Only super admins can archive fully executed contracts';
    END IF;
  END IF;
  PERFORM deals.transition_contract_state(p_contract_id, 'archived', p_user_id);
  UPDATE deals.contracts SET archived_at = now(), archived_by = p_user_id WHERE id = p_contract_id;
END;
$$;

-- 19. SEED DEFAULT TEMPLATES
INSERT INTO deals.contract_templates (name, deal_type, template_version, template_body, is_active) VALUES
(
  'Standard Buyout Agreement',
  'buyout',
  '1.0.0',
  E'MUSIC LICENSING AGREEMENT - BUYOUT\n\nThis Agreement ("Agreement") is entered into as of {{effective_date}} by and between:\n\nLicensor: {{producer_legal_name}} ("Producer")\nLicensee: DanceVerse Inc. ("Platform")\n\nTrack: {{track_title}}\nDeal Type: {{deal_type}}\n\n1. GRANT OF RIGHTS\nProducer hereby grants to Platform an {{exclusivity_flag}} license to the musical composition and sound recording identified above.\n\n2. COMPENSATION\nBuyout Amount: ${{buyout_amount}}\nPayment shall be made within 30 days of full execution of this Agreement.\n\n3. TERRITORY\n{{territory}}\n\n4. TERM\n{{term_length}}\n\n5. OWNERSHIP\nProducer Split: {{producer_split_percent}}%\nPlatform Split: {{platform_split_percent}}%\n\n6. REPRESENTATIONS AND WARRANTIES\nProducer represents and warrants that they are the sole owner of the Track and have full authority to enter into this Agreement.\n\n7. SIGNATURES\n\n____________________________\nProducer: {{producer_legal_name}}\nDate:\n\n____________________________\nDanceVerse Inc.\nDate:',
  true
),
(
  'Standard Revenue Split Agreement',
  'revenue_split',
  '1.0.0',
  E'MUSIC LICENSING AGREEMENT - REVENUE SPLIT\n\nThis Agreement ("Agreement") is entered into as of {{effective_date}} by and between:\n\nLicensor: {{producer_legal_name}} ("Producer")\nLicensee: DanceVerse Inc. ("Platform")\n\nTrack: {{track_title}}\nDeal Type: {{deal_type}}\n\n1. GRANT OF RIGHTS\nProducer hereby grants to Platform an {{exclusivity_flag}} license to the musical composition and sound recording identified above.\n\n2. REVENUE SHARING\nProducer Split: {{producer_split_percent}}%\nPlatform Split: {{platform_split_percent}}%\n\nRevenue shall be calculated on net revenue after platform fees and distributed monthly.\n\n3. TERRITORY\n{{territory}}\n\n4. TERM\n{{term_length}}\n\n5. REPRESENTATIONS AND WARRANTIES\nProducer represents and warrants that they are the sole owner of the Track and have full authority to enter into this Agreement.\n\n6. SIGNATURES\n\n____________________________\nProducer: {{producer_legal_name}}\nDate:\n\n____________________________\nDanceVerse Inc.\nDate:',
  true
),
(
  'Standard Hybrid Agreement',
  'hybrid',
  '1.0.0',
  E'MUSIC LICENSING AGREEMENT - HYBRID\n\nThis Agreement ("Agreement") is entered into as of {{effective_date}} by and between:\n\nLicensor: {{producer_legal_name}} ("Producer")\nLicensee: DanceVerse Inc. ("Platform")\n\nTrack: {{track_title}}\nDeal Type: {{deal_type}}\n\n1. GRANT OF RIGHTS\nProducer hereby grants to Platform an {{exclusivity_flag}} license to the musical composition and sound recording identified above.\n\n2. COMPENSATION\nUpfront Payment: ${{buyout_amount}}\nOngoing Revenue Split:\n  Producer: {{producer_split_percent}}%\n  Platform: {{platform_split_percent}}%\n\n3. TERRITORY\n{{territory}}\n\n4. TERM\n{{term_length}}\n\n5. REPRESENTATIONS AND WARRANTIES\nProducer represents and warrants that they are the sole owner of the Track and have full authority to enter into this Agreement.\n\n6. SIGNATURES\n\n____________________________\nProducer: {{producer_legal_name}}\nDate:\n\n____________________________\nDanceVerse Inc.\nDate:',
  true
);

-- 20. RLS POLICIES for new tables (accessed via SECURITY DEFINER functions, but add base protection)
ALTER TABLE deals.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.contract_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.contract_audit_log ENABLE ROW LEVEL SECURITY;

-- Templates: admin read, no direct writes (managed by RPCs)
CREATE POLICY "Admin view templates" ON deals.contract_templates
  FOR SELECT TO authenticated
  USING (public.is_deal_viewer(auth.uid()));

-- State history: admin view
CREATE POLICY "Admin view contract history" ON deals.contract_state_history
  FOR SELECT TO authenticated
  USING (public.is_deal_viewer(auth.uid()));

-- Signatures: admin view
CREATE POLICY "Admin view signatures" ON deals.contract_signatures
  FOR SELECT TO authenticated
  USING (public.is_deal_viewer(auth.uid()));

-- Audit log: super admin view only
CREATE POLICY "Super admin view audit log" ON deals.contract_audit_log
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
