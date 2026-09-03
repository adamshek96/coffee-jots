# Coffee Jots

A private roasting journal for a home coffee roaster. Local-first: no login, no
accounts, no server, no analytics, no ads. Roasts are tracked by **time, watts,
heat dial, fan, bean color, and sound** — no temperature probe anywhere.

Built with Vite + React + TypeScript, Dexie (IndexedDB), and `vite-plugin-pwa`.
Fonts are self-hosted; the app makes **zero** third-party requests at runtime
and works fully offline once installed.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Use it from your iPhone / iPad on the same wifi

```bash
npm run dev -- --host
```

Vite prints a `Network:` URL (something like `http://192.168.1.23:5173`). Open
that URL in Safari on your phone. To install: tap the share icon →
**Add to Home Screen**. You get a full-screen app with the stamp icon.

> Note: the service worker (offline mode) only activates on `localhost` or
> HTTPS. Over plain `http://192.168.x.x` the app works but won't cache for
> offline — deploy it (below) for the real installable experience.

## Deploy it somewhere free (stable URL to Add to Home Screen)

Any static host works — the build is just files in `dist/`.

**Netlify (simplest):**

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

**Vercel:**

```bash
npm run build
npx vercel --prod
```

**Cloudflare Pages:**

```bash
npm run build
npx wrangler pages deploy dist
```

Each gives you a free `https://…` URL. Open it on your iPhone → share →
**Add to Home Screen**. Because it's HTTPS, the service worker installs and the
app then works fully offline, forever, at that stable URL.

## Profile and lock

Still no accounts and no server. The profile (name, home roastery, photo) is
stored on the device, and the lock is a door on this device only — Face ID /
Touch ID via a WebAuthn passkey, or a salted-hashed passcode. A backup code,
generated once during setup, gets you back in if either fails.

The lock is not encryption: the journal sits unencrypted in IndexedDB, so it
stops someone who picks up your phone, not someone with real access to the
device. It also never engages while a roast is in progress.

## Your data

- Everything lives in IndexedDB on the device (`coffeejots` database).
- **Export backup** on the Home screen writes a JSON file; **Restore** reads
  one back (asks before replacing anything).
- If you used the design prototype before, its `coffeejots.db.v1`
  localStorage journal is imported automatically on first launch.
- The app nudges you to export if you've roasted this week and haven't backed
  up in 7+ days.

## Where things are

```
src/
  db.ts               all Dexie access (tables, migration, persistence)
  store.tsx           app state + the roast state machine (charge → … → drop)
  types.ts            data model
  lib/
    constants.ts      palette, milestones, flavor families, levels, devices
    calc.ts           curve/wheel/stamp geometry, formatting
    cardImage.ts      canvas PNG export for share cards
    wakeLock.ts       keep the screen awake during a live roast
    scan.ts           camera-scan interface (simulated in v1)
  screens/            one file per screen, mirroring the app
```

See [TWEAKING.md](TWEAKING.md) for how to change colors, milestones, flavor
families, roast levels, shades, and analytics without digging.
