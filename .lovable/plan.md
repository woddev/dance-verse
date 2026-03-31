

# Simplify Signing: Producer-Only Signature

## Summary
Change the contract flow so that when the producer signs, the contract immediately becomes `fully_executed` — no admin countersign needed. The producer's acceptance of the terms serves as the binding agreement.

## Database Migration

Modify `producer_sign_contract` to go directly from `sent_for_signature` → `signed_by_producer` → `signed_by_platform` → `fully_executed` in one step (reusing the existing transition function). Also cascade the offer to `signed` and track to `active`, mirroring what `admin_sign_contract` currently does.

Update the state transition function to allow `signed_by_producer` → `fully_executed` directly (shortcut).

**New migration SQL:**
- Recreate `producer_sign_contract` to also set `admin_signed_at = now()`, transition through `signed_by_platform` and `fully_executed`, and cascade offer → signed, track → active
- Update `transition_contract_state` to allow `signed_by_producer` → `fully_executed` directly

## Frontend Changes

### `src/pages/producer/Deals.tsx`
- Remove the "waiting for countersign" messaging for `signed_by_producer` state
- Treat `signed_by_producer` same as `fully_executed` for display (show download button)

### `src/components/deals/admin/ContractDetailPanel.tsx`
- Remove the admin countersign UI block (the `signed_by_producer` section with name input, checkbox, and countersign button)
- Contracts go straight to `fully_executed` after producer signs

### `src/pages/admin/TrackReview.tsx`
- Remove any admin countersign references if present

## Files Modified
1. **New migration** — update `producer_sign_contract` + `transition_contract_state`
2. `src/pages/producer/Deals.tsx` — remove countersign waiting state
3. `src/components/deals/admin/ContractDetailPanel.tsx` — remove admin countersign UI

