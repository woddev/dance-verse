
-- Create partners table
CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  name text NOT NULL,
  email text NOT NULL,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  stripe_account_id text NULL,
  stripe_onboarded boolean NOT NULL DEFAULT false,
  earnings_window_months integer NOT NULL DEFAULT 12,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create partner_referrals table
CREATE TABLE public.partner_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  dancer_id uuid NOT NULL,
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(dancer_id)
);

-- Create partner_commissions table
CREATE TABLE public.partner_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  payout_id uuid NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  dancer_id uuid NOT NULL,
  dancer_payout_cents integer NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  commission_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  stripe_transfer_id text NULL,
  paid_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(payout_id)
);

-- Add referral_code to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referral_code text NULL;

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;

-- Partners RLS: only admins write, partners read their own
CREATE POLICY "Admins can manage partners"
  ON public.partners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own record"
  ON public.partners FOR SELECT
  USING (user_id = auth.uid());

-- Partner referrals RLS
CREATE POLICY "Admins can manage partner_referrals"
  ON public.partner_referrals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own referrals"
  ON public.partner_referrals FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Partner commissions RLS
CREATE POLICY "Admins can manage partner_commissions"
  ON public.partner_commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own commissions"
  ON public.partner_commissions FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Index for performance
CREATE INDEX idx_partner_referrals_partner_id ON public.partner_referrals(partner_id);
CREATE INDEX idx_partner_commissions_partner_id ON public.partner_commissions(partner_id);
CREATE INDEX idx_partner_commissions_status ON public.partner_commissions(status);
