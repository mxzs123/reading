import type { Article, WordTiming } from "@/lib/storage";

export function withArticleAudio(
  article: Article,
  segmentId: string,
  url: string,
  wordTimings?: WordTiming[]
): Article {
  const needle = `/${segmentId}.wav`;
  const audioUrls = [...(article.audioUrls ?? [])];
  const index = audioUrls.findIndex((item) => item.includes(needle));

  if (index >= 0) {
    audioUrls[index] = url;
  } else {
    audioUrls.push(url);
  }

  const segmentWordTimings = { ...(article.segmentWordTimings ?? {}) };
  if (wordTimings && wordTimings.length > 0) {
    segmentWordTimings[segmentId] = wordTimings;
  } else {
    delete segmentWordTimings[segmentId];
  }

  return {
    ...article,
    audioUrls,
    segmentWordTimings:
      Object.keys(segmentWordTimings).length > 0
        ? segmentWordTimings
        : undefined,
    updatedAt: Date.now(),
  };
}
