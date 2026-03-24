

## Add Fake Leaderboard Entries

The leaderboard RPC (`get_monthly_leaderboard`) queries the `submissions` table for rows with `review_status = 'approved'` in the current month (March 2026). Currently there are no approved submissions this month, so the leaderboard is empty.

### What I'll do

Insert 3 approved submissions dated March 2026 for the existing demo dancer profiles, with varying view counts to create a ranked leaderboard:

| Dancer | Platform | Views | Acceptance ID | Campaign ID |
|---|---|---|---|---|
| Aria Chen | tiktok | 42,500 | `7bd0fb01...` | `fa058849...` |
| Jamal Wright | instagram | 28,300 | `a973dde7...` | `fa058849...` |
| Sofia Rivera | tiktok | 15,800 | `7ab4f0ec...` | `fa058849...` |

Each submission will use an existing `campaign_acceptance` record for the corresponding dancer/campaign pair, set `review_status = 'approved'`, and include a realistic `video_url`.

### Technical details

- 3 `INSERT` statements into `submissions` table using the insert tool
- Uses existing demo profiles (Aria Chen, Jamal Wright, Sofia Rivera) and their existing campaign acceptances for the active campaign
- `submitted_at` set to dates within March 2026
- No code changes needed — the leaderboard page already renders this data via the RPC

