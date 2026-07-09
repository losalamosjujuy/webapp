import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import { env, hasMercadoPagoEnv, shouldUseMercadoPagoSandbox } from "@/lib/supabase/env";
import type { PaymentStatus } from "@/types/domain";

interface MercadoPagoPreferencePayload {
  reservationCode: string;
  title: string;
  amount: number;
  currency: string;
  payerName: string;
  payerEmail: string;
}

interface MercadoPagoPreferenceResponse {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  date_approved?: string;
  external_reference?: string;
  transaction_amount: number;
  currency_id: string;
  order?: {
    id?: string;
  };
  metadata?: Record<string, unknown>;
}

function safeCompareHex(left: string, right: string) {
  const normalizedLeft = Buffer.from(left.toLowerCase());
  const normalizedRight = Buffer.from(right.toLowerCase());

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return timingSafeEqual(normalizedLeft, normalizedRight);
}

export function extractMercadoPagoPaymentId(request: Request, body: any) {
  const url = new URL(request.url);

  return (
    body?.data?.id ??
    body?.id ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id")
  );
}

export function verifyMercadoPagoWebhookSignature(request: Request, body: any) {
  if (!env.MERCADO_PAGO_WEBHOOK_SECRET) {
    throw new Error("Mercado Pago webhook secret is not configured.");
  }

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const paymentId = extractMercadoPagoPaymentId(request, body)?.toString();

  if (!signatureHeader || !requestId || !paymentId) {
    return false;
  }

  const signatureParts = Object.fromEntries(
    signatureHeader.split(",").map((entry) => {
      const [key, value] = entry.split("=");
      return [key?.trim(), value?.trim()];
    })
  );
  const ts = signatureParts.ts;
  const v1 = signatureParts.v1;

  if (!ts || !v1) {
    return false;
  }

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", env.MERCADO_PAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  return safeCompareHex(expected, v1);
}

function getBaseUrl() {
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

function isPublicSiteUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getCheckoutUrl(preference: MercadoPagoPreferenceResponse) {
  if (shouldUseMercadoPagoSandbox()) {
    return preference.sandbox_init_point ?? preference.init_point;
  }

  return preference.init_point ?? preference.sandbox_init_point;
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!hasMercadoPagoEnv() || !env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error("Mercado Pago is not configured.");
  }

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Mercado Pago request failed: ${response.status} ${message}`);
  }

  return (await response.json()) as T;
}

export async function createMercadoPagoPreference(payload: MercadoPagoPreferencePayload) {
  const siteUrl = getBaseUrl();
  const hasPublicSiteUrl = isPublicSiteUrl(siteUrl);
  const preferencePayload: Record<string, unknown> = {
    items: [
      {
        title: payload.title,
        quantity: 1,
        currency_id: payload.currency,
        unit_price: Number(payload.amount.toFixed(2))
      }
    ],
    external_reference: payload.reservationCode,
    payer: {
      name: payload.payerName,
      email: payload.payerEmail
    },
    statement_descriptor: "LOSALAMOS",
    metadata: {
      reservation_code: payload.reservationCode
    }
  };

  if (hasPublicSiteUrl) {
    preferencePayload.back_urls = {
      success: `${siteUrl}/reserva/estado?status=approved`,
      failure: `${siteUrl}/reserva/estado?status=failure`,
      pending: `${siteUrl}/reserva/estado?status=pending`
    };
    preferencePayload.auto_return = "approved";
    preferencePayload.notification_url = `${siteUrl}/api/payments/mercadopago/webhook`;
  }

  const preference = await mercadoPagoRequest<MercadoPagoPreferenceResponse>("/checkout/preferences", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": randomUUID()
    },
    body: JSON.stringify(preferencePayload)
  });

  return {
    preferenceId: preference.id,
    checkoutUrl: getCheckoutUrl(preference)
  };
}

export async function fetchMercadoPagoPayment(paymentId: string | number) {
  return mercadoPagoRequest<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`);
}

export function mapMercadoPagoStatus(status: string): PaymentStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "authorized":
      return "authorized";
    case "in_process":
      return "in_process";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "charged_back";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
}
