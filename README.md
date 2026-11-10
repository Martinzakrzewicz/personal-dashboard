# Personal Dashboard

A single-user, multi-context productivity dashboard built as an installable Progressive Web App. Every life context lives in an isolated **Space** (University, Sports, Family & Friends, Personal by default). Data lives locally in IndexedDB, with optional end-to-end encrypted sync between devices through a secret GitHub Gist. There is no custom backend, account system or tracking.

## Live app and deployment

- **Live app:** <https://martinzakrzewicz.github.io/personal-dashboard/>
- **Git repository:** <https://github.com/Martinzakrzewicz/personal-dashboard>

The app is hosted for free on GitHub Pages and is tied to the `main` branch. Every push to `main` runs `.github/workflows/deploy.yml`, which:

1. installs dependencies with `npm ci`;
2. runs the test suite, typecheck and lint;
3. builds with the repository subpath as Vite base;
4. publishes `dist/` to GitHub Pages.

So the normal workflow is simply:

```bash
git add .
git commit -m "your change"
git push
```

The workflow takes about a minute; refresh the live URL afterwards. If a test, typecheck or lint step fails, the deployment is stopped, so the live app keeps the last successful version.

The repository is public (it contains no secrets or user data). The Pages site is served over HTTPS, which means PWA installation and offline mode work on iPhone Safari.

## Stack

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS with CSS-variable theming (light/dark, follows the system by default)
- Zustand for the active-space store
- Dexie.js for IndexedDB (schema version 1)
- Zod for block config and backup validation
- react-i18next (English default, Spanish)
- vite-plugin-pwa for the manifest + precached service worker
- lucide-react icons
- Vitest + React Testing Library

## Run locally

Requirements: Node.js 20+ and npm.

```bash
cd personal-dashboard
npm install
npm run dev
```

Open <http://localhost:5173>.

Other scripts:

```bash
npm test        # Vitest run
npm run typecheck
npm run lint
npm run build   # type-check + production build to dist/
npm run preview # serve the production build
npm run icons   # regenerate placeholder PWA icons
```

## The 3-second capture

- Press **N** anywhere (outside an input) to focus the capture bar.
- Type a task and press **Enter**. The field clears and keeps focus for the next task.
- Append `!1` (critical), `!2` (high), `!3` (medium) or `!4` (low) to set importance. Without a token the task is medium.
- Tasks are created optimistically and rolled back with an error toast if IndexedDB rejects the write.

The capture bar is pinned to the bottom on phones and to the top of the workspace on desktop.

## Focus views (layout depth)

Each Tasks, Calendar and Notes block has a **maximize** button in its header. It opens a full-screen focus view with a back button and a space filter:

- **All tasks** — every task from every space, grouped by urgency, with a colored space badge on each row. Low-priority and completed sections keep their collapse controls; tasks can be edited, completed or deleted across spaces.
- **All calendars** — a Google-Calendar-style view with **Month**, **Week** and **Day** modes, previous/next/today navigation, Monday-first month grid, colored event chips, and collapsible overdue/unscheduled task lists. Data is aggregated across all spaces. Clicking a month cell opens that day; clicking a task opens its edit sheet.
- **All notes** — every non-empty note, grouped by space, editable inline with the same 500 ms autosave as the dashboard block.

On the normal dashboard, the Calendar block is now a **rolling-week summary**: it always starts on today (if today is Tuesday, it shows Tuesday through Monday) and only shows tasks and milestones from the active space. Items outside that rolling week remain available in the expanded calendar.

The cross-space views use a dedicated read model (`src/db/overview.repo.ts`) that calls the existing space-scoped repositories once per space. There is still no unfiltered repository query.

Task checkboxes were reduced to a 22 px visible marker inside a 44 px touch target, keeping the rows cleaner without hurting accessibility.

## Cross-device sync (computer ↔ phone)

