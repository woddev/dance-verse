

# AI Music Generation Page

## Overview
Add a new public-facing page where users can generate original music tracks using ElevenLabs' Music API. The page will let users describe the music they want, set a duration, generate it, preview it, and download the result.

## Prerequisites
- **ELEVENLABS_API_KEY** secret needs to be added — you mentioned you have one, so we'll store it securely in the backend.

## What We'll Build

### 1. Edge Function: `elevenlabs-music`
- Accepts `prompt` (text description) and `duration` (seconds, default 30)
- Calls ElevenLabs Music API (`https://api.elevenlabs.io/v1/music`)
- Returns raw audio binary (MP3)
- Uses `npm:` import specifiers per project conventions

### 2. New Page: `/music-generator`
- Text area for describing the desired music (genre, mood, instruments, tempo)
- Duration slider (10–120 seconds)
- "Generate" button with loading state
- Audio player for playback once generated
- Download button to save the MP3
- Clean, on-brand UI using existing Card, Button, Input components

### 3. Routing
- Add route in `App.tsx` as a public page
- Add a link in the navbar or make it accessible from the homepage

## Technical Details

- Edge function registered in `config.toml` with `verify_jwt = false`
- Client uses `fetch()` with `.blob()` (not `supabase.functions.invoke()`) to handle binary audio
- Audio played via `URL.createObjectURL` on a standard `<audio>` element
- Loading state shows a spinner + "Generating music..." message (generation can take 30+ seconds)

