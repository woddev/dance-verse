

# Make Producer Sidebar More Graphical

## Current State
The producer sidebar is a simple list of text links with small icons — functional but plain.

## Proposed Redesign
Replace the flat link list with visually rich navigation cards featuring larger icons, subtle backgrounds, and action-oriented descriptions.

### Changes

**File: `src/components/layout/ProducerLayout.tsx`**

Each nav item becomes a styled card-like button:
- **Large icon** (h-8 w-8) inside a colored circle background unique to each section (e.g. blue for Overview, purple for Tracks, amber for Offers)
- **Label + subtitle** — e.g. "Tracks" with "View & submit music" beneath
- Active state uses a gradient left border + highlighted background instead of solid fill
- Badge counts rendered as floating pills on the icon circle
- Mobile bottom bar with icon-only navigation for small screens
- Spacing and padding increased for a more modern, breathable feel

### Visual Example
```text
┌─────────────────────┐
│  (🎵)  Overview     │  ← colored icon circle
│        Your journey │  ← subtle description
├─────────────────────┤
│  (🎶)  Tracks       │
│        View & submit│
├─────────────────────┤
│  (📄)  Offers    [2]│  ← badge on icon
│        Deal terms   │
├─────────────────────┤
│  (✍️)  Contracts    │
│        Agreements   │
├─────────────────────┤
│  (💰)  Earnings     │
│        Revenue      │
├─────────────────────┤
│  (⚙️)  Settings     │
│        Account      │
└─────────────────────┘
```

### Single File Change
Only `src/components/layout/ProducerLayout.tsx` needs modification. Each link gets:
- A unique accent color for its icon background
- A description subtitle
- Larger touch targets and visual weight
- Mobile bottom navigation bar with icons only

