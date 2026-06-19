"use client";

import { useEffect, useRef } from "react";

export function PwaRegister() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        registered.current = true;

        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;

          let reloaded = false;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "activated" && !reloaded) {
              reloaded = true;
              window.location.reload();
            }
          });
        });

        // Request notification permission (will prompt user)
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch {
        // SW registration failed — non-critical
      }
    };

    register();

    // Listen for beforeinstallprompt to track installability
    let deferredPrompt: Event | null = null;
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall as EventListener);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall as EventListener);
    };
  }, []);

  return null;
}
