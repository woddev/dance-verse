

# Make Campaign Cards Feel Exciting

## What's Changing

The campaign cards currently display spots and deadline as tiny muted text that blends in. We'll make the key stats (spots, deadline, pay) pop with bold visual treatments and add urgency/energy to the cards.

## Design Approach

**On both the public Campaigns page (`src/pages/Campaigns.tsx`) and the dancer's Browse Campaigns page (`src/pages/dancer/CampaignBrowse.tsx`):**

1. **Stat pills with bold styling** -- Replace the plain muted-text meta row with styled pill badges:
   - **Pay**: Black background, white text, dollar amount in large bold font
   - **Spots**: Outlined pill with a pulsing green dot (like a "live" indicator) to convey urgency -- e.g. `● 50 spots`
   - **Deadline**: Outlined pill with a flame/zap icon and bold text -- e.g. `⚡ 7d deadline`

2. **Overlay stats on the cover image** -- Move the pay amount to an overlay badge on the bottom-left of the cover image (large, bold, white text on a dark gradient) so it's the first thing people notice.

3. **Subtle hover animation** -- Add a slight upward translate on hover (`group-hover:-translate-y-1`) for a more interactive feel.

## Technical Details

### Files to modify:
- `src/pages/Campaigns.tsx` -- Update the card meta section (lines 112-125) with new stat pill components and add image overlay for pay. Add hover translate.
- `src/pages/dancer/CampaignBrowse.tsx` -- Same stat pill treatment in the card meta section (lines ~133-148) and image overlay.

### Stat pills markup (example):
```tsx
{/* Pay overlay on image */}
<div className="absolute bottom-3 left-3 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-bold">
  {formatPay(campaign.pay_scale)}
</div>

{/* Stats row */}
<div className="flex flex-wrap gap-2">
  <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1 text-xs font-semibold">
    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
    {campaign.max_creators} spots
  </span>
  <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2.5 py-1 text-xs font-semibold">
    <Zap className="h-3 w-3" />
    {campaign.due_days_after_accept}d deadline
  </span>
</div>
```

### Card hover enhancement:
```tsx
<Card className="... transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
```

No new dependencies needed. All changes are purely visual/CSS using existing Tailwind utilities and Lucide icons.
