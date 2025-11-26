let sharedAudio: HTMLAudioElement | null = null;

export async function playWordSound(word: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const trimmedWord = word.trim();
  if (!trimmedWord) return false;

  // 检查是否只包含英文字母
  if (!/^[a-zA-Z]+$/.test(trimmedWord)) {
    console.warn("Invalid word for audio playback:", trimmedWord);
    return false;
  }

  const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    trimmedWord
  )}&type=2`;

  if (!sharedAudio) {
    sharedAudio = new Audio();
  }

  sharedAudio.src = audioUrl;
  sharedAudio.currentTime = 0;

  try {
    await sharedAudio.play();
    return true;
  } catch (error) {
    console.warn(`播放单词 "${trimmedWord}" 的发音失败`, error);
    return false;
  }
}
