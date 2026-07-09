# Operacion Admin y Carga de Datos

## Objetivo
Esta guia explica como cargar y mantener la informacion del alojamiento para que:

- la web publica muestre contenido correcto
- las consultas y reservas entren bien
- las capacidades, montos y disponibilidad sean consistentes
- las metricas del panel puedan calcularse sobre datos reales

## Estado actual del sistema

### Ya conectado a Supabase
- web publica
- disponibilidad publica
- solicitudes de reserva
- consultas publicas
- contenido publico leido desde `site_settings`, `pages_content`, `faqs`, `testimonials`, `units`, `unit_images`, `amenities`, `unit_amenities`

### Aun no conectado completamente a Supabase
- CRUD persistente del panel admin visual
- metricas reales de dashboard
- calendario admin confiable
- grafico de ingresos real
- carga de galeria, precios y bloques desde el admin hacia DB

Mientras eso no se corrija, el admin visual sigue mezclando datos demo y calculos hardcodeados.

## Flujo correcto de carga de informacion

### 1. Configuracion general
Completar y mantener en `site_settings`:

- `contact`
  - `whatsappNumber`
  - `phone`
  - `email`
  - `instagramUrl`
  - `facebookUrl`
- `location`
  - `address`
  - `city`
  - `region`
  - `coordinates.lat`
  - `coordinates.lng`
- `reviews`
  - `googleReviewsUrl`
  - `googleMapsUrl`
- `general`
  - `propertyName`
  - `currency`
  - `timezone`
  - `checkInTime`
  - `checkOutTime`

Regla: estos datos deben ser la fuente unica de contacto y ubicacion.

### 2. Unidades / alojamientos
Cada unidad debe tener:

- `name`
- `slug` unico
- `short_description`
- `description`
- `max_guests`
- `bedrooms`
- `beds`
- `bathrooms`
- `base_price_per_night`
- `cleaning_fee`
- `active`

Ademas:

- al menos una fila en `unit_images`
- amenities relacionadas en `unit_amenities`

Reglas de consistencia:

- `max_guests` debe coincidir con la capacidad comercial real
- `beds` debe ser descriptivo para que no haya ambiguedad en ventas
- nunca dejar una unidad activa sin imagen principal

### 3. Disponibilidad real
La disponibilidad se construye con:

- `reservations`
- `availability_blocks`

Regla operativa:

- usar `reservations.status = confirmed` para estadias tomadas
- usar `availability_blocks` para mantenimiento, uso interno o cierres
- no usar reservas pendientes para bloquear calendario operativo hasta confirmar

### 4. Tarifas y montos
Hoy la reserva publica toma:

- `base_price_per_night`
- `cleaning_fee`

Calculo actual:

- `nights = check_out - check_in`
- `subtotal = nights * base_price_per_night`
- `total = subtotal + cleaning_fee`

Si quieren tarifas variables por temporada:

- cargar temporadas en `price_seasons`
- luego hay que implementar que la reserva use esa tabla en vez de `base_price_per_night` fijo

Mientras eso no exista:

- el precio real operativo tiene que vivir en `units.base_price_per_night`

### 5. Reservas
Cada reserva valida necesita:

- `guest_id`
- `unit_id`
- `reservation_code`
- `check_in`
- `check_out`
- `adults`
- `children`
- `nights`
- `subtotal`
- `cleaning_fee`
- `total_amount`
- `status`

Estados recomendados:

- `pending`: solicitud recibida, no bloquear operacion comercial
- `confirmed`: reserva tomada, debe bloquear disponibilidad
- `rejected`
- `canceled`
- `completed`
- `no_show`

Regla: si una reserva se confirma, el monto total tiene que cerrarse antes de la fecha de check-in.

### 6. Consultas
Las consultas publicas entran en `inquiries`.

Campos minimos:

- `full_name`
- `phone`
- `email`
- `message`
- `source`
- `status`

Estados recomendados:

- `new`
- `contacted`
- `converted`
- `closed`

Regla: cuando una consulta termina en reserva real, actualizar `status` a `converted`.

### 7. Contenido publico
Fuente de contenido:

- `pages_content`
- `faqs`
- `testimonials`

Regla:

- usar `pages_content` para bloques estructurados del home
- usar `faqs` para preguntas editables y ordenables
- usar `testimonials` solo con contenido aprobado para publicar

## Como mantener metricas reales

Para que las metricas sean confiables, el sistema debe respetar estas reglas:

### Reservas del mes
Fuente:

- `reservations.created_at`

Condicion:

- contar solo reservas creadas desde el primer dia del mes actual

### Pendientes
Fuente:

- `reservations.status = pending`

### Proximas confirmadas
Fuente:

- `reservations.status = confirmed`
- `check_in >= hoy`

### Ocupacion
Fuente real recomendada:

- noches confirmadas / noches disponibles del periodo

Formula recomendada:

- `sum(nights confirmadas dentro del rango) / (cantidad_unidades_activas * dias_del_rango)`

### Ingresos
Fuente real recomendada:

- `sum(total_amount)` de reservas confirmadas

Separar siempre:

- ingresos futuros confirmados
- ingresos cobrados
- ingresos del periodo

### Huespedes
Fuente real recomendada:

- contar huespedes unicos con reservas

No usar una tabla manual de huespedes desacoplada si no se sincroniza con reservas.

## Problemas actuales detectados en el calendario y metricas

### Calendario admin
- usa fecha base fija
- muestra un titulo de mes fijo
- colorea como reservadas reservas que no deberian bloquear
- no diferencia visualmente estados
- puede desbordar columnas porque la grilla hardcodea 7 dias aunque el componente reciba otro valor

### Dashboard
- `occupancyPercentage` esta hardcodeado
- el helper visual `+12% vs. semana pasada` es falso
- el grafico de ingresos es decorativo
- el ingreso mostrado no esta filtrado por rango real de 7 dias

## Procedimiento recomendado para dejar todo listo antes de pruebas

### Paso 1
Ejecutar migraciones y seed en Supabase.

### Paso 2
Verificar en DB:

- unidades activas
- imagen principal por unidad
- amenities correctamente relacionadas
- settings de contacto y ubicacion

### Paso 3
Cargar bloques reales de mantenimiento y cierres.

### Paso 4
Crear reservas de prueba con distintos estados:

- pending
- confirmed
- canceled
- completed

### Paso 5
Ejecutar pruebas publicas:

- consulta de disponibilidad
- solicitud de reserva
- consulta general
- links a maps, reviews y whatsapp

### Paso 6
Corregir admin:

- calendario contra reservas confirmadas y bloqueos reales
- metricas contra DB
- ingresos por periodo real
- capacidades y precios desde tablas reales

## Checklist operativo para el admin

- cada unidad activa tiene imagen
- cada unidad activa tiene capacidad correcta
- cada unidad activa tiene precio base correcto
- cada bloqueo tiene motivo y rango valido
- cada reserva confirmada tiene total_amount correcto
- no hay reservas con `check_out <= check_in`
- las consultas nuevas se atienden y actualizan de estado
- Google Maps, Reviews, telefono y WhatsApp apuntan a datos reales

## Proximo trabajo recomendado

1. Conectar el panel admin visual a Supabase.
2. Rehacer el calendario admin usando reservas confirmadas + bloqueos reales.
3. Calcular metricas desde DB por rango de fechas.
4. Implementar precios por temporada en reservas.
5. Agregar auditoria de cambios para reservas, bloques, tarifas y contenido.
