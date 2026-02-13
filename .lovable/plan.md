

## Make the Compensation Section More Exciting

The current Compensation section is a plain list of "X VIEWS -- $Y" rows with thin borders. Here's how we'll transform it into an eye-catching, visually rich section that gets dancers excited about earning potential.

### Design

Replace the flat list with a horizontal grid of individual pay tier cards, styled to create visual impact:

- **Grid layout**: Display each pay tier as its own card in a responsive grid (2 columns on mobile, up to 4 on desktop)
- **Each tier card** features:
  - A large, bold dollar amount at the top (e.g., "$10") in high contrast
  - The view count below in smaller text (e.g., "1,000 views")
  - A black background with white text to match the monochrome brand
  - Rounded corners and subtle hover scale effect for interactivity
- **Section header**: Add a motivational subtitle like "The more views, the more you earn" under the "Compensation" title
- **Visual hierarchy**: The dollar amounts scale up in size or weight as the tiers get higher, making the top tier feel like a big reward
- **DollarSign icon** added next to the section title for extra flair

This mirrors the pay scale card design already used on the How It Works page, keeping the brand consistent.

### Technical Details

**Files modified:**

1. `src/pages/CampaignDetail.tsx` (public view) -- Replace the Compensation card's inner content with the new grid layout
2. `src/pages/dancer/CampaignDetail.tsx` (dancer view) -- Same grid layout update in the Compensation card

**Changes per file:**
- Replace the `space-y-4` list of `flex justify-between` rows with a `grid grid-cols-2 md:grid-cols-4 gap-4` layout
- Each tier becomes a `div` with `text-center p-6 bg-black text-white rounded-xl` styling
- Dollar amount: `text-3xl font-bold`
- View count: `text-sm opacity-80 mt-1`
- Add hover effect: `hover:scale-105 transition-transform`
- Add subtitle text below the "Compensation" heading
- Add DollarSign icon next to the heading
- Keep the "Compensation details coming soon" fallback for empty tiers

No database or backend changes needed.
