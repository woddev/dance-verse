

## Campaign Detail Page — Balance & Layout Improvements

After reviewing the current page, here are the issues and proposed fixes:

### Current Issues
1. **Hero section is lopsided** — the cover art (col 1), campaign info (col 2), and official links (col 3) don't feel visually weighted. The middle column has scattered small elements (title, badge, countdown, compensation) while the right column has just a few buttons with lots of empty space below.
2. **Compensation appears twice** — once inline under the hero and again in the instructions section card on the right.
3. **The 3-column hero grid feels sparse** — the middle and right columns don't fill their space well.
4. **Instructions section feels disconnected** from the hero above it.

### Proposed Changes

**1. Consolidate hero to a 2-column layout**
- **Left**: Cover art player (keep as-is, works great)
- **Right**: Stack all info together — title, artist, category badge, countdown timer, description, official links (TikTok/Instagram sound buttons), and the accept/submit CTA. This eliminates the awkward empty third column and groups all actionable content together.

**2. Remove duplicate compensation from hero**
- Keep the compensation display only in the Campaign Instructions section below, where it sits alongside the dancer limit card.

**3. Tighten the Campaign Instructions section**
- Keep the current 2/3 + 1/3 grid but ensure it visually connects better by reducing the gap between the hero and instructions.

**4. Minor spacing adjustments**
- Reduce vertical gap between hero and instructions sections from `space-y-8` to `space-y-6`.
- Add a subtle separator or consistent section spacing throughout.

### Layout Summary

```text
┌─────────────────┬──────────────────────────────┐
│   Cover Art     │  Title + Artist              │
│   (player)      │  Category Badge              │
│                 │  Countdown Timer              │
│                 │  Description                  │
│   Download      │  Official Links (buttons)     │
│   Track         │  Accept / Submit CTA          │
└─────────────────┴──────────────────────────────┘

┌────────────────────────────┬───────────────────┐
│  Campaign Instructions     │  Compensation     │
│  Platforms, Mentions,      │  $20 Per Video    │
│  Hashtags, Rules           │  Limited To X     │
└────────────────────────────┴───────────────────┘

┌────────────────────────────────────────────────┐
│  Creators on this Campaign                     │
└────────────────────────────────────────────────┘
```

### Files to Edit
- `src/pages/CampaignDetail.tsx` — restructure the hero grid from 3-col to 2-col, move official links into the right column alongside campaign info, remove duplicate compensation from hero.

