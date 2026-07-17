import type {
  AvailabilityBlock,
  Faq,
  GalleryItem,
  Inquiry,
  LandingContent,
  Reservation,
  SiteSettings,
  Unit
} from "@/types/domain";
import { propertyImages } from "@/data/property-images";

export const siteSettings: SiteSettings = {
  whatsappNumber: "5493881234567",
  phone: "+54 9 388 123 4567",
  email: "reservas@losalamostilcara.com",
  instagramUrl: "https://instagram.com/losalamostilcara",
  facebookUrl: "https://facebook.com/losalamostilcara",
  googleReviewsUrl: "https://www.google.com/search?q=Los+Alamos+Tilcara",
  googleMapsUrl: "https://www.google.com/maps/place/Alverro+157,+Y4624+Tilcara,+Jujuy",
  address: "Alverro 157, Y4624 Tilcara, Jujuy",
  city: "Tilcara",
  region: "Jujuy, Argentina",
  depositPercentage: 10,
  coordinates: {
    lat: -23.574981,
    lng: -65.3939137
  }
};

const amenities = [
  { id: "a1", name: "Wi-Fi", icon: "wifi", category: "comfort" },
  { id: "a2", name: "Calefaccion", icon: "heater", category: "comfort" },
  { id: "a3", name: "Kitchenette", icon: "utensils", category: "kitchen" },
  { id: "a4", name: "Estacionamiento", icon: "car", category: "access" },
  { id: "a5", name: "Patio y jardin", icon: "trees", category: "outdoor" },
  { id: "a6", name: "Vista a los cerros", icon: "mountain", category: "outdoor" }
] as const;

export const units: Unit[] = [
  {
    id: "u1",
    name: "Suite Adobe",
    slug: "suite-adobe",
    shortDescription: "Suite serena para parejas o viajeros que buscan calma y paisaje.",
    description: "Espacio luminoso con cama queen, detalles artesanales y un pequeno patio para desayunos lentos.",
    maxGuests: 2,
    bedrooms: 1,
    beds: "1 cama queen",
    bathrooms: 1,
    basePricePerNight: 78,
    fromPricePerNight: 78,
    cleaningFee: 14,
    active: true,
    featuredImage: propertyImages.roomDouble,
    amenities: [amenities[0], amenities[1], amenities[4], amenities[5]],
    images: [
      {
        id: "ui1",
        imageUrl: propertyImages.roomDouble,
        altText: "Suite Adobe con texturas calidas",
        sortOrder: 1
      },
      {
        id: "ui1-2",
        imageUrl: propertyImages.arch,
        altText: "Galeria exterior de la Suite Adobe",
        sortOrder: 2
      }
    ],
    highlights: ["Patio privado", "Textiles artesanales", "Ideal para parejas"],
    adultPriceRates: [
      { id: "u1-r1", unitId: "u1", adults: 1, pricePerNight: 78, active: true },
      { id: "u1-r2", unitId: "u1", adults: 2, pricePerNight: 95, active: true }
    ],
    details: [
      { label: "Ambiente", value: "Dormitorio con sector de estar" },
      { label: "Vista", value: "Patio interno y vegetacion" },
      { label: "Ideal para", value: "Escapadas tranquilas de 2 personas" }
    ]
  },
  {
    id: "u2",
    name: "Refugio Familiar",
    slug: "refugio-familiar",
    shortDescription: "Unidad amplia para familias pequenas o grupos de amigos.",
    description: "Dos ambientes con cama matrimonial y camas simples, kitchenette y acceso directo al jardin.",
    maxGuests: 4,
    bedrooms: 2,
    beds: "1 cama matrimonial, 2 camas simples",
    bathrooms: 1,
    basePricePerNight: 112,
    fromPricePerNight: 112,
    cleaningFee: 20,
    active: true,
    featuredImage: propertyImages.roomFamily,
    amenities: [amenities[0], amenities[2], amenities[3], amenities[4]],
    images: [
      {
        id: "ui2",
        imageUrl: propertyImages.roomFamily,
        altText: "Refugio Familiar con living y cama principal",
        sortOrder: 1
      },
      {
        id: "ui2-2",
        imageUrl: propertyImages.patio,
        altText: "Patio y jardin del Refugio Familiar",
        sortOrder: 2
      }
    ],
    highlights: ["Dos ambientes", "Kitchenette equipada", "Salida al jardin"],
    adultPriceRates: [
      { id: "u2-r1", unitId: "u2", adults: 1, pricePerNight: 112, active: true },
      { id: "u2-r2", unitId: "u2", adults: 2, pricePerNight: 135, active: true },
      { id: "u2-r3", unitId: "u2", adults: 3, pricePerNight: 158, active: true },
      { id: "u2-r4", unitId: "u2", adults: 4, pricePerNight: 180, active: true }
    ],
    details: [
      { label: "Distribucion", value: "Dormitorio principal mas sector con camas simples" },
      { label: "Exterior", value: "Acceso directo al patio" },
      { label: "Ideal para", value: "Familias o grupos pequenos" }
    ]
  },
  {
    id: "u3",
    name: "Estudio Cerro",
    slug: "estudio-cerro",
    shortDescription: "Estudio flexible para quienes priorizan ubicacion y autonomia.",
    description: "Un ambiente con cama doble, cocina compacta y rincon de trabajo para escapadas largas.",
    maxGuests: 3,
    bedrooms: 1,
    beds: "1 cama doble, 1 sofa cama",
    bathrooms: 1,
    basePricePerNight: 89,
    fromPricePerNight: 89,
    cleaningFee: 16,
    active: true,
    featuredImage: propertyImages.gallery,
    amenities: [amenities[0], amenities[1], amenities[2], amenities[5]],
    images: [
      {
        id: "ui3",
        imageUrl: propertyImages.gallery,
        altText: "Estudio Cerro con salida a la galeria y entorno verde",
        sortOrder: 1
      },
      {
        id: "ui3-2",
        imageUrl: propertyImages.courtyard,
        altText: "Patio interior del Estudio Cerro",
        sortOrder: 2
      }
    ],
    highlights: ["Cocina compacta", "Espacio flexible", "Buena opcion para estancias largas"],
    adultPriceRates: [
      { id: "u3-r1", unitId: "u3", adults: 1, pricePerNight: 89, active: true },
      { id: "u3-r2", unitId: "u3", adults: 2, pricePerNight: 104, active: true },
      { id: "u3-r3", unitId: "u3", adults: 3, pricePerNight: 124, active: true }
    ],
    details: [
      { label: "Formato", value: "Monoambiente amplio" },
      { label: "Trabajo remoto", value: "Rincon de apoyo disponible" },
      { label: "Ideal para", value: "Viajeros con autonomia" }
    ]
  }
];

