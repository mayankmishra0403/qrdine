"use client";

import { useEffect, useState } from "react";
import { SoundProvider } from "./sound-provider";

export function SoundProviderWrapper() {
  const [settings, setSettings] = useState<{ url?: string; enabled: boolean }>({ enabled: true });

  useEffect(() => {
    fetch("/api/restaurant/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.notificationSoundEnabled !== undefined) {
          setSettings({
            url: d.notificationSoundUrl || undefined,
            enabled: d.notificationSoundEnabled !== false,
          });
        }
      })
      .catch(() => {});
  }, []);

  return <SoundProvider soundUrl={settings.url} enabled={settings.enabled} />;
}
