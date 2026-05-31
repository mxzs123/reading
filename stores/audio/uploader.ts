import { uploadAudio } from "@/lib/storage";
import {
  DEFAULT_UPLOAD_CONCURRENCY,
  MAX_UPLOAD_RETRIES,
  MIN_UPLOAD_CONCURRENCY,
  UPLOAD_CONCURRENCY_BACKOFF_STATUS_CODES,
  UPLOAD_TIMEOUT_MS,
} from "./constants";
import { updateSegment } from "./segments";
import { getUploadErrorInfo, sleep } from "./utils";
import type { AudioStoreGet, AudioStoreSet, SegmentState } from "./types";

interface AudioUploaderOptions {
  get: AudioStoreGet;
  set: AudioStoreSet;
}

function isSegmentReadyForUpload(
  segment: SegmentState | undefined
): segment is SegmentState & { audioBlob: Blob } {
  return Boolean(segment?.status === "ready" && segment.audioBlob && !segment.cloudUrl);
}

export function createAudioUploader({ get, set }: AudioUploaderOptions) {
  let uploadInProgress = false;

  const setSegmentUploadState = (
    segmentId: string,
    patch: Partial<SegmentState>
  ) => {
    set((state) => ({
      segments: updateSegment(state.segments, segmentId, patch),
    }));
  };

  const uploadSegmentWithRetry = async (articleId: string, segmentId: string) => {
    const segment = get().segments.find((s) => s.id === segmentId);
    if (!isSegmentReadyForUpload(segment)) {
      return { ok: true as const };
    }

    let lastStatus: number | undefined;
    let lastMessage = "上传音频失败";

    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
      setSegmentUploadState(segmentId, {
        uploadStatus: "uploading",
        uploadAttempts: attempt,
        uploadError: undefined,
      });

      try {
        const cloudUrl = await uploadAudio(articleId, segmentId, segment.audioBlob, {
          timeoutMs: UPLOAD_TIMEOUT_MS,
          wordTimings: segment.wordTimings,
        });

        set((state) => ({
          segments: updateSegment(state.segments, segmentId, {
            cloudUrl,
            uploadStatus: "success",
            uploadError: undefined,
          }),
        }));

        return { ok: true as const };
      } catch (error) {
        const info = getUploadErrorInfo(error);
        lastStatus = info.status;
        lastMessage = info.message;

        const canRetry = info.retryable && attempt < MAX_UPLOAD_RETRIES;
        if (!canRetry) {
          setSegmentUploadState(segmentId, {
            uploadStatus: "failed",
            uploadError: lastMessage,
          });
          return { ok: false as const, status: lastStatus };
        }

        const base = info.status === 429 ? 1500 : 700;
        const backoff = Math.min(8000, base * 2 ** (attempt - 1));
        const jitter = Math.floor(Math.random() * 300);
        setSegmentUploadState(segmentId, {
          uploadError: `${lastMessage}（第 ${attempt}/${MAX_UPLOAD_RETRIES} 次失败，准备重试）`,
        });
        await sleep(backoff + jitter);
      }
    }

    setSegmentUploadState(segmentId, {
      uploadStatus: "failed",
      uploadError: lastMessage,
    });
    return { ok: false as const, status: lastStatus };
  };

  return {
    uploadAllAudio: async (articleId: string) => {
      if (uploadInProgress) {
        return { total: 0, success: 0, failed: 0 };
      }

      uploadInProgress = true;
      try {
        const { segments } = get();
        const readySegments = segments.filter(isSegmentReadyForUpload);
        if (readySegments.length === 0) {
          return { total: 0, success: 0, failed: 0 };
        }

        set((state) => ({
          segments: state.segments.map((s) =>
            isSegmentReadyForUpload(s)
              ? { ...s, uploadStatus: "pending", uploadError: undefined, uploadAttempts: 0 }
              : s
          ),
        }));

        let concurrency = DEFAULT_UPLOAD_CONCURRENCY;
        let success = 0;
        let failed = 0;

        for (let i = 0; i < readySegments.length; ) {
          const batch = readySegments.slice(i, i + concurrency);
          const results = await Promise.all(batch.map((seg) => uploadSegmentWithRetry(articleId, seg.id)));
          const shouldBackoff = results.some(
            (r) => !r.ok && r.status !== undefined && UPLOAD_CONCURRENCY_BACKOFF_STATUS_CODES.has(r.status)
          );
          if (shouldBackoff && concurrency > MIN_UPLOAD_CONCURRENCY) {
            concurrency = Math.max(MIN_UPLOAD_CONCURRENCY, Math.floor(concurrency / 2));
          }

          results.forEach((r) => {
            if (r.ok) success += 1;
            else failed += 1;
          });

          i += batch.length;
        }

        return { total: readySegments.length, success, failed };
      } finally {
        uploadInProgress = false;
      }
    },

    uploadSegmentAudio: async (articleId: string, segmentId: string) => {
      const segment = get().segments.find((s) => s.id === segmentId);
      if (!isSegmentReadyForUpload(segment)) return;
      if (segment.uploadStatus === "uploading") return;

      setSegmentUploadState(segmentId, {
        uploadStatus: "pending",
        uploadError: undefined,
        uploadAttempts: 0,
      });

      await uploadSegmentWithRetry(articleId, segmentId);
    },
  };
}
