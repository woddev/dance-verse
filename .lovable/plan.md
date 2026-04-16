

# Export All Database Tables as CSV Files

## What this does
Generate CSV files for all 39 database tables (25 public + 14 deals schema) so you can import them into a new Supabase project. Each CSV will include column headers matching the exact schema, with data rows where applicable.

## Tables to export

**Public schema (25 tables):**
applications, artist_submissions, campaign_acceptances, campaign_categories, campaigns, email_send_log, email_send_state, email_unsubscribe_tokens, hero_settings, inquiries, nav_links, partner_commissions, partner_referrals, partners, payouts, producer_applications, profiles, promotion_packages, staff_permissions, submissions, suppressed_emails, track_submissions, track_uploads, tracks, user_roles

**Deals schema (14 tables):**
contract_audit_log, contract_signatures, contract_state_history, contract_templates, contracts, offer_state_history, offers, payouts, platform_settings, producers, revenue_distributions, revenue_events, track_state_history, tracks

## How it works

1. **Write a Python script** that converts all the queried data into properly formatted CSV files
2. **Output location**: All CSVs saved to `/mnt/documents/db_export/` organized by schema (`public/` and `deals/`)
3. **Schema reference**: Include a `schema_reference.sql` file with CREATE TABLE statements and primary keys for recreating the tables in your new Supabase project
4. **Handle special types**: JSON/JSONB columns serialized as JSON strings, arrays as PostgreSQL array format, NULL values as empty strings

## Deliverables
- ~39 CSV files (one per table), even empty tables get headers-only CSVs
- 1 SQL schema reference file with CREATE TABLE + PRIMARY KEY definitions
- All files downloadable from `/mnt/documents/db_export/`

