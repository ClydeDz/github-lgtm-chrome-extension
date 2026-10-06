# AGENTS.md

Guidance for AI agents (and humans) working in this repository.

## Project overview

**GitHub LGTM** is a Chrome extension (Manifest V3). When a user clicks **Approve** on a GitHub pull request, the extension fills the review comment box with a randomly chosen pre-defined message (e.g. `"Ship it! 🚢"`), so the user never has to type an approval comment.

- The list of messages is editable on the extension's options page (add / edit / remove).
- The extension always picks **one message at random** from the saved list.
- `chrome.storage.sync` is the extension's **only** persistent storage — there is no backend, no localStorage and no IndexedDB.
- Plain JavaScript throughout: no framework, no TypeScript, no linter/formatter.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies (CI uses this; use `npm install` only if adding a package) |
| `npm run build` | Webpack in watch mode (development) |
| `npm run build:prod` | One-off production build into `dist/` |
| `npm test` | Run Jest once |
| `npm run test:ci` | Jest with coverage + JUnit report (`src/tests/junit.xml`) — what CI runs |

Node 20+ (CI pins Node 20; currently developed on Node 22).

## Repository layout

```
├── AGENTS.md
├── README.md                 # Mirrors docs/README.md — keep both identical
├── webpack.config.js         # Bundles src/scripts/index.js → dist/index.js and
│                             #   src/scripts/options.js → dist/options.js, and
│                             #   copies src/manifest.json, src/options.html and src/icons/*
├── src/
│   ├── manifest.json         # MV3 manifest: content script, "storage" permission, options page
│   ├── options.html          # Options page markup + inline styles
│   ├── icons/                # icon16/48/128.png
│   ├── scripts/
│   │   ├── index.js          # Content-script entry: loads messages, ticks start() every second
│   │   ├── start.js          # Hooks GitHub's Approve controls, writes the comment textarea
│   │   ├── util.js           # DEFAULT_MESSAGES, storage helpers, random pick
│   │   └── options.js        # Options-page logic (render / edit / save the message list)
│   └── tests/                # Jest tests (*.test.js) + generated junit.xml
├── docs/                     # CONTRIBUTING.md, PRIVACY.md and a mirror of the root README
└── dist/                     # Build output (gitignored) — load this unpacked in Chrome
```

## Runtime flow

1. `index.js` (content script, injected on `*://*.github.com/*`) calls `initMessages()` once to load the saved list from `chrome.storage.sync` into an in-memory cache, then calls `start(document)` every second.
2. `start.js` supports both GitHub UIs:
   - **Old UI**: `#pull_request_review[event]_approve` button + `#pull_request_review_body` textarea.
   - **New UI**: `input[name="reviewEvent"]` radios (only when the value is `approve`) + `textarea[placeholder="Leave a comment"]`.
   - The textarea value is written through the native value setter and followed by dispatched `input` + `change` events, so GitHub's UI notices the change.
3. On Approve, `getReviewMessage()` in `util.js` returns a **random** entry from the cached list. An empty list (the user removed every message) returns `""`, i.e. nothing is typed.
4. `options.js` renders the list and, on **Save**, writes it back via `saveMessages()` → `chrome.storage.sync`. A `chrome.storage.onChanged` listener in the content script refreshes its cache immediately, so already-open tabs pick up edits.

## Storage contract (important)

- Key `messages` in `chrome.storage.sync`. Value: `string[]` — trimmed, non-empty entries only (see `normalizeMessages`).
- Requires the `"storage"` permission in `manifest.json`.
- **This is the extension's only persistent storage.** Do not add localStorage, IndexedDB, cookies or server calls; the options page tells the user this explicitly.
- When nothing is stored (first run) or sync storage is unavailable, everything falls back to `DEFAULT_MESSAGES` exported from `util.js`. The options page seeds itself from that same list.
- Chrome sync quotas are small (512 items, 8 KB per item, 100 KB total). The whole list is one item, so keep messages short; `saveMessages` lets quota errors propagate so the options page can show them.

## Testing conventions

- Tests live in `src/tests/*.test.js` (Jest + jsdom). Each test file gets a fresh module registry, so `util.js`'s message cache does not leak between files.
- `start.*.test.js` spy on `utilModule.getReviewMessage` with `jest.spyOn`. **Keep `start.js` calling it as `utilModule.getReviewMessage()` on a namespace import** (`import * as utilModule from "./util"`) — switching to a direct named import would break those spies.
- To test storage code, stub the extension API with `global.chrome = { … }` and `delete global.chrome` afterwards — see `src/tests/util.storage.test.js` for the pattern.
- `npm test` overwrites `src/tests/junit.xml`; never hand-edit it.

## Build & CI

- `.github/workflows/build-deploy.yaml` runs on pushes/PRs to `main`, **ignoring `docs/**` and `*.md`** — editing Markdown (including this file) does not trigger CI.
- CI does: `npm ci` → `npm run build:prod` → `npm run test:ci`, uploads `dist/` as an artifact, and on `main` publishes it to the Chrome Web Store.
- Because publishing is automatic, bump `version` in **both** `src/manifest.json` and `package.json` for every release (Semver; currently `1.2.0`) — `docs/CONTRIBUTING.md` requires this.
- `dist/` is gitignored. To test manually: `npm run build:prod`, then *chrome://extensions → Load unpacked → `dist/`*, and reload the GitHub tab (the content script logs a hint if the extension was reloaded).

## Conventions

- Read `docs/CONTRIBUTING.md` before larger changes: discuss ideas in an issue first, keep changes in small reviewable units, add/update unit tests, and bump the version in `src/manifest.json` + `package.json`.
- Style: 2-space indent, double quotes, semicolons, `const`/arrow functions — match the file you're editing.
- Prefer editing existing files over creating new ones; keep changes minimal and focused.
- Keep `README.md` and `docs/README.md` identical (they currently mirror each other).
- The options page stays plain HTML/CSS/JS — no build-time templates or frameworks; its styles live inline in `src/options.html`.
