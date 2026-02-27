
-- Fix search_path on trigger functions
ALTER FUNCTION deals.validate_net_revenue() SET search_path = deals;
ALTER FUNCTION deals.prevent_signed_offer_update() SET search_path = deals;
ALTER FUNCTION deals.prevent_executed_contract_update() SET search_path = deals;
ALTER FUNCTION deals.prevent_financial_delete() SET search_path = deals;
