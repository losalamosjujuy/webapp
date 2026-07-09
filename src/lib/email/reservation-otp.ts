import { env } from "@/lib/supabase/env";

export async function sendReservationOtpEmail(params: {
  to: string;
  fullName: string;
  code: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  expiresInMinutes: number;
}) {
  const subject = "Tu código para continuar la reserva";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#2d221a;line-height:1.5">
      <h2 style="margin-bottom:16px;">Hola ${escapeHtml(params.fullName)},</h2>
      <p>Recibimos tu solicitud para <strong>${escapeHtml(params.unitName)}</strong>.</p>
      <p>Fechas: <strong>${escapeHtml(params.checkIn)}</strong> a <strong>${escapeHtml(params.checkOut)}</strong>.</p>
      <p>Tu código para continuar la reserva es:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${escapeHtml(params.code)}</p>
      <p>El código vence en ${params.expiresInMinutes} minutos.</p>
      <p>Si no pediste este código, podés ignorar este mensaje.</p>
    </div>
  `;

  if (!env.RESEND_API_KEY || !env.RESERVATION_OTP_FROM_EMAIL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("La configuración de email OTP no está completa.");
    }

    console.info("[reservation-otp]", {
      to: params.to,
      subject,
      code: params.code,
      unitName: params.unitName,
      checkIn: params.checkIn,
      checkOut: params.checkOut
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
      to: [params.to],
      reply_to: env.RESERVATION_OTP_REPLY_TO_EMAIL || undefined,
      subject,
      html
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`No se pudo enviar el código de verificación.${message ? ` ${message}` : ""}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
