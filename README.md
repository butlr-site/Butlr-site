# onebutlr.com — the Butlr public website

Static HTML, deployed by Vercel from `main` (`vercel.json` holds the rewrites and redirects).
No build step: every page is a complete file.

| File | What it is |
|---|---|
| `index.html`, `idea.html`, `app.html`, `venues.html`, `contact.html` | The marketing pages (English). |
| `privacy.html`, `terms.html` | The legal pages the App Store and the portal link to. |
| `hotels.html` → `/hotels`, `hotel.html` → `/hotels/{venue}` | Web booking: both read the portal's public API (`portal.onebutlr.com/api/web-booking/*`). |
| `404.html` | Vercel's not-found page (served at the missing address, so it carries `<base href="/">`). |
| `.well-known/apple-app-site-association` | Universal links for the iOS app (`applinks:onebutlr.com`). |
| `sitemap.xml`, `robots.txt` | Search engines. |
| `butlr-sw.js` | A retired service worker kept as a kill switch: an old page registered it for the whole site (cache first); this version clears its caches and unregisters itself. Never delete it. |
| `preview-web-booking.sh` | Serves `/hotels` locally against a portal on `localhost:3000` (see its header). |

Where the pages send people: **List your venue** → `portal.onebutlr.com/list-your-venue` (the
reviewed application in the portal), **the app** → the App Store, **Contact** → the Web3Forms
inbox form (falls back to a `mailto:` when no key is configured). `/portal/*` redirects to the
portal; the legacy single-file portal under `portal/` is kept only as history and is never served.

House style: titles use a pipe (`Page | Butlr`), copy uses commas (no middle dots, no em dashes).
