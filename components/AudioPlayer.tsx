"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const ttsParams = useMemo(() => {
    if (settings.ttsProvider === "elevenlabs") {
      return {
        provider: "elevenlabs" as const,
        apiKey: settings.elevenApiKey,
        voiceId: settings.elevenVoiceId,
        modelId: settings.elevenModelId,
        languageCode: settings.elevenLanguageCode,
        outputFormat: settings.elevenOutputFormat,
        stability: settings.elevenStability,
        similarityBoost: settings.elevenSimilarityBoost,
        style: settings.elevenStyle,
        useSpeakerBoost: settings.elevenUseSpeakerBoost,
        speed: settings.elevenSpeed,
        seed: settings.elevenSeed,
        applyTextNormalization: settings.elevenApplyTextNormalization,
        enableLogging: settings.elevenEnableLogging,
        optimizeStreamingLatency: settings.elevenOptimizeStreamingLatency,
      };
    }

    if (settings.ttsProvider === "gemini") {
      return {
        provider: "gemini" as const,
        apiKey: settings.geminiApiKey,
        model: settings.geminiModel,
        voiceName: settings.geminiVoiceName,
        languageCode: settings.geminiLanguageCode,
        stylePrompt: settings.geminiStylePrompt,
        multiSpeaker: settings.geminiUseMultiSpeaker,
        speaker1Name: settings.geminiSpeaker1Name,
        speaker1VoiceName: settings.geminiSpeaker1VoiceName,
        speaker2Name: settings.geminiSpeaker2Name,
        speaker2VoiceName: settings.geminiSpeaker2VoiceName,
      };
    }

    return {
      provider: "azure" as const,
      apiKey: settings.azureApiKey,
      region: settings.azureRegion,
      voice: settings.azureVoice,
      rate: settings.ttsRate,
      volume: settings.ttsVolume,
      pauseMs: settings.ttsPauseMs,
    };
  }, [
    settings.azureApiKey,
    settings.azureRegion,
    settings.azureVoice,
    settings.elevenApiKey,
    settings.elevenApplyTextNormalization,
    settings.elevenEnableLogging,
    settings.elevenLanguageCode,
    settings.elevenModelId,
    settings.elevenOptimizeStreamingLatency,
    settings.elevenOutputFormat,
    settings.elevenSeed,
    settings.elevenSimilarityBoost,
    settings.elevenSpeed,
    settings.elevenStability,
    settings.elevenStyle,
    settings.elevenUseSpeakerBoost,
    settings.elevenVoiceId,
    settings.geminiApiKey,
    settings.geminiLanguageCode,
    settings.geminiModel,
    settings.geminiSpeaker1Name,
    settings.geminiSpeaker1VoiceName,
    settings.geminiSpeaker2Name,
    settings.geminiSpeaker2VoiceName,
    settings.geminiStylePrompt,
    settings.geminiUseMultiSpeaker,
    settings.geminiVoiceName,
    settings.ttsPauseMs,
    settings.ttsProvider,
    settings.ttsRate,
    settings.ttsVolume,
  ]);
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
    if (!text.trim()) {
      setError("没有可朗读的文本");
      return;
    }

    if (ttsParams.provider === "azure" && !ttsParams.apiKey) {
      setError("请先在设置中填入 Azure API Key");
      return;
    }

    if (ttsParams.provider === "gemini" && !ttsParams.apiKey) {
      setError("请先在设置中填入 Gemini API Key");
      return;
    }

    if (ttsParams.provider === "elevenlabs") {
      if (!ttsParams.apiKey) {
        setError("请先在设置中填入 ElevenLabs API Key");
        return;
      }
      if (!ttsParams.voiceId) {
        setError("请先填写 ElevenLabs Voice ID");
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      let endpoint: string;
      let body: Record<string, unknown>;

      if (ttsParams.provider === "azure") {
        endpoint = "/api/tts";
        body = {
          text: text.trim(),
          apiKey: ttsParams.apiKey,
          region: ttsParams.region,
          voice: ttsParams.voice,
          rate: ttsParams.rate,
          volume: ttsParams.volume,
          pauseMs: ttsParams.pauseMs,
        };
      } else if (ttsParams.provider === "elevenlabs") {
        endpoint = "/api/tts/elevenlabs";
        body = {
          text: text.trim(),
          apiKey: ttsParams.apiKey,
          voiceId: ttsParams.voiceId,
          modelId: ttsParams.modelId,
          languageCode: ttsParams.languageCode,
          outputFormat: ttsParams.outputFormat,
          stability: ttsParams.stability,
          similarityBoost: ttsParams.similarityBoost,
          style: ttsParams.style,
          useSpeakerBoost: ttsParams.useSpeakerBoost,
          speed: ttsParams.speed,
          seed: ttsParams.seed,
          applyTextNormalization: ttsParams.applyTextNormalization,
          enableLogging: ttsParams.enableLogging,
          optimizeStreamingLatency: ttsParams.optimizeStreamingLatency,
        };
      } else {
        endpoint = "/api/tts/gemini";
        body = {
          text: text.trim(),
          apiKey: ttsParams.apiKey,
          model: ttsParams.model,
          voiceName: ttsParams.voiceName,
          languageCode: ttsParams.languageCode,
          stylePrompt: ttsParams.stylePrompt,
          multiSpeaker: ttsParams.multiSpeaker,
          speaker1Name: ttsParams.speaker1Name,
          speaker1VoiceName: ttsParams.speaker1VoiceName,
          speaker2Name: ttsParams.speaker2Name,
          speaker2VoiceName: ttsParams.speaker2VoiceName,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [text, onAudioGenerated, ttsParams]);

  // 没有 API Key
  const missingApiKey =
    (ttsParams.provider === "azure" && !ttsParams.apiKey) ||
    (ttsParams.provider === "elevenlabs" && !ttsParams.apiKey) ||
    (ttsParams.provider === "gemini" && !ttsParams.apiKey);

  if (missingApiKey) {
    const providerLabel =
      ttsParams.provider === "azure"
        ? "Azure API Key"
        : ttsParams.provider === "elevenlabs"
          ? "ElevenLabs API Key"
          : "Gemini API Key";
    return (
      <div className={styles.noApiKey}>
        请在设置面板中填入 {providerLabel} 以使用朗读功能
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
