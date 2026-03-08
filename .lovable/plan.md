

# Homepage Improvements — Inspired by Pearpop

Taking cues from Pearpop's structure (big stats, dual-audience sections, social proof, clear CTAs), here's what we'll add and restructure on the Dance-Verse homepage.

## Current Page Flow
Hero → About (video + text) → Scrolling Logos → Artist Promotion → Footer

## Proposed New Flow
Hero → **Stats Bar** → About (video + text) → Scrolling Logos → **"For Dancers" Section** → **"For Artists & Labels" Section** (existing, refined) → **CTA Banner** → Footer

## Changes

### 1. Stats Bar (new section, after hero)
A bold, dark strip with 3 large animated-feel stats — similar to Pearpop's "50+ Million / 14.4+ Billion / Partners" row.
- **500+** Dancers Worldwide
- **10M+** Total Campaign Reach
- **50+** Campaigns Launched

Simple 3-column grid, white text on black, large numbers with smaller descriptors.

### 2. "For Dancers" Section (new, after scrolling logos)
A dedicated pitch to dancers, mirroring Pearpop's dual-audience approach. Two-column layout:
- Left: copy with headline "Turn your moves into income", bullet points (get paid for campaigns, build your portfolio, join a vetted community), and "APPLY NOW" CTA
- Right: existing dancer image or a styled card layout

### 3. Refine existing "For Artists & Labels" Section
Keep the current section but add a stat or two inline (e.g., "Reach 500+ vetted dancers") to add social proof, matching the Pearpop pattern of mixing stats with pitch copy.

### 4. CTA Banner (new, before footer)
A full-width call-to-action strip — simple and bold:
- "Ready to get started?" with two buttons side by side: "I'M A DANCER" → `/dancer/apply` and "PROMOTE MUSIC" → `/promote`
- Dark background with contrasting button colors

### File Changes
- **`src/pages/Index.tsx`** — All additions and reordering happen here. No new components needed; it's all JSX sections with Tailwind styling.

