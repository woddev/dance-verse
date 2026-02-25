

## Add 10 Filler Dancer Profiles to Campaigns

### What We'll Do

Insert 10 fictional dancer profiles into the database and associate them with both active campaigns ("No One Morns the Wicked" and "Add it Up") so they appear in the "Creators on this Campaign" section.

### Data to Create

**10 Dancer Profiles** with realistic names, social handles, and dance styles:

| Name | Instagram | TikTok | Dance Style | Location |
|------|-----------|--------|-------------|----------|
| Aria Chen | @ariamoves | @ariachen | Contemporary | Los Angeles, USA |
| Jamal Wright | @jamalwrightdance | @jamalwright | Hip Hop | Atlanta, USA |
| Sofia Rivera | @sofiadances | @sofiarivera | Latin | Miami, USA |
| Kenji Tanaka | @kenjimoves | @kenjitanaka | Breaking | Tokyo, Japan |
| Priya Sharma | @priyadanceco | @priyasharma | Bollywood Fusion | London, UK |
| Marcus Johnson | @marcusjdance | @marcusjohnson | Popping | Chicago, USA |
| Luna Park | @lunaparkdance | @lunapark | K-Pop | Seoul, South Korea |
| Diego Morales | @diegodances | @diegomorales | Salsa | Mexico City, Mexico |
| Zara Williams | @zarawmoves | @zarawilliams | Afrobeats | Lagos, Nigeria |
| Kai Nakamura | @kaidances | @kainakamura | Freestyle | Vancouver, Canada |

### Steps

1. **Insert 10 profiles** -- with unique UUIDs, names, social handles, dance style, location, and `application_status = 'approved'`
2. **Insert campaign acceptances** -- link each dancer to both campaigns (20 rows)
3. **Insert submissions** -- create one submission per dancer per campaign with sample TikTok/Instagram URLs and `review_status = 'approved'` so they appear in the `get_campaign_dancers` RPC (20 rows)

### Technical Notes

- The `get_campaign_dancers` function joins `submissions` on `profiles`, so dancers must have at least one submission to appear
- Submissions require an `acceptance_id`, so acceptances must be created first
- All inserts use the service role to bypass RLS
- No schema or code changes needed -- this is purely data insertion

