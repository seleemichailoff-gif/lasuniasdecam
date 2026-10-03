# Las Uñas de Cam

Sitio estático con galería administrable mediante Supabase.

## Rutas
- `/` sitio público
- `/admin.html` panel privado

## Backend
Usa el proyecto Supabase existente `alquileres-mar-del-tuyu`, pero con tablas y bucket separados (`cam_gallery`, `cam_site_settings`, `cam-gallery`).

## Acceso admin
El panel usa Supabase Auth y comprueba que el email autenticado exista en `public.admin_users`.

Para habilitar a una cuenta, agregá su email a `admin_users` desde Supabase SQL Editor:
```sql
insert into public.admin_users(email) values ('EMAIL_DE_LA_CUENTA');
```
Luego esa cuenta debe existir en Supabase Auth con contraseña.
