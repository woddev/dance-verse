
-- Update immutability trigger to allow hash-only updates during signing
-- (for PDF re-generation after signature appending)
CREATE OR REPLACE FUNCTION deals.prevent_executed_contract_update()
RETURNS trigger
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
      RETURN NEW;
    END IF;
    INSERT INTO deals.contract_audit_log (contract_id, attempted_action, attempted_by, details)
    VALUES (OLD.id, 'UPDATE_EXECUTED_CONTRACT', COALESCE(NEW.created_by, OLD.created_by),
            'Attempted to modify fully executed contract');
    RAISE EXCEPTION 'Cannot modify a fully executed contract (id: %)', OLD.id;
  END IF;

  -- For signed states, protect critical fields BUT allow hash_checksum-only updates
  -- (needed for PDF re-generation after signature appending)
  IF OLD.status IN ('signed_by_producer', 'signed_by_platform') THEN
    -- Check if ONLY hash_checksum changed (signature append scenario)
    IF NEW.hash_checksum IS DISTINCT FROM OLD.hash_checksum AND
       NEW.pdf_url IS NOT DISTINCT FROM OLD.pdf_url AND
       NEW.offer_id IS NOT DISTINCT FROM OLD.offer_id AND
       NEW.template_id IS NOT DISTINCT FROM OLD.template_id AND
       NEW.template_version_snapshot IS NOT DISTINCT FROM OLD.template_version_snapshot AND
       NEW.rendered_body IS NOT DISTINCT FROM OLD.rendered_body THEN
      -- Allow hash-only update (post-signature PDF rehash)
      RETURN NEW;
    END IF;

    -- Block other protected field changes
    IF NEW.pdf_url IS DISTINCT FROM OLD.pdf_url OR
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
