# CleanMyMac Pro (React + Electron)

A macOS cleaner-style UI rebuilt from SwiftUI into **React + Electron**. It scans common locations (Caches, Logs, Temporary, Old Downloads, Browser Cache, Application Support) and lets you delete items **safely to Trash**. If Trash fails for system-owned paths, it will ask for admin privileges as a last resort.

## Requirements
- macOS
- Node.js 18+
- Xcode command line tools (recommended)

## Quick Start

```bash
cd cleanmymac-react-electron
npm install
npm run dev
```

This starts Vite (React) and Electron together. The app will open automatically.

## Build channels (DMG / Mac App Store)

### 1) Direct distribution (DMG)

```bash
npm run build:dmg
```

### 2) Mac App Store (production)

```bash
npm run build:mas
```

### 3) Mac App Store (development / TestFlight local signing checks)

```bash
npm run build:mas-dev
```

### Optional: build all defaults

```bash
npm run build:all
```

Artifacts are generated under `dist/` by `electron-builder`.

## Signing & provisioning in CI (environment variables)

The build is parameterized to avoid hardcoding identities/profiles:

- `CSC_NAME`: macOS signing identity used by DMG, MAS and MAS-DEV.
- `MAC_PROVISIONING_PROFILE`: provisioning profile path/identifier for direct mac build (if needed by your signing flow).
- `MAS_PROVISIONING_PROFILE`: provisioning profile path/identifier for Mac App Store distribution.
- `MAS_DEV_PROVISIONING_PROFILE`: provisioning profile path/identifier for Mac App Store development builds.

Entitlements files used by MAS builds:

- `build/entitlements.mas.plist`
- `build/entitlements.mas.inherit.plist`

## Metadata validation for App Store Connect consistency

Before publishing, run:

```bash
npm run validate:metadata
```

This check validates:

- `build.appId` format (reverse-DNS).
- `version` in semver-compatible format.
- `build.mac.category` against known Apple categories.
- Category consistency across `mac`, `mas`, and `masDev` targets.

## Notes & Permissions

- Some locations like `/Library/...` may require admin rights to delete. The app uses `trash` whenever possible.
- For broader read access (e.g. full Application Support), you may need to grant **Full Disk Access** in System Settings → Privacy & Security.
- This template avoids Node integration in the renderer and exposes only a minimal API via `preload` for better security.