const sampleFaqs: Faq[] = [
  {
    id: "f1",
    question: "Cual es el horario de check-in?",
    answer: "El check-in comienza a las 14:00 hs. Si necesitas ingresar antes, consultanos previamente y verificaremos la disponibilidad."
  },
  {
    id: "f2",
    question: "Cual es el horario de check-out?",
    answer: "El check-out se realiza hasta las 10:00 hs. Si necesitas extender tu estadia, comunicate con nosotros para evaluar la disponibilidad."
  },
  {
    id: "f3",
    question: "Como se confirma una reserva?",
    answer: "Podes solicitar tu reserva desde la web. La misma queda confirmada una vez validado el pago de la sena y recibas nuestra confirmacion por WhatsApp o correo electronico."
  },
  {
    id: "f4",
    question: "Que medios de pago aceptan?",
    answer: "Aceptamos transferencias bancarias y otros medios de pago. Consultanos para conocer las opciones disponibles al momento de reservar."
  },
  {
    id: "f5",
    question: "Se necesita una sena para reservar?",
    answer: "Si. Para garantizar la reserva solicitamos una sena. El monto y las condiciones seran informados durante el proceso de reserva."
  },
  {
    id: "f6",
    question: "Puedo cancelar o modificar mi reserva?",
    answer: "Si, aunque las condiciones dependen de la anticipacion con la que se solicite el cambio. Te recomendamos consultar nuestra politica de cancelacion antes de confirmar la reserva."
  },
  {
    id: "f7",
    question: "El desayuno esta incluido?",
    answer: "Si, el desayuno esta incluido cuando asi se indique en la tarifa seleccionada. Si tenes dudas, podes consultarnos antes de reservar."
  },
  {
    id: "f8",
    question: "Tienen estacionamiento?",
    answer: "Si, contamos con estacionamiento sujeto a disponibilidad."
  },
  {
    id: "f9",
    question: "Aceptan mascotas?",
    answer: "Depende de la unidad y de la disponibilidad. Consultanos antes de realizar la reserva."
  },
  {
    id: "f10",
    question: "Hay Wi-Fi?",
    answer: "Si, ofrecemos conexion Wi-Fi gratuita para todos nuestros huespedes."
  },
  {
    id: "f11",
    question: "Las habitaciones cuentan con bano privado?",
    answer: "Si, todas nuestras habitaciones disponen de bano privado y las comodidades indicadas en la descripcion."
  },
  {
    id: "f12",
    question: "Donde estan ubicados?",
    answer: "Nos encontramos en Tilcara, Jujuy, en una ubicacion ideal para recorrer la Quebrada de Humahuaca y sus principales atractivos."
  },
  {
    id: "f13",
    question: "Como puedo comunicarme?",
    answer: "Podes escribirnos por WhatsApp, completar el formulario de contacto de la web o enviarnos un correo electronico. Respondemos lo antes posible."
  },
  {
    id: "f14",
    question: "Que lugares turisticos hay cerca?",
    answer: "Desde nuestro alojamiento podras visitar el Pucara de Tilcara, el centro historico, mercados artesanales, senderos y otros atractivos de la Quebrada de Humahuaca."
  },
  {
    id: "f15",
    question: "Puedo reservar para grupos o familias?",
    answer: "Si. Contamos con opciones para parejas, familias y grupos. Contactanos para ayudarte a elegir la mejor alternativa."
  }
];

