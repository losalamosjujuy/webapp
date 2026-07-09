import { eachDayOfInterval, format } from "date-fns";

import { datesOverlap } from "@/lib/availability/availability";
import type { AvailabilityBlock, Reservation, Unit } from "@/types/domain";

export function OccupancyCalendar({
  units,
  reservations,
  blocks
}: {
  units: Unit[];
  reservations: Reservation[];
  blocks: AvailabilityBlock[];
}) {
  const days = eachDayOfInterval({
    start: new Date("2026-07-10"),
    end: new Date("2026-07-20")
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sand-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-sand-700">Unidad</th>
              {days.map((day) => (
                <th className="px-3 py-3 text-center font-semibold text-sand-700" key={day.toISOString()}>
                  {format(day, "dd")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr className="border-t border-sand-100" key={unit.id}>
                <td className="px-4 py-4 font-medium text-night">{unit.name}</td>
                {days.map((day) => {
                  const date = format(day, "yyyy-MM-dd");
                  const reservation = reservations.find(
                    (item) =>
                      item.unit.id === unit.id &&
                      datesOverlap(date, format(new Date(day.getTime() + 86400000), "yyyy-MM-dd"), item.checkIn, item.checkOut)
                  );
                  const block = blocks.find(
                    (item) =>
                      item.unitId === unit.id &&
                      datesOverlap(date, format(new Date(day.getTime() + 86400000), "yyyy-MM-dd"), item.startDate, item.endDate)
                  );

                  return (
                    <td className="px-2 py-3" key={`${unit.id}-${date}`}>
                      <div
                        className={`h-8 rounded-xl ${
                          reservation
                            ? "bg-agave/30"
                            : block
                              ? "bg-clay/25"
                              : "bg-sand-50"
                        }`}
                        title={reservation?.reservationCode ?? block?.reason ?? "Libre"}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
