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
      checkIn: "2026-07-09",
      checkOut: "2026-07-12",
      guests: 2,
      total: 140000,
      status: "pending_payment",
      source: "Booking.com"
    },
    {
      id: "res-01023",
      guestName: "Lucas Fernandez",
      guestEmail: "lucasf@email.com",
      guestPhone: "+54 9 382 334 5678",
      accommodationId: "unit-family",
      accommodationName: "Cabana Familiar",
      checkIn: "2026-07-11",
      checkOut: "2026-07-16",
      guests: 4,
      total: 340000,
      status: "confirmed",
      source: "Airbnb"
    },
    {
      id: "res-01022",
      guestName: "Ana Perez",
      guestEmail: "ana.perez@email.com",
      guestPhone: "+54 9 388 765 4321",
      accommodationId: "unit-triple",
      accommodationName: "Habitacion Triple",
      checkIn: "2026-07-14",
      checkOut: "2026-07-17",
      guests: 3,
      total: 110000,
      status: "verified_pending_payment",
      source: "Expedia"
    },
    {
      id: "res-01020",
      guestName: "Diego Suarez",
      guestEmail: "diego@email.com",
      guestPhone: "+54 9 388 456 7890",
      accommodationId: "unit-loft",
      accommodationName: "Loft con Vista",
      checkIn: "2026-07-18",
      checkOut: "2026-07-23",
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
      checkIn: "2026-07-24",
      checkOut: "2026-07-27",
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
      checkIn: "2026-07-26",
      checkOut: "2026-07-31",
      guests: 4,
      total: 330000,
      status: "completed",
      source: "WhatsApp"
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
      bedrooms: 1,
      beds: "1 cama doble",
      bathrooms: 1,
      price: 90000,
      fromPricePerNight: 90000,
      cleaningFee: 12000,
      image: unitImages.double,
      images: [
        { id: "unit-double-image-1", url: unitImages.double, altText: "Habitacion Doble", sortOrder: 1 }
      ],
      status: "active",
      shortDescription: "Ideal para parejas que buscan tranquilidad y descanso.",
      description: "Habitacion luminosa con cama doble, texturas calidas y acceso comodo a los espacios comunes.",
      amenities: ["Wi-Fi", "Calefaccion", "Patio compartido"],
      highlights: ["Ambiente sereno", "Muy buena para parejas", "Cerca de los espacios comunes"],
      adultPriceRates: [
        { id: "unit-double-rate-1", adults: 1, pricePerNight: 90000, active: true },
        { id: "unit-double-rate-2", adults: 2, pricePerNight: 110000, active: true }
      ],
      details: [
        { label: "Vista", value: "Patio interno" },
        { label: "Ideal para", value: "Escapadas de 2 personas" }
      ]
    },
    {
      id: "unit-triple",
      name: "Habitacion Triple",
      capacity: 3,
      bedrooms: 1,
      beds: "1 cama doble + 1 simple",
      bathrooms: 1,
      price: 110000,
      fromPricePerNight: 110000,
      cleaningFee: 15000,
      image: unitImages.triple,
      images: [
        { id: "unit-triple-image-1", url: unitImages.triple, altText: "Habitacion Triple", sortOrder: 1 }
      ],
      status: "active",
      shortDescription: "Perfecta para amigos o familias pequenas.",
      description: "Unidad funcional con cama principal, cama simple y espacio de guardado para una estadia practica.",
      amenities: ["Wi-Fi", "Calefaccion", "Ropa de cama"],
      highlights: ["Capacidad para 3", "Configuracion flexible", "Buena relacion precio/espacio"],
      adultPriceRates: [
        { id: "unit-triple-rate-1", adults: 1, pricePerNight: 110000, active: true },
        { id: "unit-triple-rate-2", adults: 2, pricePerNight: 130000, active: true },
        { id: "unit-triple-rate-3", adults: 3, pricePerNight: 150000, active: true }
      ],
      details: [
        { label: "Distribucion", value: "Un solo ambiente con cama doble y simple" },
        { label: "Ideal para", value: "Amigos o familia pequena" }
      ]
    },
    {
      id: "unit-family",
      name: "Cabana Familiar",
      capacity: 4,
      bedrooms: 2,
      beds: "2 camas + sofa cama",
      bathrooms: 1,
      price: 150000,
      fromPricePerNight: 150000,
      cleaningFee: 18000,
      image: unitImages.family,
      images: [
        { id: "unit-family-image-1", url: unitImages.family, altText: "Cabana Familiar", sortOrder: 1 }
      ],
      status: "active",
      shortDescription: "Espaciosa y equipada para toda la familia.",
      description: "Cabana amplia con sectores diferenciados, espacio para compartir y salida al exterior.",
      amenities: ["Wi-Fi", "Kitchenette", "Patio", "Estacionamiento"],
      highlights: ["Dos ambientes", "Ideal para familias", "Salida al patio"],
      adultPriceRates: [
        { id: "unit-family-rate-1", adults: 1, pricePerNight: 150000, active: true },
        { id: "unit-family-rate-2", adults: 2, pricePerNight: 175000, active: true },
        { id: "unit-family-rate-3", adults: 3, pricePerNight: 195000, active: true },
        { id: "unit-family-rate-4", adults: 4, pricePerNight: 220000, active: true }
      ],
      details: [
        { label: "Distribucion", value: "Dormitorio mas area social con camas extra" },
        { label: "Ideal para", value: "Familias y grupos de hasta 4 personas" }
      ]
    },
    {
      id: "unit-loft",
      name: "Loft con Vista",
      capacity: 2,
      bedrooms: 1,
      beds: "1 cama doble",
      bathrooms: 1,
      price: 120000,
      fromPricePerNight: 120000,
      cleaningFee: 14000,
      image: unitImages.loft,
      images: [
        { id: "unit-loft-image-1", url: unitImages.loft, altText: "Loft con Vista", sortOrder: 1 }
      ],
      status: "active",
      shortDescription: "Loft amplio con vista a los cerros y balcon.",
      description: "Loft abierto con muy buena luz natural y una vista destacada para una experiencia mas contemplativa.",
      amenities: ["Wi-Fi", "Vista a los cerros", "Balcon"],
      highlights: ["Vista abierta", "Ambiente amplio", "Excelente luz natural"],
      adultPriceRates: [
        { id: "unit-loft-rate-1", adults: 1, pricePerNight: 120000, active: true },
        { id: "unit-loft-rate-2", adults: 2, pricePerNight: 145000, active: true }
      ],
      details: [
        { label: "Vista", value: "Cerros y entorno de Tilcara" },
        { label: "Ideal para", value: "Parejas o viajeros que priorizan visuales" }
      ]
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
      name: "Recepcion",
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
    heroEyebrow: "Hospedaje en Tilcara, Jujuy",
    heroTitle: "Los Alamos Tilcara",
    heroSubtitle: "Un lugar para descansar y conectar con la magia de la Quebrada de Humahuaca.",
    heroImage: propertyImages.hero,
    heroTrustPoints: ["Reserva directa", "Atencion personalizada", "Ubicacion ideal"],
    aboutTitle: "Sobre nosotros",
    aboutBody: "Hospedaje familiar en Tilcara con atencion personalizada y calidez nortena.",
    testimonialsTitle: "Lo que dicen nuestros huespedes",
    locationTitle: "En el corazon de Tilcara",
    policiesTitle: "Politicas",
    faqs: [
      {
        id: "faq-1",
        question: "Cual es el horario de check-in?",
        answer: "El check-in comienza a las 14:00 hs. Si necesitas ingresar antes, consultanos previamente y verificaremos la disponibilidad."
      },
      {
        id: "faq-2",
        question: "Cual es el horario de check-out?",
        answer: "El check-out se realiza hasta las 10:00 hs. Si necesitas extender tu estadia, comunicate con nosotros para evaluar la disponibilidad."
      },
      {
        id: "faq-3",
        question: "Como se confirma una reserva?",
        answer: "Podes solicitar tu reserva desde la web. La misma queda confirmada una vez validado el pago de la sena y recibas nuestra confirmacion por WhatsApp o correo electronico."
      },
      {
        id: "faq-4",
        question: "Que medios de pago aceptan?",
        answer: "Aceptamos transferencias bancarias y otros medios de pago. Consultanos para conocer las opciones disponibles al momento de reservar."
      },
      {
        id: "faq-5",
        question: "Se necesita una sena para reservar?",
        answer: "Si. Para garantizar la reserva solicitamos una sena. El monto y las condiciones seran informados durante el proceso de reserva."
      },
      {
        id: "faq-6",
        question: "Puedo cancelar o modificar mi reserva?",
        answer: "Si, aunque las condiciones dependen de la anticipacion con la que se solicite el cambio. Te recomendamos consultar nuestra politica de cancelacion antes de confirmar la reserva."
      },
      {
        id: "faq-7",
        question: "El desayuno esta incluido?",
        answer: "Si, el desayuno esta incluido cuando asi se indique en la tarifa seleccionada. Si tenes dudas, podes consultarnos antes de reservar."
      },
      {
        id: "faq-8",
        question: "Tienen estacionamiento?",
        answer: "Si, contamos con estacionamiento sujeto a disponibilidad."
      },
      {
        id: "faq-9",
        question: "Aceptan mascotas?",
        answer: "Depende de la unidad y de la disponibilidad. Consultanos antes de realizar la reserva."
      },
      {
        id: "faq-10",
        question: "Hay Wi-Fi?",
        answer: "Si, ofrecemos conexion Wi-Fi gratuita para todos nuestros huespedes."
      },
      {
        id: "faq-11",
        question: "Las habitaciones cuentan con bano privado?",
        answer: "Si, todas nuestras habitaciones disponen de bano privado y las comodidades indicadas en la descripcion."
      },
      {
        id: "faq-12",
        question: "Donde estan ubicados?",
        answer: "Nos encontramos en Tilcara, Jujuy, en una ubicacion ideal para recorrer la Quebrada de Humahuaca y sus principales atractivos."
      },
      {
        id: "faq-13",
        question: "Como puedo comunicarme?",
        answer: "Podes escribirnos por WhatsApp, completar el formulario de contacto de la web o enviarnos un correo electronico. Respondemos lo antes posible."
      },
      {
        id: "faq-14",
        question: "Que lugares turisticos hay cerca?",
        answer: "Desde nuestro alojamiento podras visitar el Pucara de Tilcara, el centro historico, mercados artesanales, senderos y otros atractivos de la Quebrada de Humahuaca."
      },
      {
        id: "faq-15",
        question: "Puedo reservar para grupos o familias?",
        answer: "Si. Contamos con opciones para parejas, familias y grupos. Contactanos para ayudarte a elegir la mejor alternativa."
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
        title: "Cancelacion",
        body: "Las cancelaciones se revisan segun la temporada y la anticipacion."
      }
    ]
  },
  settings: {
    whatsappNumber: "+54 9 388 123 4567",
    propertyName: "Los Alamos Tilcara",
    contactEmail: "hola@losalamos.com.ar",
    phone: "+54 9 388 123 4567",
    instagramUrl: "https://instagram.com/losalamostilcara",
    facebookUrl: "https://facebook.com/losalamostilcara",
    googleReviewsUrl: "https://www.google.com/search?q=Los+Alamos+Tilcara",
    googleMapsUrl: "https://www.google.com/maps/place/Alverro+157,+Y4624+Tilcara,+Jujuy",
    currency: "ARS - Peso Argentino",
    timezone: "(GMT-03:00) Buenos Aires",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    depositPercentage: 10,
    address: "Alverro 157, Y4624 Tilcara, Jujuy",
    city: "Tilcara",
    region: "Jujuy, Argentina"
  }
};
