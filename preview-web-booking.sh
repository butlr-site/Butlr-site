#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Preview onebutlr.com web booking WITHOUT deploying anything.
#
# Serves hotels.html / hotel.html locally, pointed at a portal running
# on http://localhost:3000 (start that first — see below). Recreates the
# /hotels and /hotels/{slug} rewrites that vercel.json provides in prod.
#
#   Terminal 1:  cd butlr-portal
#                NEXT_PUBLIC_MARKETING_ORIGIN=http://localhost:8080 npm run dev
#   Terminal 2:  bash butlr-site/preview-web-booking.sh
#   Browser:     http://localhost:8080/hotels
#
# NOTE: your local portal uses .env.local → the REAL database. Bookings
# you make in preview are real records (and real emails fire) — book
# with your own email, and the booking lands on the real /reservations
# board, which is itself part of the test.
# ─────────────────────────────────────────────────────────────────────
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST=/tmp/butlr-web-preview
rm -rf "$DEST"; mkdir -p "$DEST"
cp "$SRC/hotels.html" "$SRC/hotel.html" "$DEST/"
[ -d "$SRC/assets" ] && cp -R "$SRC/assets" "$DEST/assets"
for f in favicon.svg favicon.ico; do [ -f "$SRC/$f" ] && cp "$SRC/$f" "$DEST/"; done

# Point both pages at the local portal instead of portal.onebutlr.com.
for f in hotels.html hotel.html; do
  if sed --version >/dev/null 2>&1; then
    sed -i 's|<head>|<head><script>window.BUTLR_API="http://localhost:3000";</script>|' "$DEST/$f"
  else
    sed -i '' 's|<head>|<head><script>window.BUTLR_API="http://localhost:3000";</script>|' "$DEST/$f"
  fi
done

# Recreate vercel.json's rewrites for the local server.
cat > "$DEST/serve.json" <<'JSON'
{ "rewrites": [
  { "source": "/hotels", "destination": "/hotels.html" },
  { "source": "/hotels/:slug", "destination": "/hotel.html" }
]}
JSON

echo ""
echo "  Preview → http://localhost:8080/hotels"
echo "  (portal must be running on :3000 — see comment at the top of this script)"
echo ""
npx --yes serve -l 8080 "$DEST"
