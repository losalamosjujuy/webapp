export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
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
      return parts.join(" | ");
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
