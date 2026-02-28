

# Update Buyout Contract Template

## Overview
Replace the current placeholder buyout contract template with the professional Work-for-Hire & Assignment Agreement you provided.

## What will change

**Database update**: The existing buyout contract template (id: `79d10d78-...`) will be updated with:
- The full legal contract text you provided
- Template variables (`{{producer_legal_name}}`, `{{track_title}}`, `{{buyout_amount}}`, `{{effective_date}}`, `{{exclusivity_flag}}`, etc.) inserted at the appropriate places
- Template version bumped to `2.0.0`

**Variable mapping** in the contract text:
- `__________________ ("Producer")` becomes `{{producer_legal_name}} ("Producer")`
- `$________` becomes `${{buyout_amount}}`
- `"Produced by [Producer Name]"` becomes `"Produced by {{producer_legal_name}}"`
- The effective date clause will use `{{effective_date}}`

## What will NOT change
- The contract generation engine, PDF generator, and signing flow remain the same
- The `admin_generate_contract` function already handles all the variable replacements
- No code changes needed -- this is purely a template content update

## Auto-contract generation
After updating the template, we will also implement the previously approved plan to **auto-generate and send the contract when a producer accepts an offer**, so the flow becomes:

1. Producer clicks "Accept" on an offer
2. System accepts the offer, generates the contract with this template, creates the PDF, and sends it for signature -- all automatically
3. Producer is redirected to the contracts page to sign

### Technical steps for auto-generation:
1. **New DB function** `auto_generate_contract` -- a `SECURITY DEFINER` function that wraps `admin_generate_contract` logic but allows the system to call it without admin role checks (only when offer is `accepted`)
2. **Update `useProducerApi.ts`** -- after `acceptOffer` succeeds, chain a call to the `contract-engine` edge function with `action=generate`
3. **Update `OfferDetail.tsx`** -- show loading state during contract generation and redirect to `/producer/contracts`

