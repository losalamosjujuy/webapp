# Pruebas de OTP y Mercado Pago

## Objetivo
Probar el flujo completo de reserva sin cobrar dinero real:

1. la web inicia la solicitud
2. se envía OTP por Resend
3. se valida el OTP
4. se genera checkout de Mercado Pago en modo demo

## Variables necesarias

Configurar en `.env.local`:

```env
RESEND_API_KEY=tu-api-key-de-resend
RESERVATION_OTP_FROM_EMAIL=onboarding@resend.dev
RESERVATION_OTP_REPLY_TO_EMAIL=losalamosjujuy@gmail.com
RESERVATION_OTP_TEST_RECIPIENT_EMAIL=losalamosjujuy@gmail.com

MERCADO_PAGO_ACCESS_TOKEN=tu-access-token-de-prueba
MERCADO_PAGO_WEBHOOK_SECRET=tu-webhook-secret-de-prueba
MERCADO_PAGO_USE_SANDBOX=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Comportamiento de prueba implementado

- Si `RESERVATION_OTP_TEST_RECIPIENT_EMAIL` está definido y la app no corre en `production`, todos los OTP se redirigen a ese email.
- El cuerpo del email deja visible cuál era el destinatario original.
- Si `MERCADO_PAGO_USE_SANDBOX=true`, el checkout prioriza `sandbox_init_point`.

## Resend

Para pruebas básicas podés usar:

- `from`: `onboarding@resend.dev`
- `to`: `losalamosjujuy@gmail.com`

Eso permite validar el envío sin montar todavía un dominio propio.

## Mercado Pago demo

Usar siempre credenciales de prueba.

Flujo recomendado:

1. crear una cuenta vendedor de prueba en Mercado Pago
2. obtener `ACCESS_TOKEN` de prueba
3. generar una cuenta compradora de prueba
4. iniciar una reserva desde la web
5. validar el OTP recibido
6. entrar al checkout demo y pagar con usuario/tarjeta de prueba

## Validación manual mínima

1. Completar formulario de reserva.
2. Confirmar que llega el OTP a `losalamosjujuy@gmail.com`.
3. Ingresar el código OTP.
4. Confirmar redirección a checkout demo de Mercado Pago.
5. Completar pago de prueba.
6. Verificar webhook y transición de estados en admin.

## Seguridad

- No guardar `RESEND_API_KEY` en archivos versionados.
- No usar credenciales reales de Mercado Pago para pruebas.
- Si una API key ya fue compartida por chat o fuera de un secret manager, conviene rotarla.
