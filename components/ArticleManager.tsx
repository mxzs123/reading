"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Save,
  Search,
  Trash2,
  Volume2,
  Waypoints,
  X,
} from "lucide-react";
import {
  type Article,
  createArticle,
  deleteArticle,
  getAllArticles,
  saveArticle,
} from "@/lib/storage";
import { useAudioStore } from "@/stores/audioStore";
import { useI18n } from "@/contexts/I18nContext";
import styles from "./ArticleManager.module.css";

interface ArticleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentText: string;
  currentArticleId?: string | null;
  onArticleLoad: (article: Article) => void;
  onArticleSaved: (article: Article) => void;
  onNewArticle: () => void;
  variant?: "drawer" | "sidebar";
  onToggleCollapse?: () => void;
}

export default function ArticleManager({
  isOpen,
  onClose,
  currentText,
  currentArticleId,
  onArticleLoad,
  onArticleSaved,
  onNewArticle,
  variant = "drawer",
  onToggleCollapse,
}: ArticleManagerProps) {
  const { locale, t } = useI18n();
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
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openActionArticleId, setOpenActionArticleId] = useState<string | null>(null);
  const [recentCollapsed, setRecentCollapsed] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(false);

  const segments = useAudioStore((s) => s.segments);
  const uploadAllAudio = useAudioStore((s) => s.uploadAllAudio);
  const uploadSegmentAudio = useAudioStore((s) => s.uploadSegmentAudio);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAllArticles();
      setArticles(list);
    } catch (err) {
      console.error(t("article.loadError"), err);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (isOpen) {
      loadArticles();
    }
  }, [isOpen, loadArticles]);

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
  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return articles;

    return articles.filter((article) => {
      const haystack = `${article.title} ${article.text}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [articles, query]);

  const isSearching = query.trim().length > 0;
  const recentArticles = useMemo(
    () => (isSearching ? [] : filteredArticles.slice(0, 5)),
    [filteredArticles, isSearching]
  );

  const getUploadStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return t("upload.status.pending");
      case "uploading":
        return t("upload.status.uploading");
      case "success":
        return t("upload.status.success");
      case "failed":
        return t("upload.status.failed");
      default:
        return t("upload.status.pending");
    }
  };

  const getPreview = (text: string): string => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length > 60 ? `${cleaned.slice(0, 60)}...` : cleaned;
  };

  const getArticleTitle = (article: Article): string => article.title || getPreview(article.text);

  const getArticleStats = (article: Article) => {
    const trimmed = article.text.trim();
    return {
      words: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
      paragraphs: trimmed ? trimmed.split(/\n{2,}/).filter((item) => item.trim()).length || 1 : 0,
    };
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasSyncHighlight = (article: Article): boolean => {
    const data = article.segmentWordTimings;
    if (!data || typeof data !== "object" || Array.isArray(data)) return false;
    return Object.keys(data).length > 0;
  };

  const handleSave = useCallback(async () => {
    if (!currentText.trim()) return;

    setSaveError(null);
    setUploadMessage(null);
    setIsSaving(true);
    setIsUploadingAudio(false);
    try {
      let savedArticle: Article;

      if (currentArticleId) {
        const updateData: { id: string; text: string; title?: string } = {
          id: currentArticleId,
          text: currentText,
        };
        if (saveTitle.trim()) {
          updateData.title = saveTitle.trim();
        }
        savedArticle = await saveArticle(updateData);
      } else {
        const newArticle = createArticle(currentText, saveTitle.trim() || undefined);
        savedArticle = await saveArticle(newArticle);
      }

      setLastSavedArticleId(savedArticle.id);
      onArticleSaved(savedArticle);

      setShowUploadPanel(true);
      setIsUploadingAudio(true);
      const result = await uploadAllAudio(savedArticle.id);
      if (result.total > 0) {
        setUploadMessage(
          result.failed > 0
            ? t("upload.failedSegments", { count: result.failed })
            : t("upload.synced")
        );
      }
      setIsUploadingAudio(false);

      await loadArticles();
      setShowSaveInput(false);
      setSaveTitle("");
    } catch (err) {
      console.error(t("article.saveError"), err);
      setSaveError(t("article.saveError"));
    } finally {
      setIsSaving(false);
      setIsUploadingAudio(false);
    }
  }, [currentText, currentArticleId, saveTitle, loadArticles, onArticleSaved, t, uploadAllAudio]);

  const handleRetryFailedUploads = useCallback(async () => {
    if (!uploadArticleId) return;
    if (uploadStats.failed === 0) return;

    setUploadMessage(null);
    setIsUploadingAudio(true);
    try {
      const result = await uploadAllAudio(uploadArticleId);
      setUploadMessage(
        result.failed > 0
          ? t("upload.stillFailed", { count: result.failed })
          : t("upload.failedRetrySuccess")
      );
    } catch (err) {
      console.error(t("upload.retryFailed"), err);
      setUploadMessage(t("upload.retryFailed"));
    } finally {
      setIsUploadingAudio(false);
    }
  }, [t, uploadAllAudio, uploadArticleId, uploadStats.failed]);

  const handleRetrySegment = useCallback(
    async (segmentId: string) => {
      if (!uploadArticleId) return;
      setUploadMessage(null);
      setIsUploadingAudio(true);
      try {
        await uploadSegmentAudio(uploadArticleId, segmentId);
      } catch (err) {
        console.error(t("upload.retryFailed"), err);
        setUploadMessage(t("upload.retryFailed"));
      } finally {
        setIsUploadingAudio(false);
      }
    },
    [t, uploadArticleId, uploadSegmentAudio]
  );

  const handleLoad = useCallback(
    (article: Article) => {
      setOpenActionArticleId(null);
      onArticleLoad(article);
      if (variant === "drawer") {
        onClose();
      }
    },
    [onArticleLoad, onClose, variant]
  );

  const handleDelete = useCallback(
    async (id: string, e: MouseEvent) => {
      e.stopPropagation();
      if (!confirm(t("article.deleteConfirm"))) return;

      try {
        setOpenActionArticleId(null);
        await deleteArticle(id);
        await loadArticles();
        if (id === currentArticleId) {
          onNewArticle();
        }
      } catch (err) {
        console.error(t("article.deleteError"), err);
      }
    },
    [currentArticleId, loadArticles, onNewArticle, t]
  );

  const handleStartRename = (article: Article, e: MouseEvent) => {
    e.stopPropagation();
    setOpenActionArticleId(null);
    setRenamingId(article.id);
    setRenameValue(getArticleTitle(article));
  };

  const handleRename = useCallback(
    async (article: Article) => {
      const title = renameValue.trim();
      if (!title) return;

      setSaveError(null);
      setIsSaving(true);
      try {
        const updated = await saveArticle({ id: article.id, text: article.text, title });
        await loadArticles();
        if (article.id === currentArticleId) {
          onArticleSaved(updated);
        }
        setOpenActionArticleId(null);
        setRenamingId(null);
        setRenameValue("");
      } catch (err) {
        console.error(t("article.renameError"), err);
        setSaveError(t("article.renameError"));
      } finally {
        setIsSaving(false);
      }
    },
    [currentArticleId, loadArticles, onArticleSaved, renameValue, t]
  );

  const handleToggleArticleActions = (articleId: string, e: MouseEvent) => {
    e.stopPropagation();
    setOpenActionArticleId((current) => (current === articleId ? null : articleId));
  };

  const canRetry = Boolean(uploadArticleId) && uploadStats.failed > 0 && !isSaving && !isUploadingAudio;
  const isSidebar = variant === "sidebar";

  const renderItem = (article: Article) => {
    const stats = getArticleStats(article);
    const isActive = currentArticleId === article.id;
    const hasAudio = (article.audioUrls?.length ?? 0) > 0;

    return (
      <article
        key={article.id}
        className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
        onClick={() => handleLoad(article)}
      >
        <div className={styles.itemInfo}>
          {renamingId === article.id ? (
            <div className={styles.renameRow} onClick={(e) => e.stopPropagation()}>
              <input
                className={styles.renameInput}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleRename(article);
                  if (event.key === "Escape") {
                    setRenamingId(null);
                    setRenameValue("");
                  }
                }}
                autoFocus
              />
              <button className={styles.compactButton} onClick={() => handleRename(article)}>
                {t("common.confirm")}
              </button>
            </div>
          ) : (
            <div className={styles.itemTitleRow}>
              <div className={styles.itemTitle}>{getArticleTitle(article)}</div>
              <div className={styles.itemStatus}>
                {hasAudio ? (
                  <Volume2 aria-hidden="true" className={styles.statusIcon} aria-label={t("article.hasAudio")} />
                ) : null}
                {hasSyncHighlight(article) ? (
                  <Waypoints aria-hidden="true" className={styles.statusIcon} aria-label={t("article.syncHighlight")} />
                ) : null}
              </div>
            </div>
          )}
          <div className={styles.itemMeta}>
            <span>{formatDate(article.updatedAt)}</span>
            <span>{t("article.wordCount", { count: stats.words })}</span>
            <span>{t("article.paragraphCount", { count: stats.paragraphs })}</span>
          </div>
        </div>

        <div className={styles.itemActions} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className={styles.moreButton}
            aria-label={t("article.actions", { title: getArticleTitle(article) })}
            aria-expanded={openActionArticleId === article.id}
            onClick={(event) => handleToggleArticleActions(article.id, event)}
          >
            <MoreHorizontal aria-hidden="true" />
          </button>
          {openActionArticleId === article.id ? (
            <div className={styles.itemMenu}>
              <button
                type="button"
                className={styles.menuButton}
                onClick={(event) => handleStartRename(article, event)}
              >
                <Edit3 aria-hidden="true" className={styles.buttonIcon} />
                <span>{t("common.rename")}</span>
              </button>
              <button
                type="button"
                className={styles.menuDangerButton}
                onClick={(event) => handleDelete(article.id, event)}
              >
                <Trash2 aria-hidden="true" className={styles.buttonIcon} />
                <span>{t("common.delete")}</span>
              </button>
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <>
      {variant === "drawer" && isOpen ? <div className={styles.backdrop} onClick={onClose} /> : null}
      <aside
        className={`${styles.panel} ${styles[variant]} ${isOpen ? styles.panelOpen : ""}`}
        data-collapsed={isOpen ? "false" : "true"}
        aria-label={t("article.library")}
      >
        {isSidebar && !isOpen ? (
          <button
            className={styles.collapsedButton}
            onClick={onToggleCollapse ?? onClose}
            aria-label={t("article.expand")}
            title={t("article.expand")}
          >
            <BookOpen aria-hidden="true" />
          </button>
        ) : null}

        {isOpen ? (
          <>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <BookOpen aria-hidden="true" className={styles.titleIcon} />
            <span>{t("article.title")}</span>
          </h2>
          <button
            className={`${styles.closeBtn} ${styles.iconButton}`}
            onClick={onToggleCollapse ?? onClose}
            aria-label={isSidebar ? t("article.collapse") : t("article.close")}
            title={isSidebar ? t("article.collapse") : t("article.close")}
          >
            {isSidebar ? <PanelLeftClose aria-hidden="true" /> : <X aria-hidden="true" />}
          </button>
        </div>

        <div className={styles.saveSection}>
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
            <Save aria-hidden="true" className={styles.buttonIcon} />
            <span>{isSaving ? t("common.saving") : t("common.save")}</span>
          </button>
          <button
            type="button"
            className={styles.newButton}
            onClick={() => {
              onNewArticle();
              if (variant === "drawer") {
                onClose();
              }
            }}
          >
            <Plus aria-hidden="true" className={styles.buttonIcon} />
            <span>{t("common.new")}</span>
          </button>

          {showSaveInput ? (
            <div className={styles.saveRow}>
              <input
                type="text"
                className={styles.titleInput}
                placeholder={t("article.titlePlaceholder")}
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
              <div className={styles.saveRowActions}>
                <button className={styles.compactButton} onClick={handleSave} disabled={isSaving}>
                  <Check aria-hidden="true" className={styles.buttonIcon} />
                  <span>{t("common.save")}</span>
                </button>
                <button
                  className={styles.compactGhostButton}
                  onClick={() => {
                    setShowSaveInput(false);
                    setSaveTitle("");
                  }}
                >
                  <X aria-hidden="true" className={styles.buttonIcon} />
                  <span>{t("common.cancel")}</span>
                </button>
              </div>
            </div>
          ) : null}

          {saveError ? <div className={styles.errorBanner}>{saveError}</div> : null}
          {uploadMessage ? <div className={styles.noticeBanner}>{uploadMessage}</div> : null}

          {showUploadPanel && uploadCandidates.length > 0 ? (
            <div className={styles.uploadPanel}>
              <div className={styles.uploadHeaderRow}>
                <h3 className={styles.uploadTitle}>{t("upload.syncStatus")}</h3>
                <span className={styles.uploadSummary}>
                  {uploadStats.done}/{uploadStats.total}
                  {uploadStats.failed > 0 ? t("upload.failedCount", { count: uploadStats.failed }) : ""}
                </span>
              </div>

              <progress
                className={styles.uploadProgress}
                value={Math.min(uploadStats.total, uploadStats.done)}
                max={Math.max(1, uploadStats.total)}
              />

              {uploadStats.failed > 0 ? (
                <button
                  type="button"
                  className={styles.compactButton}
                  onClick={handleRetryFailedUploads}
                  disabled={!canRetry}
                >
                  <Volume2 aria-hidden="true" className={styles.buttonIcon} />
                  <span>{t("upload.retryFailedSegments")}</span>
                </button>
              ) : null}

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
                              <Volume2 aria-hidden="true" className={styles.buttonIcon} />
                              <span>{t("common.retry")}</span>
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

        <div className={styles.searchRow}>
          <Search aria-hidden="true" className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t("article.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className={styles.listSection}>
          {isLoading ? (
            <div className={styles.empty}>{t("common.loading")}</div>
          ) : filteredArticles.length > 0 ? (
            <div className={styles.list}>
              {isSearching ? (
                filteredArticles.map(renderItem)
              ) : (
                <>
                  {recentArticles.length > 0 ? (
                    <div className={styles.group}>
                      <button
                        type="button"
                        className={styles.groupHeader}
                        onClick={() => setRecentCollapsed((prev) => !prev)}
                        aria-expanded={!recentCollapsed}
                      >
                        {recentCollapsed ? (
                          <ChevronRight aria-hidden="true" className={styles.groupChevron} />
                        ) : (
                          <ChevronDown aria-hidden="true" className={styles.groupChevron} />
                        )}
                        <span>{t("article.recent")}</span>
                        <span className={styles.groupCount}>{recentArticles.length}</span>
                      </button>
                      {!recentCollapsed ? recentArticles.map(renderItem) : null}
                    </div>
                  ) : null}

                  <div className={styles.group}>
                    <button
                      type="button"
                      className={styles.groupHeader}
                      onClick={() => setAllCollapsed((prev) => !prev)}
                      aria-expanded={!allCollapsed}
                    >
                      {allCollapsed ? (
                        <ChevronRight aria-hidden="true" className={styles.groupChevron} />
                      ) : (
                        <ChevronDown aria-hidden="true" className={styles.groupChevron} />
                      )}
                      <span>{t("article.all")}</span>
                      <span className={styles.groupCount}>{filteredArticles.length}</span>
                    </button>
                    {!allCollapsed ? filteredArticles.map(renderItem) : null}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className={styles.empty}>
              <BookOpen aria-hidden="true" className={styles.emptyIcon} />
              <span>{query.trim() ? t("article.noMatch") : t("article.empty")}</span>
              {!query.trim() ? (
                <button
                  type="button"
                  className={styles.emptyAction}
                  onClick={() => {
                    onNewArticle();
                    if (variant === "drawer") onClose();
                  }}
                >
                  <Plus aria-hidden="true" className={styles.buttonIcon} />
                  <span>{t("common.new")}</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
