

## Problem

Destination DB enum `acceptance_status` is missing values that exist in source: `submitted`, `approved`, `paid`. Import fails on any row using these values.

## Fix (one SQL command on destination)

Have user run this in destination Supabase SQL Editor to add the missing enum values:

```sql
ALTER TYPE acceptance_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE acceptance_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE acceptance_status ADD VALUE IF NOT EXISTS 'paid';
```

Then retry the `campaign_acceptances.csv` import.

## Also need to check other enums

Since `schema_reference.sql` was likely incomplete for enums in general, we should proactively check all enum types on the source vs what's likely in destination. Common enum fields in this project:
- `acceptance_status`
- `track status` (deals schema)
- `offer status`
- `contract status`
- `payout status`
- `review_status`
- `app_role`

## Plan steps

1. User runs the 3 `ALTER TYPE` statements above on destination.
2. User retries `campaign_acceptances.csv` import.
3. If more enum errors appear on subsequent CSVs, query source enum, generate matching `ALTER TYPE` statements, repeat.

No code changes needed — this is pure DB ops on the destination Supabase project.

