

## Fix Role Assignment Logic for Signup Pages

### Problem
Currently, a database trigger (`handle_new_user`) automatically assigns every new user the `dancer` role. When someone signs up on `/producer/apply`, they end up with both `dancer` and `producer` roles because:
1. The trigger fires and adds `dancer`
2. The producer registration code then adds `producer`

This is what happened with content@worldofdance.com.

### Solution

**1. Update the database trigger to be role-aware**

Modify `handle_new_user()` to check the user's metadata for an `intended_role` field. If set to `producer`, skip the dancer role assignment. If set to `dancer` (or not set), assign `dancer` as before.

```text
handle_new_user() trigger logic:
  - Read NEW.raw_user_meta_data->>'intended_role'
  - If 'producer': create profile with application_status = 'none', do NOT insert dancer role
  - If 'dancer' or NULL: create profile with application_status = 'approved', insert dancer role (existing behavior)
```

**2. Update `/dancer/apply` signup to pass metadata**

Pass `{ data: { intended_role: 'dancer' } }` in the `signUp` options so the trigger knows the user is a dancer. After signup, redirect to dancer settings to complete their application profile.

**3. Update `/producer/apply` signup to pass metadata**

Pass `{ data: { intended_role: 'producer' } }` in the `signUp` options. This prevents the trigger from assigning the dancer role. The existing `register-producer` edge function call already handles adding the producer role and creating the deals.producers record.

**4. Fix content@worldofdance.com**

Remove the incorrectly assigned `dancer` role from this user's `user_roles` record so they only have the `producer` role.

### Technical Details

- **Database migration**: Update `handle_new_user()` function to read `intended_role` from `raw_user_meta_data`
- **Data fix**: Delete the `dancer` role row for user `0f88ae08-2a0f-479a-af38-3c5d1b21ba0b`
- **Frontend changes**: Both Apply pages pass `options: { data: { intended_role: '...' } }` to `supabase.auth.signUp()`
- No changes needed to the producer-data edge function -- it already handles producer role assignment correctly

