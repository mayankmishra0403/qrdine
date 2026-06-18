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
      } catch {
        // SW registration failed — non-critical
      }
    };

    register();
  }, []);

  return <link rel="manifest" href="/manifest.json" />;
}
