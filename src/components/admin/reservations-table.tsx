import { formatDate } from "@/lib/utils/format";
import type { Reservation } from "@/types/domain";

export function ReservationsTable({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sand-50 text-sand-700">
            <tr>
              {["Código", "Huésped", "Unidad", "Check-in", "Check-out", "Total", "Estado", "Origen"].map((header) => (
                <th className="px-5 py-4 font-semibold" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr className="border-t border-sand-100" key={reservation.id}>
                <td className="px-5 py-4 font-semibold text-night">{reservation.reservationCode}</td>
                <td className="px-5 py-4">
                  <div className="text-night">{reservation.guest.fullName}</div>
                  <div className="text-sand-700">{reservation.guest.phone}</div>
                </td>
                <td className="px-5 py-4 text-night">{reservation.unit.name}</td>
                <td className="px-5 py-4 text-sand-700">{formatDate(reservation.checkIn)}</td>
                <td className="px-5 py-4 text-sand-700">{formatDate(reservation.checkOut)}</td>
                <td className="px-5 py-4 text-night">${reservation.totalAmount}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-clay">
                    {reservation.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-sand-700">{reservation.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