Sync is optional and uses **one secret GitHub Gist per user** as free encrypted storage. No additional backend, subscription or database is required.

### One-time setup

1. Open **Settings → Sync between devices** on the computer.
2. Create a **classic GitHub token with only the `gist` scope**:
   <https://github.com/settings/tokens/new?scopes=gist&description=Personal%20Dashboard%20Sync>
3. Paste the token into Settings and press **Create encrypted sync**.
4. Copy the generated **sync code** (`pds1.…`). It contains the AES-256 encryption key.
5. On the phone, open the same live URL → **Settings → Sync between devices → Join existing**.
6. Paste the same token and sync code, then press **Join sync**. The phone pulls the current data.

After that, changes sync automatically while the app is open:

- local changes push after a 2-second debounce;
- pulls happen on focus, when the tab becomes visible, every 30 seconds, and with the manual **Sync now** button;
- deletes use tombstones so a removed task is not resurrected by another device.

### Security and limitations

- The Gist is secret/unlisted, and its contents are encrypted with AES-GCM before leaving the device. GitHub only stores ciphertext.
- The token is stored only in that browser's `localStorage`; it is never written into the repository, the Gist, or exported backups.
- The sync code contains the decryption key. Treat it like a password.
- Merge is per-record, newest `updatedAt` wins. If both devices edit offline at the same time, the next sync converges, but there is no visual conflict-resolution UI yet.
- The app remains fully usable offline; sync simply waits until a connection is available.
- If you revoke/delete the token, create a new one and reconnect on each device.

## Using it on an iPhone (same Wi-Fi)

1. Start the dev server with the host flag: `npm run dev:host`.
2. Find your Mac's local IP, for example `ipconfig getifaddr en0`.
3. On the iPhone (same Wi-Fi), open `http://<YOUR-IP>:5173` in Safari.

Data capture, editing and IndexedDB work over this plain-HTTP address, but **service workers require a secure context**. That means installation as a PWA and offline support will be unavailable on a plain LAN IP. Browsers treat `localhost` as secure, so desktop development is unaffected.

### Recommended: Tailscale HTTPS (free for personal use)

Tailscale gives your own devices a private HTTPS address without exposing the app to the public internet. This is the simplest free way to get PWA installation and offline support on iPhone.

1. Install Tailscale on the Mac and on the iPhone, sign both into the same tailnet, and enable **MagicDNS** and **HTTPS certificates** in the Tailscale admin console.
2. Keep the dashboard running on the Mac (`npm run dev` or `npm run preview -- --host`).
3. From the Mac, serve the local port over HTTPS with Tailscale Serve, for example:
   ```bash
   tailscale serve --bg http://localhost:5173
   ```
   (For the production preview, use the preview port, usually `4173`.)
4. On the iPhone, open the HTTPS `*.ts.net` address shown by `tailscale serve status`.
5. In Safari: **Share → Add to Home Screen**.

Tailscale terminates HTTPS for you; the certificate is trusted by the iPhone because both devices are in your tailnet.

## Install as a PWA

- **iPhone / iPad:** open the HTTPS address in Safari → Share → Add to Home Screen. Launch from the new icon for standalone mode.
- **Desktop Chrome/Edge:** use the install icon in the address bar, or the browser menu → Install Personal Dashboard.
- **Desktop Safari:** File → Add to Dock (macOS Sonoma+).

The service worker precaches the app shell, so after the first successful load the app opens offline. IndexedDB data is already local.

The manifest uses placeholder icons at `public/pwa-192x192.png`, `public/pwa-512x512.png` and `public/apple-touch-icon.png`. They are generated programmatically by `npm run icons` (a small dependency-free PNG encoder in `scripts/generate-icons.mjs`), so no binary assets need to be sourced before launch. Replace them later with branded artwork if desired.

## Backup: export and import

All data is local to the browser profile. Clearing site data removes it, so export periodically.

