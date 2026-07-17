"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type DateRangeValue = {
  checkIn: string;
  checkOut: string;
};

function toDateOnly(value?: string) {
  return value ? parseISO(value) : null;
}

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatLabel(value: string, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return format(parseISO(value), "dd MMM yyyy");
}

function buildMonthDays(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 })
  });
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  className,
  monthsToShow = 2,
  minDate
}: {
  checkIn: string;
  checkOut: string;
  onChange: (next: DateRangeValue) => void;
  className?: string;
  monthsToShow?: 1 | 2;
  minDate?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => startOfDay(minDate ? parseISO(minDate) : new Date()), [minDate]);
  const startDate = toDateOnly(checkIn);
  const endDate = toDateOnly(checkOut);
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState<Date>(startDate && !isBefore(startDate, today) ? startOfMonth(startDate) : startOfMonth(today));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (startDate && !isBefore(startDate, today)) {
      setMonthCursor(startOfMonth(startDate));
      return;
    }

    setMonthCursor(startOfMonth(today));
  }, [checkIn, today]); // keep all calendars coordinated around the active start date

  function handleDayClick(day: Date) {
    if (isBefore(day, today)) {
      return;
    }

    if (!startDate || endDate) {
      onChange({
        checkIn: toIsoDate(day),
        checkOut: ""
      });
      return;
    }

    if (!isAfter(day, startDate)) {
      onChange({
        checkIn: toIsoDate(day),
        checkOut: ""
      });
      return;
    }

    onChange({
      checkIn,
      checkOut: toIsoDate(day)
    });
    setOpen(false);
  }

  function isDisabled(day: Date) {
    return isBefore(day, today);
  }

  function isRangeStart(day: Date) {
    return Boolean(startDate && isSameDay(day, startDate));
  }

  function isRangeEnd(day: Date) {
    return Boolean(endDate && isSameDay(day, endDate));
  }

  function isRangeMiddle(day: Date) {
    return Boolean(startDate && endDate && isAfter(day, startDate) && isBefore(day, endDate));
  }

  function isToday(day: Date) {
    return isSameDay(day, today);
  }

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-[68px] items-center justify-between rounded-[18px] border border-[#e3d3c2] bg-[#fbf8f4] px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:h-[74px] sm:rounded-[20px] sm:px-6"
        >
          <span>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2f241b] sm:text-[12px]">Fecha de llegada</span>
            <span className="mt-3 block text-[15px] text-[#201814] sm:text-[16px]">
              {formatLabel(checkIn, "Seleccionar fecha")}
            </span>
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--color-accent-strong)]" />
        </button>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-[68px] items-center justify-between rounded-[18px] border border-[#e3d3c2] bg-[#fbf8f4] px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:h-[74px] sm:rounded-[20px] sm:px-6"
        >
          <span>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2f241b] sm:text-[12px]">Fecha de salida</span>
            <span className="mt-3 block text-[15px] text-[#201814] sm:text-[16px]">
              {formatLabel(checkOut, "Seleccionar fecha")}
            </span>
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--color-accent-strong)]" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-40 mt-3 w-full rounded-[24px] border border-[#eaded1] bg-white p-4 shadow-[0_18px_50px_rgba(71,45,24,0.16)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d725f]">Rango de estadia</p>
              <p className="mt-1 text-sm text-[#6f6054]">Hoy queda resaltado y los dias anteriores no se pueden seleccionar.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthCursor((current) => subMonths(current, 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#eaded1] text-[#5f4f43]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMonthCursor((current) => addMonths(current, 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#eaded1] text-[#5f4f43]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={cn("grid gap-4", monthsToShow === 2 ? "xl:grid-cols-2" : "grid-cols-1")}>
            {Array.from({ length: monthsToShow }).map((_, index) => {
              const month = addMonths(monthCursor, index);
              const days = buildMonthDays(month);

              return (
                <div key={month.toISOString()} className="rounded-[20px] border border-[#efe2d3] bg-[#fcfbf8] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#2b2118]">{format(month, "MMMM yyyy")}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#8d725f]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#201814]" />
                      Hoy
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8d725f]">
                    {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((day) => (
                      <span key={day} className="py-1">
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {days.map((day) => {
                      const disabled = isDisabled(day);
                      const rangeStart = isRangeStart(day);
                      const rangeEnd = isRangeEnd(day);
                      const rangeMiddle = isRangeMiddle(day);
                      const todayDay = isToday(day);

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => handleDayClick(day)}
                          disabled={disabled}
                          className={cn(
                            "relative h-11 rounded-[14px] text-sm transition",
                            !isSameMonth(day, month) && "text-[#c9bbaf]",
                            disabled && "cursor-not-allowed bg-[#f3eee8] text-[#bbaea1]",
                            !disabled && !rangeStart && !rangeEnd && !rangeMiddle && "text-[#2b2118] hover:bg-[#f3ece3]",
                            rangeMiddle && "rounded-none bg-[#eadfd3] text-[#2b2118]",
                            rangeStart && "rounded-r-none bg-[#8f5625] text-white",
                            rangeEnd && "rounded-l-none bg-[#8f5625] text-white",
                            rangeStart && rangeEnd && "rounded-[14px]",
                            todayDay && !rangeStart && !rangeEnd && "ring-2 ring-[#201814] ring-offset-1"
                          )}
                        >
                          {format(day, "d")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
