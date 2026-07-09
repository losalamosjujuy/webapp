export function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-clay">{eyebrow}</p>
      <h2 className="mt-4 font-display text-3xl text-night sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-sand-700">{description}</p> : null}
    </div>
  );
}
