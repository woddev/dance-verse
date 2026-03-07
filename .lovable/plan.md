

## Google Drive Integration for Contracts & Music Files

### Approach: Service Account Sync via Edge Function

Since you want centralized company storage (not per-user Drive access), a **Google Service Account** is the right fit. It will sync files to a shared Google Drive folder automatically whenever contracts are generated/signed or tracks are submitted.

### Prerequisites (your side)

1. **Google Cloud Console** — create a project (or use an existing one)
2. Enable the **Google Drive API**
3. Create a **Service Account** and download the JSON key file
4. Create a shared Google Drive folder and share it with the service account's email address (e.g., `danceverse@project.iam.gserviceaccount.com`) with Editor access
5. Note the **folder ID** from the Drive URL

### What gets built

**1. New edge function: `sync-to-drive`**
- Accepts file bytes (or a storage path) + metadata (producer name, track title, file type)
- Authenticates with Google Drive API using the service account JWT
- Creates organized folder structure automatically:
  ```
  DanceVerse/
  ├── Producers/
  │   └── {Producer Name}/
  │       ├── Contracts/
  │       │   └── {Track Title} - Contract.pdf
  │       └── Tracks/
  │           ├── {Track Title}.mp3
  │           └── {Track Title} - Artwork.jpg
  ```
- Returns the Google Drive file ID and link

**2. Hook into existing flows**
- **`contract-engine`** — after PDF generation/signature, call `sync-to-drive` to mirror the contract PDF
- **`SubmitTrack.tsx`** — after track upload succeeds, trigger a sync for the audio file and artwork

**3. New database column**
- Add `google_drive_url TEXT` to `deals.contracts` and `deals.tracks` tables to store the Drive link for reference

**4. Secrets needed**
- `GOOGLE_SERVICE_ACCOUNT_KEY` — the full JSON key from Google Cloud
- `GOOGLE_DRIVE_FOLDER_ID` — the root folder ID to organize files under

**5. Admin visibility**
- Show Google Drive link on contract detail panel and track detail panel when available

### Files to create/edit
- `supabase/functions/sync-to-drive/index.ts` — new edge function
- `supabase/functions/contract-engine/index.ts` — add sync call after PDF upload
- `src/pages/producer/SubmitTrack.tsx` — add sync call after file upload
- `src/components/deals/admin/ContractDetailPanel.tsx` — show Drive link
- `src/components/deals/admin/TrackReviewPanel.tsx` — show Drive link
- Database migration for `google_drive_url` columns

