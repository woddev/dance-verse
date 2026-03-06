

## Plan: Monthly Leaderboard Page

### Overview
Add a new "Leaderboard" page to the dancer section that ranks dancers by monthly performance metrics (approved submissions, total views). Uses a database function to aggregate data securely without exposing other dancers' private info.

### Database Changes

**New security-definer function** — aggregates leaderboard data by month without exposing raw profile data:

```sql
CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard(p_year int, p_month int)
RETURNS TABLE(
  dancer_id uuid,
  full_name text,
  avatar_url text,
  approved_submissions bigint,
  total_views bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    s.dancer_id,
    p.full_name,
    p.avatar_url,
    COUNT(s.id) AS approved_submissions,
    COALESCE(SUM(s.view_count), 0) AS total_views
  FROM submissions s
  JOIN profiles p ON p.id = s.dancer_id
  WHERE s.review_status = 'approved'
    AND EXTRACT(YEAR FROM s.submitted_at) = p_year
    AND EXTRACT(MONTH FROM s.submitted_at) = p_month
  GROUP BY s.dancer_id, p.full_name, p.avatar_url
  ORDER BY total_views DESC, approved_submissions DESC
  LIMIT 50;
$$;
```

### UI Changes

**New file: `src/pages/dancer/Leaderboard.tsx`**
- Month/year selector (defaults to current month)
- Ranked list showing position, avatar, name, approved submissions count, total views
- Top 3 get highlighted treatment (gold/silver/bronze accent)
- Current user's row highlighted if they appear
- Links to public dancer profile on click

**Updated files:**

| File | Change |
|---|---|
| `src/components/layout/DashboardLayout.tsx` | Add "Leaderboard" link with Trophy icon to sidebar nav |
| `src/App.tsx` | Add `/dancer/leaderboard` route |

### Visual Design
- Clean table/list layout consistent with existing dashboard style
- Month picker using Select dropdowns for month and year
- Rank badges: #1 gold, #2 silver, #3 bronze backgrounds
- Current user row gets a subtle highlighted border

