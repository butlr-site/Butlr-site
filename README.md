# onebutlr.com — the Butlr public website

Static HTML, deployed by Vercel from `main` (`vercel.json` holds the rewrites, redirects and
security headers). No build step: every page is a complete file.

The Content-Security-Policy in `vercel.json` lists every outside host the pages use (Google Fonts,
the portal API, Cloudflare Turnstile). A page that starts loading a script, font, frame or
API from a new host needs that host added there, or the browser blocks it.

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
reviewed application in the portal), **the app** → the App Store, **Contact** → the form posts to
the portal (`portal.onebutlr.com/api/leads/contact`, or `window.BUTLR_API` when set), which saves
the message in God view (Enquiries) and e-mails it to the team; a Turnstile check is drawn when
the portal returns a site key (the same as the booking form). `/portal/*` redirects to the
portal; the legacy single-file portal under `portal/` is kept only as history and is never served.

House style: titles use a pipe (`Page | Butlr`), copy uses commas (no middle dots, no em dashes).

## Arabic (English / العربية)

Every page loads `assets/i18n.js` in its `<head>` (legal pages with `data-ar="legal"`).
Arabic is chosen by `?lang=ar` (shareable link), then the visitor's saved choice
(`localStorage` key `butlr.lang`), then a browser whose first language is Arabic.
The switch (English / العربية) is added to the menu and the footer of every page and
remembers the choice.

In Arabic the page gets `<html lang="ar" dir="rtl">`, each block of text whose English
matches a line in `assets/i18n-ar.js` is replaced (legal pages also load
`assets/i18n-ar-legal.js`, a full translation with a note that the English governs),
and the page's own left/right CSS is mirrored at run time, so there is no second
stylesheet to keep in step. Arabic type is Amiri (headings) and Markazi Text (body) from
Google Fonts, scaled up and limited to Arabic letters, so Latin words keep the site's fonts.
**When you change English copy on a page, change the same key in the Arabic file**, or
that block shows in English on the Arabic page. After changing either file, bump
`DICT_V` in `assets/i18n.js` and the `?v=` on its script tag in every page.
