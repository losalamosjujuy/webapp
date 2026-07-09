import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export function PoliciesSection({
  policies
}: {
  policies: Array<{ title: string; body: string }>;
}) {
  return (
    <section className="bg-white py-20">
      <Container>
        <SectionHeading
          eyebrow="Políticas"
          title="Textos esenciales editables sin montar un CMS pesado."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {policies.map((policy) => (
            <div className="rounded-3xl border border-sand-200 p-6" key={policy.title}>
              <h3 className="text-xl font-semibold text-night">{policy.title}</h3>
              <p className="mt-3 text-sm leading-7 text-sand-700">{policy.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
