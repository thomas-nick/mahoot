This is a clean and simple Next.js frontend for the Strapi disc golf catalog.

## Getting Started

1. Create local env values:

```bash
cp .env.example .env.local
```

2. Make sure Strapi is running on `http://localhost:1337`.

3. Run the frontend:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## App Pages

- `/` Home overview with catalog totals.
- `/discs` Disc listing with simple search/filter + pagination.
- `/courses` Course listing with simple search/filter + pagination.
- `/discs/[documentId]` Disc detail page.
- `/courses/[documentId]` Course detail page.

## Notes

- Data is fetched from Strapi REST endpoints (`/api/discs`, `/api/courses`).
- For private APIs, provide `STRAPI_API_TOKEN`.
- **Instant search** uses Typesense via `GET /api/search` (same env vars as your Strapi Typesense sync). Copy `TYPESENSE_*` from the backend `.env` into `frontend/.env.local`. Reindex in the backend if collections are empty: `npm run reindex:typesense`.
- **OAuth (Google)**:
  - Set `NEXT_PUBLIC_APP_URL` in `frontend/.env.local` to your public app URL (e.g. `http://127.0.0.1:3000`).
  - In Strapi Users & Permissions → Google, configure the front-end redirect to `/auth/callback` (provider is saved in session during the flow).
  - Enable Google in Strapi and set the OAuth client ID / secret.
