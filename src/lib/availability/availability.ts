import type { AvailabilityBlock, Reservation, ReservationStatus, Unit } from "@/types/domain";

const BLOCKING_STATUSES: ReservationStatus[] = ["pending_payment", "verified_pending_payment", "confirmed", "completed", "no_show"];

export interface SearchAvailabilityInput {
  checkIn: string;
  checkOut: string;
  guests: number;
  units: Unit[];
  reservations: Reservation[];
  blocks: AvailabilityBlock[];
}

export function datesOverlap(
  requestedCheckIn: string,
  requestedCheckOut: string,
  existingCheckIn: string,
  existingCheckOut: string
) {
  return requestedCheckIn < existingCheckOut && requestedCheckOut > existingCheckIn;
}

export function isUnitAvailable(
  unitId: string,
  checkIn: string,
  checkOut: string,
  reservations: Reservation[],
  blocks: AvailabilityBlock[]
) {
  const hasReservationConflict = reservations.some(
    (reservation) =>
      reservation.unit.id === unitId &&
      BLOCKING_STATUSES.includes(reservation.status) &&
      datesOverlap(checkIn, checkOut, reservation.checkIn, reservation.checkOut)
  );

  const hasBlockConflict = blocks.some(
    (block) =>
      block.unitId === unitId && datesOverlap(checkIn, checkOut, block.startDate, block.endDate)
  );

  return !hasReservationConflict && !hasBlockConflict;
}

export function searchAvailableUnits({
  checkIn,
  checkOut,
  guests,
  units,
  reservations,
  blocks
}: SearchAvailabilityInput) {
  return units.filter(
    (unit) =>
      unit.active &&
      unit.maxGuests >= guests &&
      isUnitAvailable(unit.id, checkIn, checkOut, reservations, blocks)
  );
}
