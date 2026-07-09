import { NextResponse } from "next/server";

import { syncMercadoPagoPayment } from "@/lib/data-access";
import {
  extractMercadoPagoPaymentId,
  fetchMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature
} from "@/lib/payments/mercadopago";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const paymentId = extractMercadoPagoPaymentId(request, body);

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!verifyMercadoPagoWebhookSignature(request, body)) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
  }

  const payment = await fetchMercadoPagoPayment(paymentId);

  await syncMercadoPagoPayment({
    externalReference: payment.external_reference,
    providerPaymentId: String(payment.id),
    providerStatus: payment.status,
    providerMerchantOrderId: payment.order?.id,
    amount: payment.transaction_amount,
    currency: payment.currency_id,
    paidAt: payment.date_approved,
    rawPayload: payment as unknown as Record<string, unknown>
  });

  return NextResponse.json({ ok: true });
}
