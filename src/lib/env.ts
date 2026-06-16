const requiredEnvVars = [
  "DATABASE_URL",
  "AUTH_SECRET",
] as const;

const optionalEnvVars = [
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
  "EVOLUTION_INSTANCE_NAME",
] as const;

export function validateEnv() {
  const missing: string[] = [];
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_API_URL);
}
