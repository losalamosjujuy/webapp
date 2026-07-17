import { useAdmin } from "@/components/admin/admin-provider";
import { Card } from "@/components/ui/card";

export function ContentSettings() {
  const { state } = useAdmin();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">Hero editable</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          <p>Título: {state.siteContent.heroTitle || "Sin completar"}</p>
          <p>Subtítulo: {state.siteContent.heroSubtitle || "Sin completar"}</p>
          <p>Trust points: {state.siteContent.heroTrustPoints.join(" · ") || "Sin completar"}</p>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">Contacto editable</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          <p>WhatsApp: {state.settings.whatsappNumber || "Sin completar"}</p>
          <p>Email: {state.settings.contactEmail || "Sin completar"}</p>
          <p>Instagram: {state.settings.instagramUrl || "Sin completar"}</p>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">FAQs</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          {state.siteContent.faqs.map((faq) => (
            <p key={faq.id}>{faq.question}</p>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-night">Políticas</h2>
        <div className="mt-4 space-y-3 text-sm text-sand-700">
          {state.siteContent.policies.map((policy) => (
            <p key={policy.id}>{policy.title}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}
