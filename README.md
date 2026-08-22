# Gestor de Gastos

Aplicación web para organizar gastos personales y compartidos de forma simple.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase

## Requisitos

- Una versión de Node compatible con la restricción definida en `package.json`
- npm

## Desarrollo local

```bash
npm install
npm run dev
```

## Variables de entorno

Crear un archivo `.env.local` con las variables públicas del proyecto de Supabase, sin versionar sus valores:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Build

```bash
npm run build
```

## Base de datos

Las migraciones de PostgreSQL y Supabase se encuentran en `supabase/migrations/`.

## Deploy

El frontend está preparado para desplegarse como una SPA en Vercel. La configuración de Vercel debe incluir las variables de entorno indicadas anteriormente.
