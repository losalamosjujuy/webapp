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
  googleMapsUrl: "https://www.google.com/maps?q=-23.5774,-65.3957",
  address: "Tilcara, Quebrada de Humahuaca",
  city: "Tilcara",
  region: "Jujuy, Argentina",
  coordinates: {
    lat: -23.5774,
    lng: -65.3957
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
    description:
      "Espacio luminoso con cama queen, detalles artesanales y un pequeno patio para desayunos lentos.",
    maxGuests: 2,
    bedrooms: 1,
    beds: "1 cama queen",
    bathrooms: 1,
    basePricePerNight: 78,
    cleaningFee: 14,
    active: true,
    featuredImage: propertyImages.roomDouble,
    amenities: [amenities[0], amenities[1], amenities[4], amenities[5]],
    images: [
      {
        id: "ui1",
        imageUrl: propertyImages.roomDouble,
        altText: "Suite Adobe con texturas cálidas",
        sortOrder: 1
      },
      {
        id: "ui1-2",
        imageUrl: propertyImages.arch,
        altText: "Galeria exterior de la Suite Adobe",
        sortOrder: 2
      }
    ]
  },
  {
    id: "u2",
    name: "Refugio Familiar",
    slug: "refugio-familiar",
    shortDescription: "Unidad amplia para familias pequeñas o grupos de amigos.",
    description:
      "Dos ambientes con cama matrimonial y camas simples, kitchenette y acceso directo al jardin.",
    maxGuests: 4,
    bedrooms: 2,
    beds: "1 cama matrimonial, 2 camas simples",
    bathrooms: 1,
    basePricePerNight: 112,
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
    ]
  },
  {
    id: "u3",
    name: "Estudio Cerro",
    slug: "estudio-cerro",
    shortDescription: "Estudio flexible para quienes priorizan ubicacion y autonomia.",
    description:
      "Un ambiente con cama doble, cocina compacta y rincon de trabajo para escapadas largas.",
    maxGuests: 3,
    bedrooms: 1,
    beds: "1 cama doble, 1 sofa cama",
    bathrooms: 1,
    basePricePerNight: 89,
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
    ]
  }
];

const sampleFaqs: Faq[] = [
  {
    id: "f1",
    question: "Cual es el horario de check-in?",
    answer: "El check-in comienza a las 14:00. Si llegas antes, consultanos por disponibilidad."
  },
  {
    id: "f2",
    question: "¿Cómo se confirma una reserva?",
    answer:
      "La reserva se solicita online y el equipo la confirma manualmente por WhatsApp o email."
  },
  {
    id: "f3",
    question: "¿Tienen estacionamiento?",
    answer: "Sí, contamos con espacios limitados y sujetos a confirmación según la unidad."
  }
];

export const landingContent: LandingContent = {
  hero: {
    eyebrow: "Hospedaje en Tilcara",
    title: "Un descanso sereno en la Quebrada de Humahuaca.",
    subtitle:
      "Reservá directo con atención cercana, unidades acogedoras y una base cómoda para descubrir Tilcara.",
    imageUrl: propertyImages.hero,
    trustPoints: [
      "Reserva directa",
      "Atención personalizada",
      "Ubicación tranquila",
      "Descanso y confort"
    ]
  },
  about:
    "Los Álamos Tilcara nace para recibir viajeros que quieren disfrutar del ritmo de Tilcara con una experiencia simple, cálida y bien acompañada.",
  policies: [
    {
      title: "Política de reserva",
      body: "Toda solicitud queda pendiente hasta ser validada por el equipo y confirmada por mensaje."
    },
    {
      title: "Política de cancelación",
      body: "Las cancelaciones se revisan caso por caso según la anticipación y la temporada."
    },
    {
      title: "Reglas de la casa",
      body: "Pedimos respeto por el descanso de otros huéspedes y cuidado general de las instalaciones."
    }
  ],
  faqs: sampleFaqs,
  testimonials: [
    {
      id: "t1",
      guestName: "Huésped de prueba",
      quote:
        "La estructura esta lista para reemplazar este texto con comentarios reales desde Google, Instagram o mensajes directos.",
      rating: 5,
      source: "draft",
      active: true
    },
    {
      id: "t2",
      guestName: "Familia viajera",
      quote:
        "Se puede lanzar con placeholders claros y luego editar desde el panel cuando haya mas contenido real.",
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
    subtotal: 448,
    cleaningFee: 20,
    totalAmount: 468,
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
    subtotal: 234,
    cleaningFee: 14,
    totalAmount: 248,
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
