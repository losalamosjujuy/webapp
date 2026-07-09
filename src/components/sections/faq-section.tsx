import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Faq } from "@/types/domain";

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="py-20">
      <Container className="grid gap-10 lg:grid-cols-[0.7fr_1fr]">
        <SectionHeading
          eyebrow="Preguntas frecuentes"
          title="Respuestas claras para reducir mensajes repetidos."
        />
        <Accordion.Root className="space-y-4" type="single" collapsible>
          {faqs.map((faq) => (
            <Accordion.Item
              className="rounded-3xl border border-sand-200 bg-white px-6"
              key={faq.id}
              value={faq.id}
            >
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between py-5 text-left text-base font-semibold text-night">
                  {faq.question}
                  <ChevronDown className="h-5 w-5 text-clay" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="pb-5 text-sm leading-7 text-sand-700">
                {faq.answer}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Container>
    </section>
  );
}
