const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const API_KEY = process.env.EVOLUTION_API_KEY || "";
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "qrdine-instance";

function headers() {
  return {
    "Content-Type": "application/json",
    apikey: API_KEY,
  };
}

async function apiPost<TBody>(
  endpoint: string,
  body: TBody
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.response?.message || json.error || `HTTP ${res.status}` };
    }
    return { success: true, data: json };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

async function apiGet(endpoint: string): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
      headers: headers(),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.response?.message || json.error || `HTTP ${res.status}` };
    }
    return { success: true, data: json };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export async function createInstance(
  instanceName: string = INSTANCE_NAME
): Promise<{
  success: boolean;
  qrCode?: string;
  error?: string;
}> {
  const result = await apiPost("/instance/create", {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const qr = result.data as { qrcode?: { base64?: string } } | undefined;
  return { success: true, qrCode: qr?.qrcode?.base64 };
}

export async function createInstanceWithNumber(
  instanceName: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const result = await apiPost("/instance/create", {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    number: phone,
    qrcode: false,
  });
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true };
}

export async function getQRCode(
  instanceName: string = INSTANCE_NAME
): Promise<{ success: boolean; qrCode?: string; error?: string }> {
  const result = await apiGet(`/instance/connect/${instanceName}`);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const qr = result.data as { base64?: string } | undefined;
  return { success: true, qrCode: qr?.base64 };
}

export async function getPairingCode(
  instanceName: string,
  phone: string
): Promise<{ success: boolean; pairingCode?: string; error?: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await apiGet(`/instance/connect/${instanceName}?number=${phone}`);
    if (!result.success) {
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return { success: false, error: result.error };
    }

    const d = result.data as { pairingCode?: string } | undefined;
    if (d?.pairingCode) {
      return { success: true, pairingCode: d.pairingCode };
    }

    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { success: false, error: "Failed to generate pairing code after 5 attempts" };
}

export async function getConnectionState(
  instanceName: string = INSTANCE_NAME
): Promise<{ success: boolean; state?: string; error?: string }> {
  const result = await apiGet(`/instance/connectionState/${instanceName}`);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const d = result.data as { instance?: { state?: string } } | undefined;
  return { success: true, state: d?.instance?.state };
}

export async function disconnectInstance(
  instanceName: string = INSTANCE_NAME
): Promise<{ success: boolean; error?: string }> {
  const result = await apiPost(`/instance/logout/${instanceName}`, {});
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

export async function deleteInstance(
  instanceName: string = INSTANCE_NAME
): Promise<{ success: boolean; error?: string }> {
  const result = await apiPost(`/instance/delete/${instanceName}`, {});
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

export async function sendText(
  to: string,
  text: string,
  instanceName: string = INSTANCE_NAME
): Promise<{ success: boolean; error?: string }> {
  const normalized = to.replace(/[^0-9]/g, "");
  const result = await apiPost(`/message/sendText/${instanceName}`, {
    number: normalized,
    text,
    delay: 1000,
  });
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

export async function fetchInstances(): Promise<{
  success: boolean;
  data?: Array<{ name: string; connectionStatus: string; number: string }>;
  error?: string;
}> {
  const result = await apiGet("/instance/fetchInstances");
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const raw = result.data as unknown as Array<Record<string, unknown>> | undefined;
  const instances = (raw || []).map((inst) => ({
    name: inst.name as string,
    connectionStatus: inst.connectionStatus as string,
    number: inst.number as string,
  }));
  return { success: true, data: instances };
}

export function formatPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
