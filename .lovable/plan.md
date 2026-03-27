

# Redirect Logged-In Users from Producer Apply Page

## Problem
When a user is already signed in (as a producer or any role), visiting `/producer/apply` still shows the signup form instead of redirecting them appropriately.

## Solution
Add an auth check at the top of the `ProducerApply` component. If the user is already authenticated, redirect them based on their role (producers go to `/producer/dashboard`, others go to their respective dashboards).

## Changes

**File: `src/pages/producer/Apply.tsx`**
- Import `useAuth` hook
- Add early redirect logic: if `loading` → show spinner; if `user` exists → redirect via `useEffect`
- Producers → `/producer/dashboard`
- Other authenticated users → show a message or redirect to home

This is a small, single-file change.

