import { ZodError } from "zod";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];

    if (firstIssue?.message) {
      return firstIssue.message;
    }

    return fallback;
  }

  if (error instanceof Error && error.message) {
    return isInternalDatabaseError(error.message) ? fallback : error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      asString(candidate.message),
      asString(candidate.details),
      asString(candidate.hint),
      asString(candidate.code)
    ].filter(Boolean);

    if (parts.length) {
      const joined = parts.join(" | ");
      return isInternalDatabaseError(joined) ? fallback : joined;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return isInternalDatabaseError(error) ? fallback : error;
  }

  return fallback;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isInternalDatabaseError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("invalid input syntax for type uuid") ||
    normalized.includes("violates foreign key constraint") ||
    normalized.includes("duplicate key value violates unique constraint") ||
    normalized.includes("22p02")
  );
}
