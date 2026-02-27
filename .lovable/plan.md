

# Music Deal Management System -- Backend Architecture

## Approach: Isolated `deals` Schema

All new tables will live in a dedicated `deals` schema, fully isolated from the existing `public` campaign tables. RLS policies and security-definer functions will be configured to work with this schema.

---

## 1. Database Migration

### Schema and Enums

Create the `deals` schema and the following custom enums:

- `deals.deal_type`: buyout, revenue_split, hybrid
- `deals.track_status`: draft, submitted, under_review, denied, offer_pending, offer_sent, counter_received, deal_signed, active, expired, terminated
- `deals.offer_status`: draft, sent, viewed, countered, revised, accepted, rejected, expired, signed
- `deals.contract_status`: generated, sent_for_signature, signed_by_producer, signed_by_platform, fully_executed, archived
- `deals.payout_status`: pending, processing, completed, failed

### Tables (all in `deals` schema)

1. **producers** -- legal entities with payout/tax info
2. **tracks** -- music assets linked to a producer, with ownership percentages and ISRC
3. **track_state_history** -- immutable audit log of track state changes
4. **offers** -- versioned deal proposals linked to tracks
5. **offer_state_history** -- immutable audit log of offer state changes
6. **contracts** -- signed agreements linked to offers, with PDF and hash
7. **revenue_events** -- gross/net revenue records per track
8. **revenue_distributions** -- split calculations derived from revenue events
9. **payouts** -- financial disbursements to producers

### Constraints and Indexes

- Foreign keys on all relationship columns (no cascading deletes on financial tables)
- `NOT NULL` on all required financial fields (gross_revenue, net_revenue, platform_fee, amount)
- Unique constraint on `producers.email`
- Unique constraint on `(track_id, version_number)` on offers
- Indexes on all foreign keys and status columns
- Validation trigger: `net_revenue = gross_revenue - platform_fee` on revenue_events

### Validation Triggers (not CHECK constraints)

- **net_revenue_check**: On INSERT/UPDATE to revenue_events, verify `net_revenue = gross_revenue - platform_fee`
- **offer_immutability**: Prevent UPDATE on offers where status = 'signed'
- **contract_immutability**: Prevent UPDATE on contracts where status = 'fully_executed'
- **no_delete_financials**: Prevent DELETE on revenue_events, revenue_distributions, and payouts

---

## 2. State Machine Functions

Security-definer functions to enforce valid transitions:

### `deals.transition_track_state(p_track_id, p_new_state, p_changed_by)`

Validates against an allowed-transitions map:
```text
draft -> submitted
submitted -> under_review
under_review -> denied, offer_pending
denied -> draft
offer_pending -> offer_sent
offer_sent -> counter_received, deal_signed
counter_received -> offer_sent, denied
deal_signed -> active
active -> expired, terminated
```
Inserts into `track_state_history` and updates `tracks.status`.

### `deals.transition_offer_state(p_offer_id, p_new_state, p_changed_by)`

Validates against:
```text
draft -> sent
sent -> viewed, expired
viewed -> countered, accepted, rejected
countered -> revised, rejected
revised -> sent
accepted -> signed
```
Inserts into `offer_state_history` and updates `offers.status`.

### `deals.transition_contract_state(p_contract_id, p_new_state, p_changed_by)`

Validates against:
```text
generated -> sent_for_signature
sent_for_signature -> signed_by_producer
signed_by_producer -> signed_by_platform
signed_by_platform -> fully_executed
fully_executed -> archived
```
Updates `contracts.status`.

---

## 3. Financial Integrity

### Revenue Distribution Function

`deals.create_revenue_distribution(p_revenue_event_id)`:
- Looks up the associated offer's split percentages
- Calculates producer_amount and platform_amount from net_revenue
- Inserts into revenue_distributions
- All values stored explicitly (no derived-on-read calculations)

---

## 4. Row-Level Security

Enable RLS on all tables in the `deals` schema. Policies will use the existing `public.has_role()` function:

| Table | admin | producer (own data) |
|-------|-------|---------------------|
| producers | full access | SELECT/UPDATE own record |
| tracks | full access | SELECT/INSERT/UPDATE own tracks |
| offers | full access | SELECT own track's offers |
| contracts | full access | SELECT own contracts |
| revenue_events | full access | SELECT own track's events |
| revenue_distributions | full access | SELECT own distributions |
| payouts | full access | SELECT own payouts |
| state history tables | full access | SELECT for own records |

Producer isolation: all SELECT policies filter by `producer_id` matching a lookup against the authenticated user's ID.

---

## 5. Access Control Preparation

- `created_by` UUID column on: tracks, offers, contracts, revenue_events
- Future roles (producer, admin, finance_admin, super_admin) will use the existing `user_roles` table with an extended `app_role` enum
- No enum change now -- schema is ready to support it when roles are added

---

## Technical Details

### Files Changed

- **One large SQL migration** via the migration tool covering:
  - Schema creation (`CREATE SCHEMA deals`)
  - All enum types
  - All 9 tables with constraints, indexes, and foreign keys
  - Validation triggers (immutability, financial checks, delete prevention)
  - State machine functions
  - Revenue distribution function
  - RLS policies

### No Code Changes

- No UI components
- No TypeScript files modified
- No edge functions created (these come later when API layer is needed)

### Estimated Migration Size

~400-500 lines of SQL covering all tables, constraints, triggers, functions, and RLS policies.

