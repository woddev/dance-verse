

## Enhance Producer Application Page

### 1. Drag-and-Drop Music File Upload

Replace the current basic file input with a drag-and-drop zone that:
- Shows a large drop area with an icon and instructional text ("Drag & drop your track here, or click to browse")
- Highlights with a border color change when a file is dragged over
- Supports click-to-browse as a fallback
- Displays the uploaded file name with a remove/replace option
- Shows upload progress with a spinner
- Validates file type (WAV/MP3) and size (50MB max) on drop

**File:** `src/pages/producer/Apply.tsx`
- Add `onDragOver`, `onDragLeave`, `onDrop` handlers and a `dragging` state
- Replace the current hidden input + label pattern with a styled drop zone `<div>` that also contains the hidden file input
- Keep the existing `handleDemoUpload` logic, just wire it to both click and drop events

### 2. Internationally Friendly Location Autocomplete

Update `src/components/ui/location-autocomplete.tsx` to be more internationally user-friendly:
- Add `accept-language: *` to the Nominatim API call so results come back in the user's local language as well as English
- Add `countrycodes` parameter support but leave it open (no restriction) for international use
- Display results in a cleaner format -- parse `display_name` to show city/country more prominently
- Add a globe icon inside the input as a visual cue that international locations are supported
- Update the placeholder to "Start typing your city..." to be more universally understandable

**File:** `src/components/ui/location-autocomplete.tsx`
- Request `addressdetails=1` from Nominatim to get structured city/state/country data
- Format suggestions as "City, State/Region, Country" instead of the raw verbose `display_name`
- Keep the full `display_name` stored as the value for data completeness

### Technical Details

**Drag-and-Drop implementation (Apply.tsx):**
```text
+----------------------------------------------+
|                                                |
|     [Music icon]                               |
|     Drag & drop your track here                |
|     or click to browse                         |
|     WAV or MP3, max 50MB                       |
|                                                |
+----------------------------------------------+
```
- States: idle, dragging-over, uploading, uploaded
- On uploaded state: show file name + "Replace" link

**Location Autocomplete improvements:**
- Fetch with `addressdetails=1` to get structured location parts
- Format display as: `{city}, {state}, {country}` for cleaner presentation
- Store full `display_name` as the actual value
- No country restriction so it works globally

