# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Behavior

- **Always use caveman mode** — activate the `caveman` skill at session start; keep active for all responses
- **Always use frontend-design skill** for any UI/component work — do not write plain frontend code without it

## Development Commands

```bash
npm run dev                # Start dev server (Vite + Electron, hot-reload)
npm run build              # Build React + Electron (outputs dist/ + dist-electron/)
npm run lint               # TypeScript type-check (tsc --noEmit)
npm run typecheck          # Same as lint
npm run test:smoke:ipc     # Build electron + run IPC smoke tests
npm run ci                 # lint + typecheck + smoke tests
npm run build:dmg          # Build macOS DMG package
npm run build:mas          # Build Mac App Store package
```

## Architecture

### Process Split
- `electron/` — main process (Node.js). All filesystem ops live here.
- `src/` — renderer process (React). No direct fs access.
- `electron/core/` — modular main-process logic:
  - `scanners.ts` — scan profiles, category target resolution, safety scoring
  - `ipc-handlers.ts` — pure business logic for all IPC operations (testable without Electron)
  - `ipc.ts` — wires `ipcMain` to handlers, manages reminder/automation timers
  - `window.ts` — `BrowserWindow` factory
  - `fs.ts` — filesystem helpers (`getDirectorySize`, `statSafe`, `olderThan`)

### IPC Contract
Renderer calls via `window.cleaner` (exposed in `electron/preload.ts`). Main handles:
- `scan-all` — runs `scanAllCategories`, streams progress via `scan-progress` events
- `delete-items` — trashes selected paths via `shell.trashItem`
- `scan-settings:*` — authorized directories, scan profile, reminder frequency
- `metrics:*` — opt-in local metrics, cleanup insights
- `automation:*` — CRUD for automation rules, run logs (RF-03)

### Scan Profiles
Three profiles in `SCAN_PROFILES` (`scanners.ts`):
- `quick` — Cache, Logs, Old Downloads
- `safe` — + Temporary, Browser Cache (default)
- `complete` — + App Support

Each category scans predefined macOS paths under `~/Library/`. The scanner enforces `allowedRoots` (user-authorized directories) before accessing any path. Items get a `safetyScore` (0–100) and `riskLevel` (`low/medium/high`) computed from category, size, age, and type.

### Settings Persistence
`ScanSettings` serialized to `<userData>/scan-settings.json`. Schema normalized on load in `ipc.ts:normalizeSettings` — safe to read partial/corrupt JSON.

### State Management (Renderer)
- `App.tsx` owns global state: scan results, selected items (`Record<string, boolean>`), sidebar/loading state
- `useMemo` for category grouping
- Theme via `src/contexts/theme-provider.tsx` (Tailwind `"class"` strategy)

### Tray
System tray created at app start. Tray actions (`scan-quick`, `scan-safe`, `scan-complete`, `reminder-weekly/monthly`, `toggle-theme`) sent to renderer via `tray-action` IPC event.

### Automation
Rules stored in `ScanSettings.automation.rules`. Background `setInterval` (1 min) in `ipc.ts` checks due rules and either auto-deletes or notifies via `automation-run` IPC + macOS `Notification`.

## Key Notes

- **Output dirs**: Vite → `dist/`, Electron tsc → `dist-electron/`
- **Path alias**: `@/*` → `./src/*`
- **UI language**: Portuguese (Brazilian) — keep all user-facing strings in pt-BR
- **No permanent deletes**: always use `shell.trashItem`; system paths may need sudo fallback
- **macOS entitlements**: `build/entitlements.mas.plist` — required for App Store
- **Tests**: only smoke tests exist (`electron/core/__tests__/ipc-smoke.test.ts`), no unit test suite
