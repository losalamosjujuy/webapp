import { differenceInCalendarDays, format } from "date-fns";

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(date: string | Date, dateFormat = "dd MMM yyyy") {
  return format(new Date(date), dateFormat);
}

export function calculateNights(checkIn: string, checkOut: string) {
  return differenceInCalendarDays(new Date(checkOut), new Date(checkIn));
}
