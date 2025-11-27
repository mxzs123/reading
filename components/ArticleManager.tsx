"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");

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

  useEffect(() => {
    if (isOpen) {
      loadArticles();
    }
  }, [isOpen, loadArticles]);

  const uploadAllAudio = useAudioStore((s) => s.uploadAllAudio);

  // 保存当前文章
  const handleSave = useCallback(async () => {
    if (!currentText.trim()) return;

    setIsSaving(true);
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

      // 上传音频到云端
      await uploadAllAudio(savedArticle.id);

      await loadArticles();
      onArticleSaved(savedArticle);
      setShowSaveInput(false);
      setSaveTitle("");
    } catch (err) {
      console.error("保存文章失败", err);
    } finally {
      setIsSaving(false);
    }
  }, [currentText, currentArticleId, saveTitle, loadArticles, onArticleSaved, uploadAllAudio]);

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
        </div>

        <div className={styles.listSection}>
          <h3 className={styles.listTitle}>已保存文章</h3>
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
