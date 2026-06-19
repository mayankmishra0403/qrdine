"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "rb-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
      return;
    }

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(ios);

    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    if (!("beforeinstallprompt" in window) && ios) {
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    const d = deferred as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    d.prompt();
    const choice = await d.userChoice;
    if (choice.outcome === "accepted") {
      setShow(false);
      setDeferred(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  if (isStandalone || !show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 p-0">
      <div className="bg-white rounded-t-3xl w-full p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-4 mb-4">
          <img src="/icons/icon-192.png" alt="" className="w-14 h-14 rounded-xl shadow" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold">Install Waiter App</h2>
            <p className="text-xs text-muted-foreground">Faster ordering with instant notifications</p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold shrink-0">1</span>
              <span>Tap Share <span className="text-lg">📤</span> in Safari</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold shrink-0">2</span>
              <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold shrink-0">3</span>
              <span>Tap <strong>Add</strong> on the top right</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-foreground text-background rounded-xl py-3.5 font-semibold text-base active:scale-[0.98] transition-transform"
          >
            Install App
          </button>
        )}

        <div className="flex justify-center mt-3">
          <button onClick={handleDismiss} className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            Continue in browser
          </button>
        </div>
      </div>
    </div>
  );
}
