# Aspen Admin Desktop

Desktop-only admin dashboard prototype for Aspen Tennis Academy. Vite + React + TypeScript + Tailwind v4.

Pages: Dashboard, Calendar (drag a class to another day), Classes (bulk actions), Bookings (bulk actions, side panel), Players (side panel), Reports, Pricing & payments, Settings. Press Ctrl+K to search.

Demo login: admin@aspentennis.demo / aspen2026 (prototype only, not real security).

## Run it

    npm install
    npm run dev

## Data sharing with the player app

Both apps save their data in the browser's localStorage under the key `aspen-data-v1`.
When this app and the player app are hosted on the same domain (both on mercurydev097-cmyk.github.io),
and open in the same browser, a change made here shows up in the player app and the other way round.
On different domains, or in different browsers, each app has its own copy of the data.
Real sharing between devices needs a backend (for example Supabase).

`src/data/` is a copy of the same data layer used by the player app. Keep the two copies in step if you change it.

## Deploy

Push to the `main` branch of a GitHub repo with Pages set to "GitHub Actions". The workflow in `.github/workflows/deploy.yml` builds and publishes it.
