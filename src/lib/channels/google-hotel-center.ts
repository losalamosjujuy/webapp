import { addDays, format } from "date-fns";

import type { InventoryRecord, RatePlan, SiteSettings, Unit } from "@/types/domain";
import { registerChannelProvider } from "@/lib/channels/provider";

interface GoogleHotelCenterContext {
  hotelId: string;
  partnerKey?: string;
  propertyName: string;
  propertyUrl: string;
  siteSettings: SiteSettings;
  units: Unit[];
  ratePlans: RatePlan[];
  inventory: InventoryRecord[];
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function groupedInventory(inventory: InventoryRecord[]) {
  const byKey = new Map<string, InventoryRecord[]>();

  for (const item of inventory) {
    const key = `${item.unitId}:${item.ratePlanId ?? "default"}`;
    const bucket = byKey.get(key) ?? [];
    bucket.push(item);
    byKey.set(key, bucket);
  }

  return byKey;
}

function buildHotelListFeed(context: GoogleHotelCenterContext) {
  const { hotelId, propertyName, propertyUrl, siteSettings } = context;

  return `<?xml version="1.0" encoding="UTF-8"?>
<listings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.gstatic.com/localfeed/local_feed.xsd">
  <language>es</language>
  <listing>
    <id>${escapeXml(hotelId)}</id>
    <name>${escapeXml(propertyName)}</name>
    <address format="simple">
      <component name="addr1">${escapeXml(siteSettings.address)}</component>
      <component name="city">${escapeXml(siteSettings.city)}</component>
      <component name="province">${escapeXml(siteSettings.region)}</component>
    </address>
    <country>AR</country>
    <latitude>${siteSettings.coordinates.lat}</latitude>
    <longitude>${siteSettings.coordinates.lng}</longitude>
    <phone type="main">${escapeXml(siteSettings.phone)}</phone>
    <category>hotel</category>
    <content>
      <attributes>
        <website>${escapeXml(propertyUrl)}</website>
      </attributes>
    </content>
  </listing>
</listings>`;
}

function buildPropertyDataFeed(context: GoogleHotelCenterContext) {
  const { hotelId, partnerKey, units, ratePlans } = context;
  const roomNodes = units
    .map(
      (unit) => `    <PropertyDataSet>
      <Property>${escapeXml(hotelId)}</Property>
      <RoomData>
        <RoomID>${escapeXml(unit.id)}</RoomID>
        <Name>
          <Text text="${escapeXml(unit.name)}" language="es"/>
        </Name>
        <Description>
          <Text text="${escapeXml(unit.shortDescription)}" language="es"/>
        </Description>
        <Capacity>${unit.maxGuests}</Capacity>
      </RoomData>
    </PropertyDataSet>`
    )
    .join("\n");
  const ratePlanNodes = ratePlans
    .map(
      (plan) => `    <PropertyDataSet>
      <Property>${escapeXml(hotelId)}</Property>
      <PackageData>
        <PackageID>${escapeXml(plan.id)}</PackageID>
        <Name>
          <Text text="${escapeXml(plan.name)}" language="es"/>
        </Name>
        <Description>
          <Text text="${escapeXml(plan.description ?? plan.name)}" language="es"/>
        </Description>
      </PackageData>
    </PropertyDataSet>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Transaction timestamp="${new Date().toISOString()}" id="google-property-data">
${partnerKey ? `  <POS><Source><RequestorID ID="${escapeXml(partnerKey)}"/></Source></POS>` : ""}
${roomNodes}
${ratePlanNodes}
</Transaction>`;
}

function buildRatesFeed(context: GoogleHotelCenterContext) {
  const { hotelId, partnerKey, ratePlans, inventory, units } = context;
  const inventoryMap = groupedInventory(inventory);
  const planById = new Map(ratePlans.map((plan) => [plan.id, plan]));
  const rows: string[] = [];

  for (const unit of units) {
    const unitPlans = ratePlans.filter((plan) => plan.unitId === unit.id);
    for (const plan of unitPlans) {
      const items = (inventoryMap.get(`${unit.id}:${plan.id}`) ?? []).sort((a, b) => a.date.localeCompare(b.date));
      for (const item of items) {
        const amount = item.baseRate ?? plan.basePricePerNight ?? unit.basePricePerNight;
        rows.push(`      <RateAmountMessage>
        <StatusApplicationControl Start="${item.date}" End="${item.date}" InvTypeCode="${escapeXml(unit.id)}" RatePlanCode="${escapeXml(plan.id)}"/>
        <Rates>
          <Rate>
            <BaseByGuestAmts>
              <BaseByGuestAmt AmountBeforeTax="${amount.toFixed(2)}" CurrencyCode="${escapeXml(plan.currency)}" NumberOfGuests="2"/>
            </BaseByGuestAmts>
          </Rate>
        </Rates>
      </RateAmountMessage>`);
      }
    }
  }

  if (!rows.length) {
    const start = format(new Date(), "yyyy-MM-dd");
    const end = format(addDays(new Date(), 365), "yyyy-MM-dd");

    for (const unit of units) {
      const plan = ratePlans.find((item) => item.unitId === unit.id) ?? planById.values().next().value;
      if (!plan) {
        continue;
      }
      rows.push(`      <RateAmountMessage>
        <StatusApplicationControl Start="${start}" End="${end}" InvTypeCode="${escapeXml(unit.id)}" RatePlanCode="${escapeXml(plan.id)}"/>
        <Rates>
          <Rate>
            <BaseByGuestAmts>
              <BaseByGuestAmt AmountBeforeTax="${plan.basePricePerNight.toFixed(2)}" CurrencyCode="${escapeXml(plan.currency)}" NumberOfGuests="2"/>
            </BaseByGuestAmts>
          </Rate>
        </Rates>
      </RateAmountMessage>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRateAmountNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" EchoToken="google-rates" TimeStamp="${new Date().toISOString()}" Version="3.0" NotifType="Overlay" NotifScopeType="ProductRate">
  ${partnerKey ? `<POS><Source><RequestorID ID="${escapeXml(partnerKey)}"/></Source></POS>` : ""}
  <RateAmountMessages HotelCode="${escapeXml(hotelId)}">
${rows.join("\n")}
  </RateAmountMessages>
</OTA_HotelRateAmountNotifRQ>`;
}

function buildAvailabilityFeed(context: GoogleHotelCenterContext) {
  const { hotelId, partnerKey, ratePlans, inventory, units } = context;
  const rows: string[] = [];

  for (const item of inventory.sort((a, b) => a.date.localeCompare(b.date))) {
    const unit = units.find((entry) => entry.id === item.unitId);
    if (!unit) {
      continue;
    }
    const plan = ratePlans.find((entry) => entry.id === item.ratePlanId) ?? ratePlans.find((entry) => entry.unitId === unit.id);
    if (!plan) {
      continue;
    }
    rows.push(`      <AvailStatusMessage>
        <StatusApplicationControl Start="${item.date}" End="${item.date}" InvTypeCode="${escapeXml(unit.id)}" RatePlanCode="${escapeXml(plan.id)}"/>
        <RestrictionStatus Status="${item.stopSell ? "Close" : "Open"}"/>
        ${item.minStay ? `<LengthsOfStay><LengthOfStay Time="Arrival" MinMaxMessageType="SetMinLOS" TimeUnit="Day" Value="${item.minStay}"/></LengthsOfStay>` : ""}
      </AvailStatusMessage>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" EchoToken="google-availability" TimeStamp="${new Date().toISOString()}" Version="3.0">
  ${partnerKey ? `<POS><Source><RequestorID ID="${escapeXml(partnerKey)}"/></Source></POS>` : ""}
  <AvailStatusMessages HotelCode="${escapeXml(hotelId)}">
${rows.join("\n")}
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`;
}

function buildInventoryFeed(context: GoogleHotelCenterContext) {
  const { hotelId, partnerKey, inventory, units } = context;
  const rows = inventory
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => {
      const unit = units.find((entry) => entry.id === item.unitId);
      if (!unit) {
        return "";
      }
      return `    <Inventory>
      <StatusApplicationControl Start="${item.date}" End="${item.date}" InvTypeCode="${escapeXml(unit.id)}"/>
      <InvCounts>
        <InvCount Count="${item.availableUnits}" CountType="2"/>
      </InvCounts>
    </Inventory>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelInvCountNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" EchoToken="google-inventory" TimeStamp="${new Date().toISOString()}" Version="3.0">
  ${partnerKey ? `<POS><Source><RequestorID ID="${escapeXml(partnerKey)}"/></Source></POS>` : ""}
  <Inventories HotelCode="${escapeXml(hotelId)}">
${rows}
  </Inventories>
</OTA_HotelInvCountNotifRQ>`;
}

export const googleHotelCenterProvider = {
  key: "google_hotel_center",
  buildFeeds(context: GoogleHotelCenterContext) {
    return {
      hotelList: buildHotelListFeed(context),
      propertyData: buildPropertyDataFeed(context),
      rates: buildRatesFeed(context),
      availability: buildAvailabilityFeed(context),
      inventory: buildInventoryFeed(context)
    };
  }
};

registerChannelProvider(googleHotelCenterProvider);
