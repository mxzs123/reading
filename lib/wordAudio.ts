let sharedAudio: HTMLAudioElement | null = null;

export function playWordSound(
  word: string,
  onStopArticleAudio?: () => void,
  onCloseDictionary?: () => void
) {
  if (typeof window === "undefined") return;
  if (!word.trim()) return;

  if (onStopArticleAudio) onStopArticleAudio();
  if (onCloseDictionary) onCloseDictionary();

  const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    word
  )}&type=2`;

  if (!sharedAudio) {
    sharedAudio = new Audio();
  }

  sharedAudio.src = audioUrl;
  sharedAudio.currentTime = 0;

  sharedAudio
    .play()
    .catch((error) => console.warn("发音播放失败", error));
}
