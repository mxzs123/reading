"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

interface UseWordLongPressOptions {
  enabled: boolean;
  delayMs: number;
}

export function useWordLongPress({
  enabled,
  delayMs,
}: UseWordLongPressOptions) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const handledRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (handledRef.current) {
      window.setTimeout(() => {
        handledRef.current = false;
      }, 0);
    }
    setActiveIndex(null);
  }, []);

  const start = useCallback(
    (
      event: React.PointerEvent<HTMLElement>,
      index: number,
      onTrigger: (target: HTMLElement) => void
    ) => {
      if (!enabled) return;
      if (event.button !== 0) return;

      const target = event.currentTarget;
      clear();
      handledRef.current = false;
      setActiveIndex(index);

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        handledRef.current = true;
        setActiveIndex(null);
        onTrigger(target);
      }, delayMs);
    },
    [clear, delayMs, enabled]
  );

  const consumeHandledClick = useCallback(() => {
    if (!handledRef.current) return false;
    handledRef.current = false;
    return true;
  }, []);

  useEffect(() => clear, [clear]);

  return {
    activeIndex,
    clear,
    consumeHandledClick,
    start,
  };
}
