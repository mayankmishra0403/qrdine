"use client";

import { useEffect, useState, useCallback } from "react";

export type SseEvent = {
  type: string;
  [key: string]: unknown;
};

export function useEvents() {
  const [lastEvent, setLastEvent] = useState<SseEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SseEvent;
        setLastEvent(data);
      } catch {}
    };

    es.addEventListener("connected", () => setConnected(true));

    es.onerror = () => {
      setConnected(false);
    };

    return () => es.close();
  }, []);

  const clearLastEvent = useCallback(() => setLastEvent(null), []);

  return { lastEvent, connected, clearLastEvent };
}
