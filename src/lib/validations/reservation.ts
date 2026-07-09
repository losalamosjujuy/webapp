import { z } from "zod";

const reservationDatesFields = {
  checkIn: z.string().min(1),
  checkOut: z.string().min(1)
};

function withValidDateRange<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).refine((data) => data.checkIn < data.checkOut, {
    message: "La fecha de salida debe ser posterior al check-in.",
    path: ["checkOut"]
  });
}

export const availabilitySearchSchema = withValidDateRange({
  ...reservationDatesFields,
  guests: z.coerce.number().int().min(1).max(12),
  unitId: z.string().optional()
});

export const reservationRequestSchema = withValidDateRange({
  ...reservationDatesFields,
  fullName: z.string().min(3),
  phone: z.string().min(8),
  email: z.string().email(),
  city: z.string().optional(),
  country: z.string().optional(),
  adults: z.coerce.number().int().min(1).max(10),
  children: z.coerce.number().int().min(0).max(10).default(0),
  unitId: z.string().optional(),
  specialNotes: z.string().max(600).optional(),
  estimatedArrivalTime: z.string().optional()
});

export const reservationRequestStartSchema = reservationRequestSchema;

export const reservationVerificationSchema = z.object({
  requestId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, "Ingresa el código de 6 dígitos.")
});

export const reservationCheckoutSchema = z.object({
  requestId: z.string().uuid()
});

export const reservationOtpResendSchema = z.object({
  requestId: z.string().uuid()
});

export const inquirySchema = z.object({
  fullName: z.string().min(3),
  phone: z.string().min(8),
  email: z.string().email(),
  message: z.string().min(10).max(1000),
  checkIn: z.string().min(1).optional(),
  checkOut: z.string().min(1).optional(),
  guestsCount: z.coerce.number().int().min(1).max(12).optional(),
  unitId: z.string().uuid().optional()
}).refine((data) => {
  if (!data.checkIn || !data.checkOut) {
    return true;
  }

  return data.checkIn < data.checkOut;
}, {
  message: "La fecha de salida debe ser posterior al check-in.",
  path: ["checkOut"]
});
