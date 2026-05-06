# Instrucciones de despliegue en Render (gratis)

## Paso 1: Crear el bot de Telegram

1. Abre Telegram y busca `@BotFather`
2. Envía `/newbot` y sigue las instrucciones
3. Copia el **token** que te da (algo como `123456:ABC-DEF...`)
4. Busca tu bot, envíale un mensaje cualquiera (ej: "hola")
5. Abre esta URL en el navegador para obtener tu chat ID:
   ```
   https://api.telegram.org/bot<TU_TOKEN>/getUpdates
   ```
   Busca `"chat":{"id":123456789}` — ese número es tu `TELEGRAM_USER_IDS`

## Paso 2: Clave de noticias (gratis)

1. Ve a https://newsapi.org/register
2. Crea cuenta gratis con Google
3. Copia tu API key de la sección "Account"

## Paso 3: Google Calendar API

1. Ve a https://console.cloud.google.com
2. Crea un proyecto nuevo
3. Activa la **Google Calendar API**
4. Ve a "Credentials" > "Create Credentials" > "Service Account"
5. Crea una nueva service account
6. Ve a la service account creada > "Keys" > "Add Key" > "Create new key" > JSON
7. Se descargará un JSON — **esos son tus datos de Google**:
   - `project_id` → `GOOGLE_PROJECT_ID`
   - `private_key_id` → `GOOGLE_PRIVATE_KEY_ID`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
   - `client_email` → `GOOGLE_CLIENT_EMAIL`
   - `client_id` → `GOOGLE_CLIENT_ID`
8. **Importante:** Abre el calendario en Google Calendar, ve a "Settings and sharing" > "Share with specific people" y añade el email de la service account con permiso "See all event details"

## Paso 4: Apple Mail (iCloud)

1. Ve a https://appleid.apple.com
2. Inicia sesión > Security > App-Specific Passwords
3. Genera una nueva contraseña de app
4. Tu email de iCloud es el `EMAIL_USER` y la contraseña generada es `EMAIL_APP_PASSWORD`

## Paso 5: Desplegar en Render

1. Sube este proyecto a GitHub (push a un repo nuevo)
2. Ve a https://render.com y crea cuenta
3. Dashboard > "New +" > "Blueprint"
4. Conecta tu repo de GitHub
5. Render leerá el `render.yaml` automáticamente
6. Rellena todas las variables de entorno en la sección "Environment" del servicio
7. Click en "Apply" y espera a que despliegue (~2 min)

## Paso 6: Verificar

Envía `/start` a tu bot en Telegram. Debería responder con el mensaje de bienvenida.
Usa `/status` para pedir tu resumen del día manualmente.

A las 6:10 AM de tu zona horaria recibirás el resumen automáticamente.

---

## Estructura de variables de entorno

| Variable | Ejemplo | Requerida |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-DEF...` | Sí |
| `TELEGRAM_USER_IDS` | `123456789,987654321` | Sí |
| `NEWSAPI_KEY` | `abc123def456` | No (sin ella no hay noticias) |
| `GOOGLE_PROJECT_ID` | `my-project-123` | No (sin ella no hay tareas) |
| `GOOGLE_PRIVATE_KEY_ID` | `abc123` | No |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN RSA...` | No |
| `GOOGLE_CLIENT_EMAIL` | `name@project.iam...` | No |
| `GOOGLE_CLIENT_ID` | `123456789` | No |
| `EMAIL_USER` | `tu@icloud.com` | No (sin ello no hay emails) |
| `EMAIL_APP_PASSWORD` | `abcd-efgh-ijkl` | No |
| `EMAIL_HOST` | `imap.mail.me.com` | No |
| `EMAIL_PORT` | `993` | No |
| `WHATSAPP_PHONE_NUMBER_ID` | `123456789` | No |
| `WHATSAPP_ACCESS_TOKEN` | `EAA...` | No |
