let audioElement: HTMLAudioElement | null = null;
let syncRafId: number | null = null;

export function getAudio(): HTMLAudioElement {
  if (!audioElement && typeof window !== "undefined") {
    audioElement = new Audio();
    audioElement.preload = "auto";
  }
  return audioElement!;
}

export function stopSyncLoop(): void {
  if (syncRafId !== null) {
    cancelAnimationFrame(syncRafId);
    syncRafId = null;
  }
}

export function startSyncLoop(onTick: () => void): void {
  if (syncRafId !== null) return;

  const tick = () => {
    const audio = getAudio();
    if (!audio || audio.paused) {
      syncRafId = null;
      return;
    }

    onTick();
    syncRafId = requestAnimationFrame(tick);
  };

  syncRafId = requestAnimationFrame(tick);
}
