"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Article,
  createArticle,
  deleteArticle,
  getAllArticles,
  saveArticle,
} from "@/lib/storage";
import { useAudioStore } from "@/stores/audioStore";
import styles from "./ArticleManager.module.css";

interface ArticleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentText: string;
  currentArticleId?: string | null;
  onArticleLoad: (article: Article) => void;
  onArticleSaved: (article: Article) => void;
}

export default function ArticleManager({
  isOpen,
  onClose,
  currentText,
  currentArticleId,
  onArticleLoad,
  onArticleSaved,
}: ArticleManagerProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [lastSavedArticleId, setLastSavedArticleId] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // 加载文章列表
  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAllArticles();
      setArticles(list);
    } catch (err) {
      console.error("加载文章列表失败", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 首次加载组件时也拉取一遍，避免跨设备新增遗漏
  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (isOpen) {
      loadArticles();
    }
  }, [isOpen, loadArticles]);

  const segments = useAudioStore((s) => s.segments);
  const uploadAllAudio = useAudioStore((s) => s.uploadAllAudio);
  const uploadSegmentAudio = useAudioStore((s) => s.uploadSegmentAudio);

  const uploadCandidates = useMemo(
    () => segments.filter((s) => s.status === "ready" && s.audioBlob),
    [segments]
  );

  const uploadStats = useMemo(() => {
    const total = uploadCandidates.length;
    let pending = 0;
    let uploading = 0;
    let success = 0;
    let failed = 0;

    uploadCandidates.forEach((seg) => {
      const effectiveStatus = seg.cloudUrl ? "success" : seg.uploadStatus;
      if (effectiveStatus === "success") success += 1;
      else if (effectiveStatus === "uploading") uploading += 1;
      else if (effectiveStatus === "failed") failed += 1;
      else pending += 1;
    });

    return {
      total,
      pending,
      uploading,
      success,
      failed,
      done: success + failed,
    };
  }, [uploadCandidates]);

  const uploadArticleId = currentArticleId || lastSavedArticleId;

  const getUploadStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "等待中";
      case "uploading":
        return "上传中";
      case "success":
        return "成功";
      case "failed":
        return "失败";
      default:
        return "等待中";
    }
  };

  // 保存当前文章
  const handleSave = useCallback(async () => {
    if (!currentText.trim()) return;

    setSaveError(null);
    setUploadMessage(null);
    setIsSaving(true);
    setIsUploadingAudio(false);
    try {
      let savedArticle: Article;

      if (currentArticleId) {
        // 更新现有文章
        const updateData: { id: string; text: string; title?: string } = {
          id: currentArticleId,
          text: currentText,
        };
        if (saveTitle) {
          updateData.title = saveTitle;
        }
        savedArticle = await saveArticle(updateData);
      } else {
        // 创建新文章
        const newArticle = createArticle(currentText, saveTitle || undefined);
        savedArticle = await saveArticle(newArticle);
      }

      setLastSavedArticleId(savedArticle.id);
      onArticleSaved(savedArticle);

      // 上传音频到云端
      setShowUploadPanel(true);
      setIsUploadingAudio(true);
      const result = await uploadAllAudio(savedArticle.id);
      if (result.total > 0) {
        if (result.failed > 0) {
          setUploadMessage(`有 ${result.failed} 段音频上传失败，可在下方重试。`);
        } else {
          setUploadMessage("音频已全部上传。");
        }
      }
      setIsUploadingAudio(false);

      await loadArticles();
      setShowSaveInput(false);
      setSaveTitle("");
    } catch (err) {
      console.error("保存文章失败", err);
      setSaveError("保存失败，请稍后再试");
    } finally {
      setIsSaving(false);
      setIsUploadingAudio(false);
    }
  }, [currentText, currentArticleId, saveTitle, loadArticles, onArticleSaved, uploadAllAudio]);

  const handleRetryFailedUploads = useCallback(async () => {
    if (!uploadArticleId) return;
    if (uploadStats.failed === 0) return;

    setUploadMessage(null);
    setIsUploadingAudio(true);
    try {
      const result = await uploadAllAudio(uploadArticleId);
      if (result.failed > 0) {
        setUploadMessage(`仍有 ${result.failed} 段音频上传失败，可继续重试。`);
      } else {
        setUploadMessage("失败段落已全部重试成功。");
      }
    } catch (err) {
      console.error("重试上传失败段落失败", err);
      setUploadMessage("重试失败，请稍后再试");
    } finally {
      setIsUploadingAudio(false);
    }
  }, [uploadAllAudio, uploadArticleId, uploadStats.failed]);

  const handleRetrySegment = useCallback(
    async (segmentId: string) => {
      if (!uploadArticleId) return;
      setUploadMessage(null);
      setIsUploadingAudio(true);
      try {
        await uploadSegmentAudio(uploadArticleId, segmentId);
      } catch (err) {
        console.error("重试上传段落失败", err);
        setUploadMessage("重试失败，请稍后再试");
      } finally {
        setIsUploadingAudio(false);
      }
    },
    [uploadArticleId, uploadSegmentAudio]
  );

  // 加载文章
  const handleLoad = useCallback(
    (article: Article) => {
      onArticleLoad(article);
      onClose();
    },
    [onArticleLoad, onClose]
  );

  // 删除文章
  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("确定要删除这篇文章吗？")) return;

      try {
        await deleteArticle(id);
        await loadArticles();
      } catch (err) {
        console.error("删除文章失败", err);
      }
    },
    [loadArticles]
  );

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreview = (text: string): string => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length > 50 ? cleaned.slice(0, 50) + "..." : cleaned;
  };

  const canRetry = Boolean(uploadArticleId) && uploadStats.failed > 0 && !isSaving && !isUploadingAudio;

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.panel} surface-card ${isOpen ? styles.panelOpen : ""}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>我的文章</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            关闭
          </button>
        </div>

        <div className={styles.saveSection}>
          {!showSaveInput ? (
            <button
              className={styles.saveButton}
              onClick={() => {
                if (currentArticleId) {
                  handleSave();
                } else {
                  setShowSaveInput(true);
                }
              }}
              disabled={!currentText.trim() || isSaving}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {currentArticleId ? "更新当前文章" : "保存当前文章"}
            </button>
          ) : (
            <div className={styles.saveRow}>
              <input
                type="text"
                className={styles.titleInput}
                placeholder="输入文章标题（可选）"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setShowSaveInput(false);
                    setSaveTitle("");
                  }
                }}
                autoFocus
              />
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={isSaving}
              >
                保存
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowSaveInput(false);
                  setSaveTitle("");
                }}
              >
                取消
              </button>
            </div>
          )}

          {saveError ? <div className={styles.errorBanner}>{saveError}</div> : null}
          {uploadMessage ? <div className={styles.noticeBanner}>{uploadMessage}</div> : null}

          {showUploadPanel && uploadCandidates.length > 0 ? (
            <div className={styles.uploadPanel}>
              <div className={styles.uploadHeaderRow}>
                <h3 className={styles.uploadTitle}>音频上传</h3>
                <span className={styles.uploadSummary}>
                  {uploadStats.done}/{uploadStats.total}
                  {uploadStats.failed > 0 ? ` · 失败 ${uploadStats.failed}` : ""}
                </span>
              </div>

              <progress
                className={styles.uploadProgress}
                value={Math.min(uploadStats.total, uploadStats.done)}
                max={Math.max(1, uploadStats.total)}
              />

              <div className={styles.uploadActions}>
                <button
                  type="button"
                  className={styles.retryAllButton}
                  onClick={handleRetryFailedUploads}
                  disabled={!canRetry}
                >
                  重试失败段落
                </button>
              </div>

              <div className={styles.uploadList}>
                {uploadCandidates.map((seg) => {
                  const effectiveStatus = seg.cloudUrl ? "success" : seg.uploadStatus || "pending";
                  const statusLabel = getUploadStatusLabel(effectiveStatus);
                  const attemptText = seg.uploadAttempts ? ` (${seg.uploadAttempts}/3)` : "";

                  return (
                    <div key={seg.id} className={styles.uploadItem}>
                      <div className={styles.uploadItemRow}>
                        <span className={styles.segmentId}>{seg.id}</span>
                        <div className={styles.uploadRight}>
                          <span
                            className={`${styles.statusBadge} ${
                              effectiveStatus === "success"
                                ? styles.statusSuccess
                                : effectiveStatus === "failed"
                                  ? styles.statusFailed
                                  : effectiveStatus === "uploading"
                                    ? styles.statusUploading
                                    : styles.statusPending
                            }`}
                          >
                            {statusLabel}
                            {effectiveStatus === "uploading" ? attemptText : ""}
                          </span>

                          {effectiveStatus === "failed" && uploadArticleId ? (
                            <button
                              type="button"
                              className={styles.retryButton}
                              disabled={isSaving || isUploadingAudio}
                              onClick={() => handleRetrySegment(seg.id)}
                            >
                              重试
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {effectiveStatus === "failed" && seg.uploadError ? (
                        <div className={styles.uploadError}>{seg.uploadError}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <h3 className={styles.listTitle}>已保存文章</h3>
          <button
            className={styles.refreshButton}
            onClick={loadArticles}
            disabled={isLoading}
            title="刷新文章列表"
          >
            {isLoading ? "刷新中…" : "刷新"}
          </button>
        </div>
          {isLoading ? (
            <div className={styles.empty}>加载中...</div>
          ) : articles.length > 0 ? (
            <div className={styles.list}>
              {articles.map((article) => (
                <div
                  key={article.id}
                  className={`${styles.item} ${
                    currentArticleId === article.id ? styles.itemActive : ""
                  }`}
                  onClick={() => handleLoad(article)}
                >
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>
                      {article.title || getPreview(article.text)}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>{formatDate(article.updatedAt)}</span>
                      {article.audioUrls && article.audioUrls.length > 0 && (
                        <span className={styles.hasAudio}>有音频</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      className={`${styles.iconButton} ${styles.deleteButton}`}
                      onClick={(e) => handleDelete(article.id, e)}
                      title="删除"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>暂无保存的文章</div>
          )}
        </div>
      </aside>
    </>
  );
}
