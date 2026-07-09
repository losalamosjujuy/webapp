interface ReservationWhatsappInput {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  unitName?: string;
}

export function buildWhatsappLink(phone: string, text: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

export function buildGeneralInquiryMessage() {
  return "Hola, quiero conocer disponibilidad y tarifas de Los Álamos Tilcara.";
}

export function buildReservationInquiryMessage({
  checkIn,
  checkOut,
  guests,
  unitName
}: ReservationWhatsappInput) {
  const dateSummary =
    checkIn && checkOut ? ` desde ${checkIn} hasta ${checkOut}` : " para una futura estadía";
  const guestSummary = guests ? ` para ${guests} personas` : "";
  const unitSummary = unitName ? ` en ${unitName}` : "";

  return `Hola, quiero consultar disponibilidad en Los Álamos Tilcara${dateSummary}${guestSummary}${unitSummary}.`;
}

export function buildAdminFollowUpMessage(guestName: string, reservationCode: string) {
  return `Hola ${guestName}, te escribimos desde Los Álamos Tilcara por tu solicitud ${reservationCode}. Queremos compartirte la confirmación y los pasos para asegurar la reserva.`;
}
