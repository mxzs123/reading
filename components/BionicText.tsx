"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type React from "react";
import type { BoldRatio } from "@/lib/bionicReading";
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

type Token =
  | { type: "word"; value: string }
  | { type: "text"; value: string };

interface Paragraph {
  id: string;
  tokens: Token[];
  isBlank: boolean;
}

const WORD_REGEX = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

const BOLD_RATIO_MAP: Record<BoldRatio, number> = {
  low: 0.3,
  medium: 0.45,
  high: 0.6,
};

export function BionicText({ text, onWordSelected }: BionicTextProps) {
  const { settings } = useSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const deferredText = useDeferredValue(text);
  const renderKey = useMemo(() => {
    const trimmed = deferredText.trim();
    if (!trimmed) return "bionic-empty";
    const first = trimmed.charCodeAt(0) || 0;
    const last = trimmed.charCodeAt(trimmed.length - 1) || 0;
    return `bionic-${trimmed.length}-${first}-${last}`;
  }, [deferredText]);

  const paragraphs = useMemo<Paragraph[]>(() => {
    if (!deferredText.trim()) return [];
    return splitIntoParagraphs(deferredText).map((entry, index) => ({
      id: `p-${index}`,
      tokens: tokenize(entry.content),
      isBlank: entry.isBlank,
    }));
  }, [deferredText]);

  const handleInteraction = useCallback(
    (word: string, target: HTMLElement) => {
      if (!word.trim()) return;

      playWordSound(word);

      target.classList.add("active-highlight");
      window.setTimeout(() => {
        target.classList.remove("active-highlight");
      }, 280);

      const rect = target.getBoundingClientRect();
      onWordSelected?.({
        word,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      });
    },
    [onWordSelected]
  );

  const renderWord = useCallback(
    (word: string, key: string) => {
      const { lead, tail } = splitWord(word, settings.boldRatio);

      const onClick = (event: React.MouseEvent<HTMLSpanElement>) => {
        handleInteraction(word, event.currentTarget);
      };

      const onKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleInteraction(word, event.currentTarget);
      };

      return (
        <span
          key={key}
          className="bionic-word"
          data-word={word}
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKeyDown}
        >
          {settings.enableBionic ? (
            <>
              <b>{lead}</b>
              {tail}
            </>
          ) : (
            word
          )}
        </span>
      );
    },
    [handleInteraction, settings.boldRatio, settings.enableBionic]
  );

  useEffect(() => {
    if (!paragraphs.length && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [paragraphs.length]);

  if (!paragraphs.length) {
    return (
      <div className="muted-text" ref={containerRef}>
        输入文本后将在此显示仿生阅读效果。
      </div>
    );
  }

  return (
    <div className="bionic-shell">
      <div
        key={renderKey}
        ref={containerRef}
        className="bionic-content"
      >
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p
            key={paragraph.id}
            className={`bionic-paragraph animate-in${
              paragraph.isBlank ? " is-blank" : ""
            }`}
            aria-hidden={paragraph.isBlank}
            style={{
              animationDelay: `${Math.min(paragraphIndex, 5) * 40}ms`,
            }}
          >
            {paragraph.tokens.map((token, tokenIndex) =>
              token.type === "word"
                ? renderWord(token.value, `${paragraphIndex}-${tokenIndex}`)
                : token.value
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

function splitWord(word: string, ratio: BoldRatio): { lead: string; tail: string } {
  const length = word.length;
  if (length === 0) return { lead: "", tail: "" };

  const ratioValue = BOLD_RATIO_MAP[ratio] ?? BOLD_RATIO_MAP.medium;
  const boldCount = Math.min(
    Math.max(Math.ceil(length * ratioValue), 1),
    length
  );

  return {
    lead: word.slice(0, boldCount),
    tail: word.slice(boldCount),
  };
}

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  if (!content) return tokens;

  let lastIndex = 0;

  content.replace(WORD_REGEX, (match, offset) => {
    if (offset > lastIndex) {
      tokens.push({ type: "text", value: content.slice(lastIndex, offset) });
    }
    tokens.push({ type: "word", value: match });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < content.length) {
    tokens.push({ type: "text", value: content.slice(lastIndex) });
  }

  return tokens;
}

function splitIntoParagraphs(text: string): Array<{ content: string; isBlank: boolean }> {
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");

  const paragraphs: Array<{ content: string; isBlank: boolean }> = [];
  let buffer: string[] = [];
  let blankStreak = 0;

  const flushBuffer = () => {
    if (!buffer.length) return;
    const content = buffer.join("\n");
    paragraphs.push({ content, isBlank: false });
    buffer = [];
  };

  lines.forEach((line) => {
    if (line.trim() === "") {
      flushBuffer();
      blankStreak += 1;
    } else {
      if (blankStreak > 0) {
        for (let i = 0; i < blankStreak; i += 1) {
          paragraphs.push({ content: "", isBlank: true });
        }
        blankStreak = 0;
      }
      buffer.push(line);
    }
  });

  flushBuffer();

  if (blankStreak > 0) {
    for (let i = 0; i < blankStreak; i += 1) {
      paragraphs.push({ content: "", isBlank: true });
    }
  }

  return paragraphs;
}
