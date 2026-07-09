import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-sm text-sand-700">{label}</p>
      <p className="mt-3 font-display text-4xl text-night">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-clay">{helper}</p>
    </Card>
  );
}
