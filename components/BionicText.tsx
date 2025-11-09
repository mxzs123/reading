"use client";

import { useEffect, useMemo, useRef } from "react";
import { convertToBionicReading } from "@/lib/bionicReading";
import { playWordSound } from "@/lib/wordAudio";
import { useSettings } from "@/contexts/SettingsContext";

interface WordSelection {
  word: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface BionicTextProps {
  text: string;
  onWordSelected?: (selection: WordSelection) => void;
}

export function BionicText({ text, onWordSelected }: BionicTextProps) {
  const { settings } = useSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const html = useMemo(() => {
    return convertToBionicReading(text, {
      boldRatio: settings.boldRatio,
      enableBionic: settings.enableBionic,
    });
  }, [settings.boldRatio, settings.enableBionic, text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleInteraction = (target: HTMLElement) => {
      const word =
        target.dataset.word ?? target.textContent?.trim() ?? "";
      if (!word) return;

      playWordSound(word);
      target.classList.add("active-highlight");
      window.setTimeout(() => {
        target.classList.remove("active-highlight");
      }, 300);

      const rect = target.getBoundingClientRect();
      const selection: WordSelection = {
        word,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      };

      onWordSelected?.(selection);
    };

    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest(
        ".bionic-word"
      ) as HTMLElement | null;
      if (!target) return;
      handleInteraction(target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = (event.target as HTMLElement).closest(
        ".bionic-word"
      ) as HTMLElement | null;
      if (!target) return;
      event.preventDefault();
      handleInteraction(target);
    };

    container.addEventListener("click", handleClick);
    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [onWordSelected]);

  if (!html) {
    return (
      <div className="muted-text" ref={containerRef}>
        输入文本后将在此显示仿生阅读效果。
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bionic-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
