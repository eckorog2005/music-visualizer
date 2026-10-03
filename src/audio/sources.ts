export function micStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
}

/**
 * Capture another tab's audio (e.g. the Spotify web player). Chrome requires
 * requesting video too; we drop it immediately and keep only the audio track.
 */
export async function tabStream(): Promise<MediaStream> {
  const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  const audio = display.getAudioTracks();
  display.getVideoTracks().forEach((t) => t.stop());
  if (audio.length === 0) {
    throw new Error('No audio shared — pick a browser tab and tick "Share tab audio".');
  }
  return new MediaStream(audio);
}
