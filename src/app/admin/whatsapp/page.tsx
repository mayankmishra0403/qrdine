"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  connectWhatsApp,
  connectWithPairingCode,
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
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [state, setState] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);

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
        setQrcode(null);
        toast.success("WhatsApp connected successfully!");
      }
    }
  }, []);

  useEffect(() => {
    if (qrcode || pairingCode) {
      const interval = setInterval(pollStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [qrcode, pairingCode, pollStatus]);

  useEffect(() => {
    if (config?.isConnected) {
      checkWhatsAppStatus().then((r) => {
        if (r.state) setState(r.state);
      });
    }
  }, [config?.isConnected]);

  async function handleConnect() {
    setConnecting(true);
    const result = await connectWhatsApp();
    if (result.success) {
      if (result.qrcode) {
        setQrcode(result.qrcode);
      } else if (result.connected) {
        setConfig((prev) => prev ? { ...prev, isConnected: true } : null);
        setState("open");
        toast.success("Already connected");
      }
    } else {
      toast.error(result.error || "Connection failed");
    }
    setConnecting(false);
  }

  async function handlePairConnect() {
    setConnecting(true);
    setQrcode(null);
    setPairingCode(null);
    const result = await connectWithPairingCode(phone);
    if (result.success && result.pairingCode) {
      setPairingCode(result.pairingCode);
      toast.success("Pairing code generated! Enter it in WhatsApp.");
    } else {
      toast.error(result.error || "Failed to generate pairing code");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    const result = await disconnectWhatsApp();
    if (result.success) {
      setConfig((prev) => prev ? { ...prev, isConnected: false } : null);
      setQrcode(null);
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
            <CardTitle>Connection Status</CardTitle>
            {config?.isConnected ? (
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
                {state && <Badge variant="outline">{state}</Badge>}
              </div>
            ) : qrcode ? (
              <Badge variant="secondary">Scan QR Code</Badge>
            ) : (
              <Badge variant="secondary">Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!envConfigured && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              WhatsApp not configured. Set{" "}
              <code>EVOLUTION_API_KEY</code> and{" "}
              <code>EVOLUTION_API_URL</code> in your .env file.
            </p>
          )}

          {qrcode && (
            <div className="flex flex-col items-center gap-3 py-4">
              <img
                src={qrcode}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border rounded-lg"
              />
              <p className="text-sm text-muted-foreground text-center">
                Open WhatsApp on your phone → Settings → Linked Devices →
                Link a Device. Scan this QR code.
              </p>
            </div>
          )}

          {pairingCode && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4 text-center">
                <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold mb-1">
                  Pairing Code
                </p>
                <p className="text-3xl font-mono font-bold tracking-widest text-blue-900">
                  {pairingCode}
                </p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Open WhatsApp on your phone → Settings → Linked Devices →
                Link a Device. Enter this code within 1 minute.
              </p>
            </div>
          )}

          {config?.isConnected ? (
            <div className="space-y-2 text-sm">
              {config.instanceName && (
                <p>
                  <span className="text-muted-foreground">Instance:</span>{" "}
                  {config.instanceName}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect & Delete Instance
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {qrcode
                  ? "Scan the QR code with WhatsApp to connect. Waiting..."
                  : pairingCode
                    ? "Enter the pairing code in WhatsApp. Waiting..."
                    : "Connect your WhatsApp to send order notifications to your customers."}
              </p>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Connect via QR Code</p>
                <Button
                  onClick={handleConnect}
                  disabled={connecting || !envConfigured}
                >
                  {connecting ? "Connecting..." : qrcode ? "Refresh QR" : "Show QR Code"}
                </Button>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Connect via Phone Number (Link Code)</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="919305804916"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <Button
                    onClick={handlePairConnect}
                    disabled={connecting || !envConfigured || !phone}
                  >
                    {connecting ? "Generating..." : "Get Code"}
                  </Button>
                </div>
              </div>

              {!qrcode && !pairingCode && (
                <p className="text-xs text-muted-foreground">
                  Uses Evolution API (self-hosted WhatsApp Web gateway).
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <TemplateRow
              title="Order Confirmation"
              desc="Sent when order is placed"
              active={config?.isConnected}
            />
            <TemplateRow
              title="Order Ready"
              desc="Sent when order is marked ready"
              active={config?.isConnected}
            />
            <TemplateRow
              title="Order Cancelled"
              desc="Sent when order is cancelled"
              active={config?.isConnected}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateRow({
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
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{desc}</p>
      </div>
      <Badge variant={active ? "default" : "secondary"}>
        {active ? "Active" : "Pending Setup"}
      </Badge>
    </div>
  );
}
