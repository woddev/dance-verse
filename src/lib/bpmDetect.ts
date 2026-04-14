import { guess } from "web-audio-beat-detector";

/**
 * Detects BPM from a remote audio URL.
 * Fetches the file, decodes it via Web Audio API, and runs beat detection.
 */
export async function detectBpmFromUrl(audioUrl: string): Promise<number> {
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error("Failed to fetch audio file");

  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const { bpm } = await guess(audioBuffer);
    return Math.round(bpm);
  } finally {
    await audioContext.close();
  }
}
