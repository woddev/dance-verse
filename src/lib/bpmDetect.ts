import { guess } from "web-audio-beat-detector";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches audio via the audio-proxy edge function to avoid CORS issues,
 * then decodes and runs beat detection client-side.
 */
export async function detectBpmFromUrl(audioUrl: string): Promise<{ bpm: number; durationSeconds: number; energyLevel: string; dropTimeSeconds: number | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audio-proxy`;
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ url: audioUrl }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Proxy fetch failed: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const durationSeconds = Math.round(audioBuffer.duration);

    // BPM detection
    const { bpm } = await guess(audioBuffer);
    const roundedBpm = Math.round(bpm);

    // Energy level analysis (RMS of the full track)
    const channelData = audioBuffer.getChannelData(0);
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSquares / channelData.length);
    const energyLevel = rms < 0.08 ? "low" : rms < 0.18 ? "medium" : "high";

    // Drop time detection (find the biggest energy spike)
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.5); // 0.5s windows
    let maxEnergy = 0;
    let maxEnergyIndex = 0;
    let prevEnergy = 0;
    let biggestJump = 0;
    let dropIndex = 0;

    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      let windowSum = 0;
      for (let j = i; j < i + windowSize; j++) {
        windowSum += channelData[j] * channelData[j];
      }
      const windowEnergy = windowSum / windowSize;
      const jump = windowEnergy - prevEnergy;
      if (jump > biggestJump && i > sampleRate * 5) { // skip first 5 seconds
        biggestJump = jump;
        dropIndex = i;
      }
      if (windowEnergy > maxEnergy) {
        maxEnergy = windowEnergy;
        maxEnergyIndex = i;
      }
      prevEnergy = windowEnergy;
    }

    const dropTimeSeconds = biggestJump > 0 ? Math.round(dropIndex / sampleRate) : null;

    return { bpm: roundedBpm, durationSeconds, energyLevel, dropTimeSeconds };
  } finally {
    await audioContext.close();
  }
}
