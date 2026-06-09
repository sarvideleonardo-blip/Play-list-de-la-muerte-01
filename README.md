# Playlist de la Muerte

Aplicación web (React + Vite + Supabase) para crear y publicar un legado musical.

## Qué sigue (checklist de producción)

1. **Variables de entorno**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Supabase Auth (clave para que llegue el magic link)**
   - Auth > Providers > **Email**: habilitado.
   - Auth > URL Configuration:
     - Site URL: tu dominio real.
     - Redirect URLs: incluye tu dominio local y producción.
   - Si usas SMTP propio: revisa credenciales, dominio remitente y SPF/DKIM.
   - Auth > Settings: **Enable email signups** habilitado.

3. **Base de datos y políticas**
   - Ejecutar `supabase/rls_policies.sql` en el SQL Editor de Supabase.

4. **Functions**
   - Desplegar la función `activate` (la app llama `/functions/v1/activate`).

5. **Pruebas mínimas**
   - Registro con correo real (inbox + spam/promociones).
   - Alta de 30 canciones, guardado de mensaje final y activación con código.
   - Si no llega correo: revisar Auth > Logs en Supabase para ver rate-limit, proveedor o SMTP.

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