1. Open **Settings** (gear icon in the sidebar / top-right on mobile).
2. **Export backup** downloads a single JSON file containing every table plus `format` and `version` fields.
3. **Import backup** opens a file picker. The file is validated with Zod and must have the format `personal-dashboard-backup`.
4. A confirmation dialog explains that importing **replaces all data** on this device (spaces, tasks, milestones, blocks and settings). The replacement happens in one IndexedDB transaction.

Files with an unknown format or invalid records are rejected without touching existing data.

## Data model and architecture

```
src/
  app/         Zustand store, toast store
  features/    spaces, tasks, milestones, blocks, capture, settings, overview, sync
  db/          Dexie database, typed repositories, seed, backup, cross-space read model
  i18n/        i18next setup + en/es locale files
  lib/         UUID, dates, classnames, deletion log
  components/ui/  shared buttons, dialogs, fields, toasts, full-screen view
  test/        Vitest setup (fake-indexeddb + jest-dom + Web Crypto)
```

- Every task, milestone and block repository function requires a `spaceId`; there is no unfiltered task query. The "all spaces" views aggregate results from those scoped calls.
- Spaces are only ever soft-deleted (`archived = true`). Restore them from Settings.
- Sync payloads are built from the existing backup format, encrypted client-side, and merged record-by-record. Deletions are tracked separately in a local deletion log so they survive merges.
- Deleting a task clears `linkedTaskId` on related milestones; deleting a milestone clears `milestoneId` on related tasks.
- Switching spaces clears the store synchronously before loading the next space, applies its color as `--space-accent`, and persists the last active space in the `meta` table.
- The block renderer is generic. A new block type requires a definition in `src/features/blocks/definitions.ts` and a component entry in `src/features/blocks/registry.ts` — no renderer changes. Each definition carries its Zod schema, version, default config, migration function, display-name key and `multiInstance` flag.
- `notes` intentionally ships at config version 2 with a v1→v2 migrator (`content` → `text`), exercised by tests, so the migration path is real rather than theoretical.
- The `calendar` config also moved to v2: the old 7/14-day window becomes a fixed rolling 7-day week, and existing blocks are migrated and saved automatically on load.

## Tests

```bash
npm test
```

Coverage includes:

- space-scoped task isolation, including after archiving a space;
- cross-space read/update rejection;
- task delete clearing milestone links;
- parser tokens, empty/token-only input, long titles;
- ordering with null dates, equal dates, orderIndex tie-breaks;
- backup export → import round-trip equality and unknown-format rejection;
- store space-switch clearing (no previous-space data even momentarily);
- task zone rendering order, collapsed low/completed sections, keyboard edit;
- block registry shape, single/multi-instance rules, and a v1→v2 notes migration;
- layout persistence across a database reload;
- Monday-first 42-cell month grids and rolling Tuesday→Monday weeks;
- calendar config v1→v2 migration;
- cross-space aggregation and archived-space exclusion;
- encrypted sync round trips, sync-code parsing, per-record merge, deletion tombstones, and create/join/push orchestration against a mocked Gist API.

## V1 limitations

- Sync requires a one-time GitHub token with `gist` scope on each device; there is no managed account system.
- Sync is not realtime second-by-second; it uses debounced pushes and periodic/focus pulls.
- No visual conflict-resolution UI (newest record wins).
- No drag-and-drop layout editing (buttons only, by design for V1).
- No hard delete for spaces.
- Backups are manual JSON files.

## Suggested V2

1. **Zero-setup sync** — move the encrypted sync payload to a managed backend (Supabase/Cloudflare D1 or a small self-hosted server), add realtime updates and a proper conflict-resolution UI. Keep the current Gist provider as an offline-friendly free fallback.
2. **Block-level polish** — drag-and-drop grid resizing, month calendar, recurring tasks/milestones, and web push reminders.
3. **Smarter capture** — natural-language dates ("tomorrow 5pm", "fri"), voice input on iOS, and quick-capture from a PWA share target.
