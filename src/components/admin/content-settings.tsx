import { Card } from "@/components/ui/card";
import { landingContent, siteSettings } from "@/data/mock-data";

export function ContentSettings() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">Hero editable</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          <p>Título: {landingContent.hero.title}</p>
          <p>Subtítulo: {landingContent.hero.subtitle}</p>
          <p>Trust points: {landingContent.hero.trustPoints.join(" · ")}</p>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">Contacto editable</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          <p>WhatsApp: {siteSettings.whatsappNumber}</p>
          <p>Email: {siteSettings.email}</p>
          <p>Instagram: {siteSettings.instagramUrl}</p>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">FAQs</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          {landingContent.faqs.map((faq) => (
            <p key={faq.id}>{faq.question}</p>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">Políticas</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          {landingContent.policies.map((policy) => (
            <p key={policy.title}>{policy.title}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}
