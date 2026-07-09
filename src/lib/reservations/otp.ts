import { createHash, randomInt, timingSafeEqual } from "crypto";

export const OTP_CODE_LENGTH = 6;
export const OTP_EXPIRATION_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const RESERVATION_HOLD_MINUTES = 10;

export function generateOtpCode() {
  return randomInt(0, 10 ** OTP_CODE_LENGTH).toString().padStart(OTP_CODE_LENGTH, "0");
}

export function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string) {
  const provided = Buffer.from(hashOtpCode(code), "hex");
  const expected = Buffer.from(hash, "hex");

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1_000);
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return email;
  }

  const safeLocal =
    local.length <= 2
      ? `${local[0] ?? "*"}*`
      : `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}`;

  return `${safeLocal}@${domain}`;
}
