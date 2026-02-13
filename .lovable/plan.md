

## Invite-Only Dancer Access

### Overview
Switch from an open sign-up model to an invite-only system. Admins will invite dancers by email from the Manage Dancers page. Dancers receive an invite email with a link to set their password, then sign in. The public Auth page becomes sign-in only (no sign-up option).

### How It Works

```text
Admin invites dancer (email + name)
        |
Dancer receives invite email with magic link
        |
Dancer sets password --> lands on Application Form --> Pending Review
        |
Admin approves --> Full dashboard access
```

1. Admin goes to Manage Dancers and clicks "Invite Dancer", enters the dancer's email and name.
2. The system creates the user account and sends them an invite email.
3. The dancer clicks the link, sets their password, and is redirected to the application form to fill out their profile details.
4. The existing approval flow continues as-is (pending, approved, rejected).
5. The public Auth page only shows sign-in -- no sign-up toggle.

---

### Technical Details

#### 1. Auth Page Changes (`src/pages/Auth.tsx`)
- Remove the sign-up form entirely (no toggle, no "Create Account" mode)
- Keep only the sign-in form (email + password)
- Update copy to reflect invite-only model ("Sign in to your Dance-Verse account")

#### 2. Admin "Invite Dancer" Feature (`src/pages/admin/ManageDancers.tsx`)
- Add an "Invite Dancer" button at the top of the page
- Opens a dialog with fields for email and full name
- Calls a new `invite-dancer` action on the admin-data edge function

#### 3. Edge Function: `invite-dancer` action (`supabase/functions/admin-data/index.ts`)
- Uses `adminClient.auth.admin.inviteUserByEmail()` to create the user and send the invite
- Passes the dancer's name in `user_metadata` so the `handle_new_user` trigger populates the profile
- The invite email contains a link that brings the dancer to the site where they set their password

#### 4. Navbar Update (`src/components/layout/Navbar.tsx`)
- Change the "Sign In" button label/link if needed (no changes required since it already links to `/auth`)

#### 5. Files Changed
- **Modified**: `src/pages/Auth.tsx` -- remove sign-up, sign-in only
- **Modified**: `src/pages/admin/ManageDancers.tsx` -- add invite dancer dialog
- **Modified**: `supabase/functions/admin-data/index.ts` -- add `invite-dancer` action

