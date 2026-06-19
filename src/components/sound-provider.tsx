"use client";

import { useEffect, useRef } from "react";

const DEFAULT_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/gH+Af4B/gH+Af39/f4B/gH+Af4B/gH+Af4B/f39/gICAf4B/gH+Af39/f4B/gH+Af39/gH+Af39/f3+Af39/f3+AgH+Af39/f3+Af39/gH9/f3+Af39/f4B/f39/gH9/f3+Af4B/gH+Af4B/f3+Af39/f3+Af4B/gH+Af4B/f39/gH+Af39/gH9/f39/gH+Af39/f39/gH9/f39/gH9/f4B/gH+Af39/f39/gH9/f39/f4B/f39/gH9/f39/gH+Af39/f4B/gH+Af39/f4B/gH+Af39/f3+Af39/gH+Af39/gH9/f39/gH+Af39/gH+Af4B/gH+Af4B/gH+Af39/f4B/gH+Af4B/gH+Af39/gH+Af39/f4B/gH+Af4B/gH+Af4B/gH+Af39/gH+Af39/f4B/f39/gH9/f4B/gH+Af39/f4B/f39/gH9/f39/f4B/f39/gH+Af39/f3+Af39/gH+Af4B/gH+Af39/f4B/gH+Af39/f39/gH+Af39/gH9/f3+Af39/gH9/f3+Af39/gH9/f4B/f39/f4B/f39/gH+Af39/f39/f4B/gH+Af39/f39/f39/f39/f3+Af4B/gH+Af39/f4B/gH+Af39/gH+Af39/f4B/gH+Af4B/gH+Af4B/gH+Af39/f39/gH9/f3+Af39/f3+Af4B/gH+Af39/f39/f39/gH+Af39/f39/f39/gH9/f39/gH+Af4B/f39/f39/f39/f39/f4B/f39/gH9/f4B/gH+Af39/f39/f39/f39/f4B/gH+Af39/f39/f39/f39/f39/gH9/f4B/gH+Af39/f39/f4B/f39/f39/gH+Af39/f39/f39/f39/gH9/f4B/f3+Af39/f4B/gH+Af39/f39/f39/f39/gH9/f39/f39/f39/f39/gH+Af39/f39/f39/f39/gH9/f4B/f39/gH9/f39/f39/gH+Af39/gH+Af4B/gH+Af39/f39/f39/gH9/f39/gH9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/gH9/f39/f39/f39/f39/f4B/gH+Af39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//38=";

export function SoundProvider({
  soundUrl,
  enabled,
}: {
  soundUrl?: string | null;
  enabled?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const src = soundUrl || DEFAULT_SOUND;
    const audio = new Audio(src);
    audio.volume = 0.5;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [soundUrl]);

  useEffect(() => {
    if (!enabled && enabled !== undefined) return;
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "notification" || event.data?.type === "new-order") {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [enabled]);

  return null;
}
