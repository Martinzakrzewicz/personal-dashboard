# Personal Dashboard

A single-user, multi-context productivity dashboard built as an installable Progressive Web App. Every life context lives in an isolated **Space** (University, Sports, Family & Friends, Personal by default). Data lives entirely in the browser in IndexedDB — no backend, no account, no tracking.

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
  app/        Zustand store, toast store
  features/   spaces, tasks, milestones, blocks, capture, settings
  db/         Dexie database, typed repositories, seed, backup
  i18n/       i18next setup + en/es locale files
  lib/        UUID, date helpers, classnames
  components/ui/  shared buttons, dialogs, fields, toasts
  test/       Vitest setup (fake-indexeddb + jest-dom)
```

- Every task, milestone and block repository function requires a `spaceId`; there is no unfiltered task query.
- Spaces are only ever soft-deleted (`archived = true`). Restore them from Settings.
- Deleting a task clears `linkedTaskId` on related milestones; deleting a milestone clears `milestoneId` on related tasks.
- Switching spaces clears the store synchronously before loading the next space, applies its color as `--space-accent`, and persists the last active space in the `meta` table.
- The block renderer is generic. A new block type requires a definition in `src/features/blocks/definitions.ts` and a component entry in `src/features/blocks/registry.ts` — no renderer changes. Each definition carries its Zod schema, version, default config, migration function, display-name key and `multiInstance` flag.
- `notes` intentionally ships at config version 2 with a v1→v2 migrator (`content` → `text`), exercised by tests, so the migration path is real rather than theoretical.

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
- layout persistence across a database reload.

## V1 limitations

- Single device, single user. No authentication, server or sync.
- No drag-and-drop layout editing (buttons only, by design for V1).
- No hard delete for spaces.
- Backups are manual JSON files.

## Suggested V2

1. **Sync between devices** — add end-to-end encrypted sync (for example Supabase/Postgres with row-level security, or a small self-hosted server) keyed on the already-present `userId`, `createdAt`/`updatedAt` fields. Implement last-write-wins with tombstones for deletes.
2. **Block-level polish** — drag-and-drop grid resizing, a proper calendar month view, and recurring tasks/milestones.
3. **Smarter capture** — natural-language dates ("tomorrow 5pm", "fri"), voice input on iOS, and quick-capture from a PWA share target.
