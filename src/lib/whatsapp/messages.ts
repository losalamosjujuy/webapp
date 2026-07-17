interface ReservationWhatsappInput {
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  nights?: number;
  unitName?: string;
  pricePerNight?: number;
  totalAmount?: number;
}

export function buildWhatsappLink(phone: string, text: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

export function buildGeneralInquiryMessage() {
  return "Hola, quiero conocer disponibilidad y tarifas de Los Alamos Tilcara.";
}

export function buildReservationInquiryMessage({
  checkIn,
  checkOut,
  adults,
  nights,
  unitName,
  pricePerNight,
  totalAmount
}: ReservationWhatsappInput) {
  const dateSummary =
    checkIn && checkOut ? ` desde ${checkIn} hasta ${checkOut}` : " para una futura estadia";
  const adultsSummary = adults ? ` para ${adults} adulto${adults === 1 ? "" : "s"}` : "";
  const unitSummary = unitName ? ` en ${unitName}` : "";
  const nightsSummary = nights ? `, ${nights} noche${nights === 1 ? "" : "s"}` : "";
  const pricingSummary =
    pricePerNight !== undefined && totalAmount !== undefined
      ? `, ${pricePerNight} por noche y ${totalAmount} total estimado`
      : "";

  return `Hola, quiero consultar disponibilidad en Los Alamos Tilcara${dateSummary}${adultsSummary}${unitSummary}${nightsSummary}${pricingSummary}.`;
}

export function buildAdminFollowUpMessage(guestName: string, reservationCode: string) {
  return `Hola ${guestName}, te escribimos desde Los Alamos Tilcara por tu solicitud ${reservationCode}. Queremos compartirte la confirmacion y los pasos para asegurar la reserva.`;
}
