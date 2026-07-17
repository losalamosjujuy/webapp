import { PublicHomePage } from "@/components/public/public-home-page";
import { getLandingPageData } from "@/lib/data-access";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { units, siteSettings, landingContent, gallery } = await getLandingPageData();

  return (
    <PublicHomePage
      gallery={gallery}
      landingContent={landingContent}
      siteSettings={siteSettings}
      units={units}
    />
  );
}
