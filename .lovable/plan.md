
## Add Light Gray Dot Pattern to Hero Section Background

**What will change:**
The hero section will get a subtle light gray dot pattern overlaid on the white background, adding visual texture behind the text and image/video cards.

**Implementation details:**
- Import the existing `dot-pattern.png` asset into the Index page
- Add an absolutely positioned overlay `div` inside the hero section that tiles the dot pattern across the full area
- Apply a low opacity (around 20-30%) and use CSS to ensure the pattern appears in light gray
- The pattern will sit behind all hero content using z-index layering

**Technical steps:**
1. In `src/pages/Index.tsx`, import `dotPattern` from `@/assets/dot-pattern.png`
2. Inside the hero `<section>`, add an absolute-positioned div with the dot pattern as a repeating background image, styled with reduced opacity and a light gray tint
3. Ensure z-index keeps it behind the hero text and cards
