"use client";

import { useEffect, useRef } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0)));
}

async function subscribeToPush(reg: ServiceWorkerRegistration) {
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return;

    const res = await fetch("/api/push/key");
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });

    const subJSON = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys?.p256dh,
        auth: subJSON.keys?.auth,
      }),
    });
  } catch {
    // Push subscription failed — non-critical
  }
}

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

        if ("Notification" in window && Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            await subscribeToPush(reg);
          }
        } else if (Notification.permission === "granted") {
          await subscribeToPush(reg);
        }
      } catch {
        // SW registration failed — non-critical
      }
    };

    register();

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
