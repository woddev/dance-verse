

## Inbound Campaign Inquiry Form

Add a "GET STARTED" button below the "Focus on building relationships with creators, not spreadsheets." text on the homepage, linking to a new `/inquire` page with a form that collects information from record labels and music producers interested in running campaigns on Dance-Verse.

### New Page: `/inquire`
A clean, full-page form collecting:
- **Contact Name** (required)
- **Company / Label Name** (required)
- **Email** (required)
- **Phone** (optional)
- **Artist Name** (required) -- the artist they want to promote
- **Song / Project Title** (optional)
- **Estimated Budget** (dropdown: Under $1k, $1k-$5k, $5k-$10k, $10k+)
- **Message / Details** (textarea, optional)

On submit, the data is saved to a new `inquiries` database table.

### Database Migration
Create an `inquiries` table with columns matching the form fields, plus `id`, `created_at`, and `status` (default `'new'`). RLS: anyone can INSERT (public-facing form), only admins can SELECT/UPDATE.

### Homepage Change
Add a button after the "Focus on building relationships..." paragraph in the "Get in Touch" section that links to `/inquire`.

### Routing
Add a `/inquire` route in `App.tsx` (public, no auth required).

---

### Technical Details

**New file:** `src/pages/Inquire.tsx`
- Uses existing Navbar, Footer, form components (Input, Textarea, Select, Button, Label)
- Zod validation for required fields and email format
- Submits to `inquiries` table via Supabase client
- Shows success toast on completion

**Database table `inquiries`:**
```text
id              uuid PK default gen_random_uuid()
contact_name    text NOT NULL
company_name    text NOT NULL
email           text NOT NULL
phone           text
artist_name     text NOT NULL
song_title      text
budget_range    text
message         text
status          text NOT NULL default 'new'
created_at      timestamptz NOT NULL default now()
```

**RLS policies:**
- Anyone can INSERT (public form)
- Admins can SELECT and UPDATE (to review inquiries)

**Modified files:**
- `src/pages/Index.tsx` -- add button linking to `/inquire`
- `src/App.tsx` -- add route for `/inquire`
