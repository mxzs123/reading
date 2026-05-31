import type { WordTiming } from "@/lib/storage";
import { UploadAudioError } from "@/lib/storage";
import { SYNC_START_EPSILON_SEC, SYNC_END_EPSILON_SEC } from "./constants";

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function findWordIndexAtTime(wordTimings: WordTiming[], time: number): number | null {
  if (!wordTimings.length) return null;
  if (!Number.isFinite(time)) return null;
  const t = Math.max(0, time);

  let lo = 0;
  let hi = wordTimings.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const start = wordTimings[mid]?.start;
    if (typeof start === "number" && start <= t + SYNC_START_EPSILON_SEC) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (ans < 0) return null;

  const current = wordTimings[ans];
  if (!current) return null;

  const nextStart = ans + 1 < wordTimings.length ? wordTimings[ans + 1]?.start : Number.POSITIVE_INFINITY;
  const end = Number.isFinite(current.end) ? current.end : nextStart;

  if (!Number.isFinite(current.start)) return null;
  if (t < current.start - SYNC_START_EPSILON_SEC) return null;
  if (t <= end + SYNC_END_EPSILON_SEC) return ans;
  return null;
}

export function getUploadErrorInfo(error: unknown): { message: string; status?: number; retryable: boolean } {
  if (error instanceof UploadAudioError) {
    const status = error.status;
    const retryable = status ? [408, 425, 429, 500, 502, 503, 504].includes(status) : true;
    return { message: error.message || "上传音频失败", status, retryable };
  }

  if (error instanceof Error) {
    const message = error.message || "上传音频失败";
    return { message, retryable: true };
  }

  return { message: "上传音频失败", retryable: true };
}
