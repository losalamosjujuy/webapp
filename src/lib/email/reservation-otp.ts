import { env } from "@/lib/supabase/env";
import { formatCurrency } from "@/lib/utils/format";

type ReservationEmailParams = {
  to: string;
  subject: string;
  html: string;
  logContext: Record<string, unknown>;
};

export async function sendReservationOtpEmail(params: {
  to: string;
  fullName: string;
  code: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  expiresInMinutes: number;
}) {
  const subject = "Tu codigo para continuar la reserva";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#2d221a;line-height:1.5">
      <h2 style="margin-bottom:16px;">Hola ${escapeHtml(params.fullName)},</h2>
      <p>Recibimos tu solicitud para <strong>${escapeHtml(params.unitName)}</strong>.</p>
      <p>Fechas: <strong>${escapeHtml(params.checkIn)}</strong> a <strong>${escapeHtml(params.checkOut)}</strong>.</p>
      <p>Tu codigo para continuar la reserva es:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${escapeHtml(params.code)}</p>
      <p>El codigo vence en ${params.expiresInMinutes} minutos.</p>
      <p>Si no pediste este codigo, podes ignorar este mensaje.</p>
    </div>
  `;

  await sendReservationEmail({
    to: params.to,
    subject,
    html,
    logContext: {
      code: params.code,
      unitName: params.unitName,
      checkIn: params.checkIn,
      checkOut: params.checkOut
    }
  });
}

export async function sendReservationAccessEmail(params: {
  to: string;
  fullName: string;
  reservationCode: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  currency: string;
  checkoutUrl?: string | null;
}) {
  const subject = `Tu reserva ${params.reservationCode} en Los Alamos Tilcara`;
  const lookupUrl = buildReservationLookupUrl();
  const checkoutLink = params.checkoutUrl
    ? `
      <p style="margin-top:20px;">
        <a href="${escapeHtml(params.checkoutUrl)}" style="display:inline-block;background:#8f5625;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
          Continuar pago
        </a>
      </p>
    `
    : "";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#2d221a;line-height:1.5">
      <h2 style="margin-bottom:16px;">Hola ${escapeHtml(params.fullName)},</h2>
      <p>Generamos tu reserva para <strong>${escapeHtml(params.unitName)}</strong>.</p>
      <p>Fechas: <strong>${escapeHtml(params.checkIn)}</strong> a <strong>${escapeHtml(params.checkOut)}</strong>.</p>
      <p>Total estimado: <strong>${escapeHtml(formatCurrency(params.totalAmount, params.currency))}</strong>.</p>
      <p>Guarda este codigo para consultar el estado de tu reserva:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:3px;margin:16px 0;">${escapeHtml(params.reservationCode)}</p>
      <p>La consulta privada se hace con tu email y este codigo en <a href="${escapeHtml(lookupUrl)}">${escapeHtml(lookupUrl)}</a>.</p>
      ${checkoutLink}
    </div>
  `;

  await sendReservationEmail({
    to: params.to,
    subject,
    html,
    logContext: {
      reservationCode: params.reservationCode,
      unitName: params.unitName,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      checkoutUrl: params.checkoutUrl ?? null
    }
  });
}

export async function sendReservationStatusEmail(params: {
  to: string;
  fullName: string;
  reservationCode: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  reservationStatus: string;
  paymentStatus: string;
  checkoutUrl?: string | null;
}) {
  const subject = `Actualizacion de tu reserva ${params.reservationCode}`;
  const statusCopy = getReservationStatusCopy(params.paymentStatus, params.checkoutUrl);
  const lookupUrl = buildReservationLookupUrl();
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#2d221a;line-height:1.5">
      <h2 style="margin-bottom:16px;">Hola ${escapeHtml(params.fullName)},</h2>
      <p>${statusCopy.intro}</p>
      <p>Reserva: <strong>${escapeHtml(params.reservationCode)}</strong>.</p>
      <p>Alojamiento: <strong>${escapeHtml(params.unitName)}</strong>.</p>
      <p>Fechas: <strong>${escapeHtml(params.checkIn)}</strong> a <strong>${escapeHtml(params.checkOut)}</strong>.</p>
      <p>Estado de reserva: <strong>${escapeHtml(params.reservationStatus)}</strong>.</p>
      <p>Estado de pago: <strong>${escapeHtml(params.paymentStatus)}</strong>.</p>
      <p>Podes revisar el detalle en <a href="${escapeHtml(lookupUrl)}">${escapeHtml(lookupUrl)}</a> usando tu email y el codigo de reserva.</p>
      ${statusCopy.cta}
    </div>
  `;

  await sendReservationEmail({
    to: params.to,
    subject,
    html,
    logContext: {
      reservationCode: params.reservationCode,
      reservationStatus: params.reservationStatus,
      paymentStatus: params.paymentStatus,
      checkoutUrl: params.checkoutUrl ?? null
    }
  });
}

async function sendReservationEmail(params: ReservationEmailParams) {
  const recipient = normalizeRecipientEmail(params.to);

  if (!env.RESEND_API_KEY || !env.RESERVATION_OTP_FROM_EMAIL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("La configuracion de email de reservas no esta completa.");
    }

    console.info("[reservation-email]", {
      to: recipient,
      subject: params.subject,
      ...params.logContext
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESERVATION_OTP_FROM_EMAIL,
      to: [recipient],
      reply_to: env.RESERVATION_OTP_REPLY_TO_EMAIL || undefined,
      subject: params.subject,
      html: params.html
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`No se pudo enviar el email de la reserva.${message ? ` ${message}` : ""}`);
  }
}

function buildReservationLookupUrl() {
  return `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/reserva/estado`;
}

function getReservationStatusCopy(paymentStatus: string, checkoutUrl?: string | null) {
  if (paymentStatus === "approved") {
    return {
      intro: "Recibimos tu pago y la reserva quedo confirmada.",
      cta: ""
    };
  }

  if (paymentStatus === "pending" || paymentStatus === "in_process" || paymentStatus === "authorized") {
    return {
      intro: "Tu pago sigue pendiente de confirmacion.",
      cta: checkoutUrl
        ? `<p style="margin-top:20px;">Si necesitas retomarlo, podes usar este enlace: <a href="${escapeHtml(checkoutUrl)}">${escapeHtml(checkoutUrl)}</a>.</p>`
        : ""
    };
  }

  return {
    intro: "El pago de tu reserva no pudo confirmarse.",
    cta: checkoutUrl
      ? `<p style="margin-top:20px;">Si quieres intentarlo nuevamente, podes usar este enlace: <a href="${escapeHtml(checkoutUrl)}">${escapeHtml(checkoutUrl)}</a>.</p>`
      : ""
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRecipientEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!email) {
    throw new Error("No hay un email valido para enviar el codigo.");
  }

  return email;
}
