# Amanah Finance — React

React 19 + TypeScript + Vite + React Router + Tailwind CSS v4. Arabic RTL interface.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Architecture
- `src/app`: application entry and routes
- `src/layouts`: shared dashboard shell
- `src/pages`: page-level screens, grouped by feature
- `src/components`: reusable UI components
- `src/data`: temporary mock data
- `src/types`: shared TypeScript types
- `src/styles`: shared layout styling

Routes: `/dashboard`, `/members`, `/payments`, `/reports`, `/settings`.
All displayed records are sample data; API/database persistence is not connected yet.
