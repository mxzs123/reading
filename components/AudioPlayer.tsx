"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatTime } from "@/lib/paragraphs";
import styles from "./AudioPlayer.module.css";

interface AudioPlayerProps {
  text: string;
  audioBlob?: Blob | null;
  onAudioGenerated?: (blob: Blob) => void;
}

export default function AudioPlayer({
  text,
  audioBlob,
  onAudioGenerated,
}: AudioPlayerProps) {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // 从 Blob 创建音频 URL
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  // 初始化音频元素
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener("error", () => {
      setError("音频加载失败");
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        setError("播放失败");
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.currentTime = percent * duration;
    },
    [duration]
  );

  const generateAudio = useCallback(async () => {
    if (!settings.azureApiKey) {
      setError("请先在设置中填入 Azure API Key");
      return;
    }

    if (!text.trim()) {
      setError("没有可朗读的文本");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          apiKey: settings.azureApiKey,
          region: settings.azureRegion,
          voice: settings.azureVoice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      // 将 base64 音频转换为 Blob
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const mimeType = data.mimeType || "audio/mpeg";
      const blob = new Blob([bytes], { type: mimeType });

      onAudioGenerated?.(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "音频生成失败");
    } finally {
      setIsGenerating(false);
    }
  }, [text, settings.azureApiKey, settings.azureRegion, settings.azureVoice, onAudioGenerated]);

  // 没有 API Key
  if (!settings.azureApiKey) {
    return (
      <div className={styles.noApiKey}>
        请在设置面板中填入 Azure API Key 以使用朗读功能
      </div>
    );
  }

  // 显示错误
  if (error) {
    return (
      <div className={styles.error}>
        {error}
        <button
          onClick={() => setError(null)}
          style={{ marginLeft: "0.5rem", textDecoration: "underline" }}
        >
          重试
        </button>
      </div>
    );
  }

  // 正在生成
  if (isGenerating) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>正在生成音频...</span>
      </div>
    );
  }

  // 没有音频，显示生成按钮
  if (!audioUrl) {
    return (
      <button
        className={styles.generateButton}
        onClick={generateAudio}
        disabled={!text.trim()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        生成朗读音频
      </button>
    );
  }

  // 有音频，显示播放器
  return (
    <div className={styles.container}>
      <button className={styles.playButton} onClick={togglePlay}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <div className={styles.progressWrapper}>
        <div className={styles.progressBar} onClick={handleProgressClick}>
          <div
            className={styles.progressFill}
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className={styles.timeDisplay}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
