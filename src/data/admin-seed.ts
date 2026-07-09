import type { AdminState } from "@/types/admin";
import { propertyImages } from "@/data/property-images";

const unitImages = {
  double: propertyImages.roomDouble,
  triple: propertyImages.roomFamily,
  family: propertyImages.gallery,
  loft: propertyImages.courtyard,
  patio: propertyImages.patio,
  valley: propertyImages.heroAlt
};

export const adminSeedState: AdminState = {
  reservations: [
    {
      id: "res-01024",
      guestName: "Mariana Torres",
      guestEmail: "mariana@email.com",
      guestPhone: "+54 9 388 123 4567",
      accommodationId: "unit-double",
      accommodationName: "Habitacion Doble",
      checkIn: "2026-05-21",
      checkOut: "2026-05-23",
      guests: 2,
      total: 140000,
      status: "pending",
      source: "Web"
    },
    {
      id: "res-01023",
      guestName: "Lucas Fernandez",
      guestEmail: "lucasf@email.com",
      guestPhone: "+54 9 382 334 5678",
      accommodationId: "unit-family",
      accommodationName: "Cabana Familiar",
      checkIn: "2026-05-24",
      checkOut: "2026-05-27",
      guests: 4,
      total: 340000,
      status: "confirmed",
      source: "WhatsApp"
    },
    {
      id: "res-01022",
      guestName: "Ana Perez",
      guestEmail: "ana.perez@email.com",
      guestPhone: "+54 9 388 765 4321",
      accommodationId: "unit-triple",
      accommodationName: "Habitacion Triple",
      checkIn: "2026-05-25",
      checkOut: "2026-05-26",
      guests: 3,
      total: 110000,
      status: "pending",
      source: "Instagram"
    },
    {
      id: "res-01020",
      guestName: "Diego Suarez",
      guestEmail: "diego@email.com",
      guestPhone: "+54 9 388 456 7890",
      accommodationId: "unit-loft",
      accommodationName: "Loft con Vista",
      checkIn: "2026-05-26",
      checkOut: "2026-05-29",
      guests: 2,
      total: 220000,
      status: "confirmed",
      source: "Web"
    },
    {
      id: "res-01019",
      guestName: "Valentina Gomez",
      guestEmail: "valen@email.com",
      guestPhone: "+54 9 380 567 8901",
      accommodationId: "unit-double",
      accommodationName: "Habitacion Doble",
      checkIn: "2026-05-27",
      checkOut: "2026-05-28",
      guests: 2,
      total: 70000,
      status: "canceled",
      source: "Email"
    },
    {
      id: "res-01018",
      guestName: "Sofia Herrera",
      guestEmail: "sofia@email.com",
      guestPhone: "+54 9 388 670 0012",
      accommodationId: "unit-family",
      accommodationName: "Cabana Familiar",
      checkIn: "2026-05-28",
      checkOut: "2026-05-31",
      guests: 4,
      total: 330000,
      status: "confirmed",
      source: "Web"
    }
  ],
  payments: [],
  guests: [
    {
      id: "guest-1",
      name: "Mariana Torres",
      email: "mariana@email.com",
      phone: "+54 9 388 123 4567",
      city: "Buenos Aires",
      reservationsCount: 3,
      status: "frequent"
    },
    {
      id: "guest-2",
      name: "Lucas Fernandez",
      email: "lucasf@email.com",
      phone: "+54 9 382 334 5678",
      city: "Cordoba",
      reservationsCount: 2,
      status: "new"
    },
    {
      id: "guest-3",
      name: "Ana Perez",
      email: "ana.perez@email.com",
      phone: "+54 9 388 765 4321",
      city: "Rosario",
      reservationsCount: 1,
      status: "new"
    },
    {
      id: "guest-4",
      name: "Diego Suarez",
      email: "diego@email.com",
      phone: "+54 9 388 456 7890",
      city: "Mendoza",
      reservationsCount: 2,
      status: "frequent"
    },
    {
      id: "guest-5",
      name: "Valentina Gomez",
      email: "valen@email.com",
      phone: "+54 9 380 567 8901",
      city: "Salta",
      reservationsCount: 1,
      status: "new"
    }
  ],
  inquiries: [
    {
      id: "inq-1",
      createdAt: "2026-05-20T10:23:00.000Z",
      name: "Camila Ruiz",
      contact: "+54 9 388 123 4567",
      channel: "WhatsApp",
      subject: "Consulta disponibilidad para 2 personas",
      message: "Quiero saber si hay lugar para el fin de semana largo.",
      status: "new"
    },
    {
      id: "inq-2",
      createdAt: "2026-05-20T09:15:00.000Z",
      name: "Jorge Martinez",
      contact: "+54 9 380 234 5678",
      channel: "WhatsApp",
      subject: "Consulta sobre habitaciones familiares",
      message: "Somos 4 y queremos cocina equipada.",
      status: "new"
    },
    {
      id: "inq-3",
      createdAt: "2026-05-19T18:40:00.000Z",
      name: "Sofia Herrera",
      contact: "sofia@email.com",
      channel: "Email",
      subject: "Consulta sobre precios y servicios",
      message: "Necesito precio para 3 noches en junio.",
      status: "in_progress"
    },
    {
      id: "inq-4",
      createdAt: "2026-05-19T16:22:00.000Z",
      name: "Matias Gomez",
      contact: "+54 9 388 345 6789",
      channel: "WhatsApp",
      subject: "Consulta sobre estacionamiento",
      message: "Viajo en camioneta y quiero confirmar espacio.",
      status: "resolved"
    }
  ],
  units: [
    {
      id: "unit-double",
      name: "Habitacion Doble",
      capacity: 2,
      beds: "1 cama doble",
      price: 90000,
      image: unitImages.double,
      images: [
        { id: "unit-double-image-1", url: unitImages.double, altText: "Habitacion Doble", sortOrder: 1 }
      ],
      status: "active",
      description: "Ideal para parejas que buscan tranquilidad y descanso."
    },
    {
      id: "unit-triple",
      name: "Habitacion Triple",
      capacity: 3,
      beds: "1 cama doble + 1 simple",
      price: 110000,
      image: unitImages.triple,
      images: [
        { id: "unit-triple-image-1", url: unitImages.triple, altText: "Habitacion Triple", sortOrder: 1 }
      ],
      status: "active",
      description: "Perfecta para amigos o familias pequeñas."
    },
    {
      id: "unit-family",
      name: "Cabana Familiar",
      capacity: 4,
      beds: "2 camas + sofa cama",
      price: 150000,
      image: unitImages.family,
      images: [
        { id: "unit-family-image-1", url: unitImages.family, altText: "Cabana Familiar", sortOrder: 1 }
      ],
      status: "active",
      description: "Espaciosa y equipada para toda la familia."
    },
    {
      id: "unit-loft",
      name: "Loft con Vista",
      capacity: 2,
      beds: "1 cama doble",
      price: 120000,
      image: unitImages.loft,
      images: [
        { id: "unit-loft-image-1", url: unitImages.loft, altText: "Loft con Vista", sortOrder: 1 }
      ],
      status: "active",
      description: "Loft amplio con vista a los cerros y balcon."
    }
  ],
  inventory: [],
  availabilityBlocks: [
    {
      id: "blk-1",
      accommodationId: "unit-double",
      accommodationName: "Habitacion Doble",
      startDate: "2026-06-05",
      endDate: "2026-06-10",
      reason: "Mantenimiento",
      createdBy: "Administrador"
    },
    {
      id: "blk-2",
      accommodationId: "unit-family",
      accommodationName: "Cabana Familiar",
      startDate: "2026-07-15",
      endDate: "2026-07-20",
      reason: "Evento privado",
      createdBy: "Administrador"
    },
    {
      id: "blk-3",
      accommodationId: "unit-loft",
      accommodationName: "Loft con Vista",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      reason: "Viaje personal",
      createdBy: "Administrador"
    }
  ],
  priceSeasons: [
    {
      id: "season-1",
      name: "Temporada Baja",
      startDate: "2026-05-01",
      endDate: "2026-06-30",
      prices: {
        "unit-double": 90000,
        "unit-triple": 100000,
        "unit-family": 130000,
        "unit-loft": 100000
      }
    },
    {
      id: "season-2",
      name: "Temporada Media",
      startDate: "2026-07-01",
      endDate: "2026-08-31",
      prices: {
        "unit-double": 100000,
        "unit-triple": 120000,
        "unit-family": 160000,
        "unit-loft": 130000
      }
    },
    {
      id: "season-3",
      name: "Feriados",
      startDate: "2026-09-01",
      endDate: "2026-09-20",
      prices: {
        "unit-double": 140000,
        "unit-triple": 160000,
        "unit-family": 200000,
        "unit-loft": 170000
      }
    }
  ],
  gallery: [
    { id: "gal-1", title: "Agregar", category: "inicio", image: propertyImages.hero },
    { id: "gal-2", title: "Habitacion doble", category: "alojamientos", image: unitImages.double },
    { id: "gal-3", title: "Cabana familiar", category: "alojamientos", image: unitImages.family },
    { id: "gal-4", title: "Patio central", category: "servicios", image: unitImages.patio },
    { id: "gal-5", title: "Montanas", category: "entorno", image: unitImages.valley },
    { id: "gal-6", title: "Desayuno", category: "servicios", image: propertyImages.dining },
    { id: "gal-7", title: "Loft interior", category: "alojamientos", image: unitImages.loft },
    { id: "gal-8", title: "Galeria exterior", category: "entorno", image: propertyImages.arch }
  ],
  users: [
    {
      id: "usr-1",
      name: "Administrador",
      email: "admin@losalamos.com.ar",
      role: "Administrador",
      status: "active",
      lastAccess: "2026-05-20T11:30:00.000Z"
    },
    {
      id: "usr-2",
      name: "Recepción",
      email: "recepcion@losalamos.com.ar",
      role: "Editor",
      status: "active",
      lastAccess: "2026-05-20T10:45:00.000Z"
    },
    {
      id: "usr-3",
      name: "Soporte",
      email: "soporte@losalamos.com.ar",
      role: "Editor",
      status: "inactive",
      lastAccess: "2026-05-16T14:55:00.000Z"
    },
    {
      id: "usr-4",
      name: "Limpieza",
      email: "limpieza@losalamos.com.ar",
      role: "Visualizador",
      status: "active",
      lastAccess: "2026-05-19T14:20:00.000Z"
    }
  ],
  siteContent: {
    heroTitle: "Los Álamos Tilcara",
    heroSubtitle: "Un lugar para descansar y conectar con la magia de la Quebrada de Humahuaca.",
    heroImage: propertyImages.hero,
    aboutTitle: "Sobre nosotros",
    aboutBody: "Hospedaje familiar en Tilcara con atención personalizada y calidez norteña.",
    testimonialsTitle: "Lo que dicen nuestros huéspedes",
    locationTitle: "En el corazón de Tilcara",
    policiesTitle: "Políticas",
    faqs: [
      {
        id: "faq-1",
        question: "¿Cuál es el horario de check-in?",
        answer: "El check-in comienza a las 14:00."
      },
      {
        id: "faq-2",
        question: "¿Tienen estacionamiento?",
        answer: "Sí, contamos con estacionamiento sujeto a disponibilidad."
      }
    ],
    policies: [
      {
        id: "pol-1",
        title: "Reserva directa",
        body: "Las solicitudes se confirman manualmente por el equipo."
      },
      {
        id: "pol-2",
        title: "Cancelación",
        body: "Las cancelaciones se revisan según la temporada y la anticipación."
      }
    ]
  },
  settings: {
    propertyName: "Los Álamos Tilcara",
    contactEmail: "hola@losalamos.com.ar",
    phone: "+54 9 388 123 4567",
    currency: "ARS - Peso Argentino",
    timezone: "(GMT-03:00) Buenos Aires",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    address: "Tilcara, Jujuy, Argentina"
  }
};