export const landingContent: LandingContent = {
  hero: {
    eyebrow: "Hospedaje en Tilcara",
    title: "Un descanso sereno en la Quebrada de Humahuaca.",
    subtitle: "Reserva directo con atencion cercana, unidades acogedoras y una base comoda para descubrir Tilcara.",
    imageUrl: propertyImages.hero,
    trustPoints: ["Reserva directa", "Atencion personalizada", "Ubicacion tranquila", "Descanso y confort"]
  },
  about: "Los Alamos Tilcara nace para recibir viajeros que quieren disfrutar del ritmo de Tilcara con una experiencia simple, calida y bien acompanada.",
  policies: [
    {
      title: "Politica de reserva",
      body: "Toda solicitud queda pendiente hasta ser validada por el equipo y confirmada por mensaje."
    },
    {
      title: "Politica de cancelacion",
      body: "Las cancelaciones se revisan caso por caso segun la anticipacion y la temporada."
    },
    {
      title: "Reglas de la casa",
      body: "Pedimos respeto por el descanso de otros huespedes y cuidado general de las instalaciones."
    }
  ],
  faqs: sampleFaqs,
  testimonials: [
    {
      id: "t1",
      guestName: "Huesped de prueba",
      quote: "La estructura esta lista para reemplazar este texto con comentarios reales desde Google, Instagram o mensajes directos.",
      rating: 5,
      source: "draft",
      active: true
    },
    {
      id: "t2",
      guestName: "Familia viajera",
      quote: "Se puede lanzar con placeholders claros y luego editar desde el panel cuando haya mas contenido real.",
      rating: 5,
      source: "draft",
      active: true
    }
  ]
};

export const reservations: Reservation[] = [
  {
    id: "r1",
    reservationCode: "LAT-240701",
    guest: {
      id: "g1",
      fullName: "Maria Quispe",
      phone: "+54 9 11 5555 0101",
      email: "maria@example.com",
      city: "Buenos Aires",
      country: "Argentina"
    },
    unit: { id: "u2", name: "Refugio Familiar", slug: "refugio-familiar" },
    source: "whatsapp",
    status: "confirmed",
    checkIn: "2026-07-12",
    checkOut: "2026-07-16",
    adults: 2,
    children: 2,
    nights: 4,
    adultsPriceRateId: "u2-r2",
    pricePerNight: 112,
    subtotal: 448,
    cleaningFee: 20,
    totalAmount: 468,
    depositPercentage: 10,
    depositAmount: 47,
    currency: "USD",
    specialRequests: "Llegada nocturna",
    estimatedArrivalTime: "22:00",
    createdAt: "2026-07-01T14:00:00.000Z"
  },
  {
    id: "r2",
    reservationCode: "LAT-240702",
    guest: {
      id: "g2",
      fullName: "James Turner",
      phone: "+1 206 555 0199",
      email: "james@example.com",
      city: "Seattle",
      country: "USA"
    },
    unit: { id: "u1", name: "Suite Adobe", slug: "suite-adobe" },
    source: "website",
    status: "pending",
    checkIn: "2026-07-20",
    checkOut: "2026-07-23",
    adults: 2,
    children: 0,
    nights: 3,
    adultsPriceRateId: "u1-r2",
    pricePerNight: 78,
    subtotal: 234,
    cleaningFee: 14,
    totalAmount: 248,
    depositPercentage: 10,
    depositAmount: 25,
    currency: "USD",
    createdAt: "2026-07-03T18:30:00.000Z"
  }
];

export const availabilityBlocks: AvailabilityBlock[] = [
  {
    id: "b1",
    unitId: "u3",
    startDate: "2026-07-18",
    endDate: "2026-07-20",
    reason: "Mantenimiento ligero",
    blockType: "maintenance"
  }
];

export const inquiries: Inquiry[] = [
  {
    id: "i1",
    fullName: "Lucia Gomez",
    phone: "+54 9 388 444 7788",
    email: "lucia@example.com",
    message: "Quiero saber si aceptan mascotas y si tienen desayuno.",
    source: "instagram",
    status: "new",
    createdAt: "2026-07-03T13:15:00.000Z"
  }
];

export const galleryItems: GalleryItem[] = [
  {
    id: "gallery-1",
    title: "Frente del hospedaje",
    category: "inicio",
    imageUrl: propertyImages.hero
  },
  {
    id: "gallery-2",
    title: "Patio principal",
    category: "entorno",
    imageUrl: propertyImages.patio
  },
  {
    id: "gallery-3",
    title: "Habitacion doble",
    category: "alojamientos",
    imageUrl: propertyImages.roomDouble
  },
  {
    id: "gallery-4",
    title: "Habitacion familiar",
    category: "alojamientos",
    imageUrl: propertyImages.roomFamily
  },
  {
    id: "gallery-5",
    title: "Salon de desayuno",
    category: "servicios",
    imageUrl: propertyImages.dining
  },
  {
    id: "gallery-6",
    title: "Galeria exterior",
    category: "entorno",
    imageUrl: propertyImages.gallery
  }
];
