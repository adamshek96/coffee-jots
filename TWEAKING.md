# Tweaking Coffee Jots

Everything you're likely to want to change lives in **one file**:
[`src/lib/constants.ts`](src/lib/constants.ts). Edit, save, and the dev server
reloads instantly. After editing, `npm run build` and redeploy.

## The color palette

Top of `constants.ts`, the `C` object:

```ts
export const C = {
  paper: "#D6D1C7",   // app background
  card: "#E6E2D9",    // card background
  ink: "#241D16",     // main text
  muted: "#6B6154",   // secondary text
  hair: "#B7AF9F",    // hairline borders
  olive: "#575618",   // primary buttons
  rust: "#A9613A",    // accent (stars, highlights)
  ...
};
```

Change a hex value and it applies everywhere. The three phase colors (drying /
maillard / development) are just below in `PHASE`. The glowing readout color is
`C.readout` (`#8FB4D6` — the prototype also liked `#9FD6A3` green and
`#E2B458` amber).

## The milestone list

`MS` in `constants.ts`. Each entry is a key, a label, and the hint shown under
the live panel:

```ts
{ key: "fc", label: "First Crack", hint: "first snaps" },
```

You can rename labels and hints freely. Adding/removing milestones works too —
the rail, curve, and logs all follow this list — but keep `charge` first and
`drop` last (they start and end the roast), and add any new key to the `KEYS`
array right above so curves stay in order.

## The flavor families

`FAMILIES` in `constants.ts` — name + wheel color, 8 entries. Rename or
recolor at will. If you add/remove families, also add a two-letter
abbreviation for it in `ABBR` inside `src/lib/calc.ts` (that's what labels the
small wheels).

## The roast levels

`LEVELS` in `constants.ts`, light to dark:

```ts
{ name: "City+", c: "#8E5730" },
```

`light: true` on the pale ones makes their chip text dark instead of white.
Order matters — it's the light-to-dark ramp everywhere.

## The bean-shade swatches

`SHADES` in `constants.ts` — the five color chips you tap during a roast
(Green / Straw / Tan / Brown / Dark). Names and colors are yours to change.
Saved roasts store the *index*, so reordering changes the meaning of old
observations; renaming/recoloring doesn't.

## The evenness diagrams

`EVEN_DOTS` in `constants.ts` — five 3×3 grids of bean colors, patchy to
uniform. Each list is nine hex colors. `EVEN_CAPTIONS` right below holds the
text captions.

## The analytics cards

- The **stat strip on Home**: `statCards` array in
  [`src/screens/Home.tsx`](src/screens/Home.tsx) — each card is
  `{ l: label, v: value, s: subtitle }`. Delete a line to drop a card, add
  your own computed one alongside.
- The **Analytics screen** cards are each a block in
  [`src/screens/Analytics.tsx`](src/screens/Analytics.tsx), in page order:
  totals, roasts per month, phase balance, level spread, ratings, palate
  wheel, bean-by-bean, insights. Each block is self-contained — delete or
  reorder the JSX blocks to taste. The derived insights are built in the
  `insights` array in the same file.

## Your profile and the lock

Both live in the app itself: tap the round avatar button in the top-right of
Home.

- **Profile** — your name, home roastery, and photo. The roastery name replaces
  "Coffee Jots" as the Home title and shows on your lock screen. The photo is
  cropped and shrunk to 256px in the browser and stored on the device; it is
  never uploaded.
- **Lock** — Face ID / Touch ID (a WebAuthn passkey) or a 4–8 digit passcode.
  The passcode is stored as a salted PBKDF2-SHA256 hash, never in plain text.
- **Backup code** — generated once, shown in first-run setup and in your
  profile. It's the way back in if Face ID breaks or you forget the passcode;
  using it removes the lock rather than losing your roasts.

To change how quickly it re-locks, use **Lock again after** in the profile. The
app deliberately never locks while a roast is in progress — see
`roastInProgress()` in [`src/store.tsx`](src/store.tsx) if you want to change
that rule.

What the lock is **not**: it doesn't encrypt anything. Your roasts sit in this
browser's IndexedDB, so someone with real access to the device could still read
them. It stops a person who picks up your phone from opening the app.

## Other knobs

- **Cooling default / heat range / fan layout** — per device, in the app
  itself: Home → device pill → Edit.
- **Ghost-stamp origins** (Passport "still to collect"): `GHOST_ORIGINS` in
  `constants.ts`.
- **Watt stepper sizes & starting watts**: `METRICS` in `constants.ts`
  (`steps: [10, 5]`, `start: 950`).
- **Backup nudge cadence**: the `WEEK` constant at the top of
  `src/screens/Home.tsx`.
- **App icon**: `scripts/make-icons.mjs`, then `npm run icons`.
