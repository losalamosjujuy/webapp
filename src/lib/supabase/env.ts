export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MERCADO_PAGO_ACCESS_TOKEN:
    process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN,
  MERCADO_PAGO_PUBLIC_KEY:
    process.env.MERCADO_PAGO_PUBLIC_KEY ?? process.env.MERCADOPAGO_PUBLIC_KEY,
  MERCADO_PAGO_WEBHOOK_SECRET:
    process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? process.env.MERCADOPAGO_WEBHOOK_SECRET,
  MERCADO_PAGO_USE_SANDBOX: process.env.MERCADO_PAGO_USE_SANDBOX,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESERVATION_OTP_FROM_EMAIL: process.env.RESERVATION_OTP_FROM_EMAIL,
  RESERVATION_OTP_REPLY_TO_EMAIL: process.env.RESERVATION_OTP_REPLY_TO_EMAIL,
  RESERVATION_OTP_TEST_RECIPIENT_EMAIL: process.env.RESERVATION_OTP_TEST_RECIPIENT_EMAIL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  GOOGLE_HOTEL_CENTER_PARTNER_KEY: process.env.GOOGLE_HOTEL_CENTER_PARTNER_KEY,
  GOOGLE_HOTEL_CENTER_HOTEL_ID: process.env.GOOGLE_HOTEL_CENTER_HOTEL_ID ?? "los-alamos-tilcara"
};

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabaseServiceRoleEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function hasMercadoPagoEnv() {
  return Boolean(
    process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN
  );
}

export function shouldUseMercadoPagoSandbox() {
  return env.MERCADO_PAGO_USE_SANDBOX === "true";
}

export function requireSupabaseEnv() {
  if (!hasSupabaseEnv() || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase public environment variables are required.");
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
}

export function requireSupabaseServiceRoleEnv() {
  const { url, anonKey } = requireSupabaseEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side access.");
  }

  return {
    url,
    anonKey,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function canUseMockData() {
  return process.env.NODE_ENV !== "production" && !hasSupabaseServiceRoleEnv();
}
