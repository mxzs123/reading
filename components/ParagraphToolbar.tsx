"use client";

import styles from "./ParagraphAudioList.module.css";

interface ParagraphToolbarProps {
  onGenerateAll: () => void;
  onStopPlayback: () => void;
  isPlaying: boolean;
  stats: {
    readyCount: number;
    generatingCount: number;
    errorCount: number;
    progressPercent: number;
    total: number;
  };
  disabled?: boolean;
}

export function ParagraphToolbar({
  onGenerateAll,
  onStopPlayback,
  isPlaying,
  stats,
  disabled,
}: ParagraphToolbarProps) {
  const { readyCount, generatingCount, errorCount, progressPercent, total } = stats;

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarActions}>
        <button className="primary-button" onClick={onGenerateAll} disabled={disabled || !total}>
          生成整篇音频
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onStopPlayback}
          disabled={!isPlaying}
        >
          停止播放
        </button>
      </div>
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>
            进度：{readyCount}/{total}
          </span>
          <span className={styles.progressMeta}>
            {generatingCount ? `生成中 ${generatingCount}` : "空闲"}{" "}
            {errorCount ? ` · 失败 ${errorCount}` : ""}
          </span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
