import { NextResponse } from "next/server";

import { googleHotelCenterProvider } from "@/lib/channels/google-hotel-center";
import { getGoogleHotelCenterFeedData } from "@/lib/data-access";
import { env } from "@/lib/supabase/env";

const SUPPORTED_FEEDS = new Set([
  "hotelList",
  "propertyData",
  "rates",
  "availability",
  "inventory"
]);
type SupportedFeed = "hotelList" | "propertyData" | "rates" | "availability" | "inventory";

export async function GET(
  _request: Request,
  { params }: { params: { feed: string } }
) {
  if (!SUPPORTED_FEEDS.has(params.feed)) {
    return NextResponse.json({ error: "Feed no soportado." }, { status: 404 });
  }

  const feedData = await getGoogleHotelCenterFeedData();
  const feeds = googleHotelCenterProvider.buildFeeds({
    hotelId: env.GOOGLE_HOTEL_CENTER_HOTEL_ID,
    partnerKey: env.GOOGLE_HOTEL_CENTER_PARTNER_KEY,
    propertyName: "Los Álamos Tilcara",
    propertyUrl: env.NEXT_PUBLIC_SITE_URL,
    ...feedData
  });

  return new NextResponse(feeds[params.feed as SupportedFeed], {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
