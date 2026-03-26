

# Backblaze B2 + Cloudflare CDN Integration

## Overview
Set up Backblaze B2 as the primary storage for music files, fronted by Cloudflare's free CDN tier via the Bandwidth Alliance (zero egress fees). Audio files will be uploaded to B2 via a backend function and served through a Cloudflare-proxied custom domain or B2's friendly URL.

## Architecture

```text
Admin uploads track
       │
       ▼
Edge Function (upload-to-b2)
       │
       ▼
Backblaze B2 bucket
       │
       ▼
Cloudflare CDN (free tier, cached)
       │
       ▼
User streams audio via public URL
```

## Prerequisites (User Action Required)

1. **Backblaze B2 account** (free tier: 10GB storage, 1GB/day egress free)
   - Create a bucket (e.g. `danceverse-music`)
   - Generate an Application Key (key ID + key)
   - Note the bucket ID and endpoint URL

2. **Cloudflare account** (free tier)
   - Add a domain or subdomain (e.g. `cdn.danceverse.app`)
   - Create a CNAME record pointing to B2's bucket URL: `f00X.backblazeb2.com`
   - Enable Cloudflare proxy (orange cloud) for caching
   - Set a Cache Rule to cache audio files (mp3/wav) with long TTL

## Part 1 — Store Secrets (4 secrets)

| Secret | Description |
|--------|------------|
| `B2_KEY_ID` | Backblaze application key ID |
| `B2_APP_KEY` | Backblaze application key |
| `B2_BUCKET_ID` | Target bucket ID |
| `B2_CDN_BASE_URL` | Cloudflare-proxied base URL (e.g. `https://cdn.danceverse.app/file/danceverse-music`) |

## Part 2 — Edge Function: `upload-to-b2`

Create `supabase/functions/upload-to-b2/index.ts`:
- Accepts a file via multipart form data (or accepts a Supabase storage path and streams it to B2)
- Authenticates with B2 using `b2_authorize_account` API
- Uploads the file using `b2_upload_file` API
- Returns the Cloudflare CDN URL (`B2_CDN_BASE_URL + / + filename`)
- Admin-only: validates JWT and checks admin role

## Part 3 — Update Upload Flow

Modify the admin music upload (ManageMusic.tsx) and batch import:
- After selecting an audio file, upload to the `upload-to-b2` edge function instead of Supabase storage
- Store the returned CDN URL in `tracks.audio_url`
- Cover images can stay in Supabase storage (small files, low bandwidth)

## Part 4 — Audio Player Compatibility

No changes needed — the audio player uses `<audio src={url}>` which works with any public URL. The Cloudflare CDN URL will stream identically to the current Supabase storage URL.

## What Won't Change
- Existing tracks with Supabase storage URLs will continue to work
- Cover image uploads stay on Supabase storage
- Producer deal-assets uploads stay on Supabase storage
- Database schema unchanged — just different URLs stored in `audio_url`

## Cost Estimate (5,000 tracks × ~8MB avg)
- **Storage**: ~40GB → $0.24/month on B2
- **Egress**: Free through Cloudflare Bandwidth Alliance
- **Total**: ~$0.24/month vs ~$3.60 storage + variable egress on Supabase

