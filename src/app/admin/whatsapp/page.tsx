"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  connectWhatsApp,
  checkWhatsAppStatus,
  disconnectWhatsApp,
  getWhatsAppConfig,
  isWhatsAppConfigured,
} from "@/lib/actions/whatsapp";

type Config = {
  id: string;
  isConnected: boolean;
  evolutionUrl?: string;
  instanceName?: string;
};

export default function WhatsAppPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [state, setState] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    Promise.all([
      isWhatsAppConfigured(),
      getWhatsAppConfig(),
    ]).then(([configured, cfg]) => {
      setEnvConfigured(configured);
      if (cfg) {
        setConfig(cfg as Config);
      }
      setLoading(false);
    });
  }, []);

  const pollStatus = useCallback(async () => {
    const result = await checkWhatsAppStatus();
    if (result.success) {
      const connected = result.connected;
      if (result.state) setState(result.state);
      if (connected) {
        setConfig((prev) => prev ? { ...prev, isConnected: true } : null);
        setPairingCode(null);
        setCountdown(0);
        toast.success("WhatsApp connected successfully!");
      }
    }
  }, []);

  useEffect(() => {
    if (pairingCode && countdown > 0) {
      const interval = setInterval(pollStatus, 3000);
      const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
      return () => {
        clearInterval(interval);
        clearInterval(tick);
      };
    }
  }, [pairingCode, countdown, pollStatus]);

  useEffect(() => {
    if (config?.isConnected) {
      checkWhatsAppStatus().then((r) => {
        if (r.state) setState(r.state);
      });
    }
  }, [config?.isConnected]);

  async function handleConnect() {
    const raw = phone.replace(/\D/g, "");
    if (!raw || raw.length < 10) {
      toast.error("Enter a valid phone number with country code");
      return;
    }
    setConnecting(true);
    setPairingCode(null);

    const result = await connectWhatsApp(raw);
    if (result.success && result.pairingCode) {
      setPairingCode(result.pairingCode);
      setCountdown(60);
      toast.success("Login code generated!");
    } else {
      toast.error(result.error || "Connection failed");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    const result = await disconnectWhatsApp();
    if (result.success) {
      setConfig((prev) => prev ? { ...prev, isConnected: false } : null);
      setPairingCode(null);
      setCountdown(0);
      setState("");
      toast.success("Disconnected");
    } else {
      toast.error(result.error || "Disconnect failed");
    }
  }

  if (loading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold">WhatsApp Integration</h1><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">WhatsApp Integration</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connection</CardTitle>
            {config?.isConnected ? (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
                {state && <Badge variant="outline">{state}</Badge>}
              </div>
            ) : (
              <Badge variant="secondary">Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!envConfigured && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              WhatsApp not configured. Set <code className="text-xs bg-amber-100 px-1 rounded">EVOLUTION_API_KEY</code> and{" "}
              <code className="text-xs bg-amber-100 px-1 rounded">EVOLUTION_API_URL</code> in your .env file.
            </p>
          )}

          {config?.isConnected ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  WhatsApp is connected and ready to send notifications
                </p>
              </div>
              {config.instanceName && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Instance:</span> {config.instanceName}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-red-600 border-red-300 hover:bg-red-50">
                Disconnect & Delete Instance
              </Button>
            </div>
          ) : pairingCode ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl px-10 py-6 text-center shadow-sm">
                <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold mb-2">
                  Your Login Code
                </p>
                <p className="text-4xl font-mono font-bold tracking-[0.3em] text-blue-900 select-all">
                  {pairingCode}
                </p>
              </div>
              <div className="text-center space-y-2 max-w-sm">
                <p className="text-sm font-medium text-foreground">How to connect:</p>
                <ol className="text-sm text-muted-foreground text-left space-y-1.5 list-decimal list-inside">
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong></li>
                  <li>Enter this code on your phone</li>
                </ol>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Expires in</span>
                <span className={`font-mono font-bold ${countdown <= 10 ? "text-red-600" : "text-foreground"}`}>
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleConnect}>
                Generate New Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your WhatsApp business number to send order notifications, receipts, and updates to customers automatically.
              </p>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number (with country code)</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleConnect}
                    disabled={connecting || !envConfigured || phone.replace(/\D/g, "").length < 10}
                    className="shrink-0"
                  >
                    {connecting ? "Generating Code..." : "Get Login Code"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: 919876543210 (91 is India country code, followed by 10-digit number)
                </p>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Uses Evolution API — a self-hosted WhatsApp Web gateway.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Events</CardTitle>
          <p className="text-sm text-muted-foreground">
            These notifications are sent automatically when WhatsApp is connected
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <NotificationRow
              title="Order Confirmation"
              desc="Receipt sent when customer places an order"
              active={config?.isConnected}
            />
            <NotificationRow
              title="Order Confirmed"
              desc="Sent when restaurant confirms the order"
              active={config?.isConnected}
            />
            <NotificationRow
              title="Order Ready"
              desc="Sent when order is ready for pickup"
              active={config?.isConnected}
            />
            <NotificationRow
              title="Bill/Invoice"
              desc="Sent when payment is completed"
              active={config?.isConnected}
            />
            <NotificationRow
              title="Order Cancelled"
              desc="Sent if order is cancelled"
              active={config?.isConnected}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationRow({
  title,
  desc,
  active,
}: {
  title: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Badge variant={active ? "default" : "secondary"}>
        {active ? "Active" : "Connect WhatsApp"}
      </Badge>
    </div>
  );
}
