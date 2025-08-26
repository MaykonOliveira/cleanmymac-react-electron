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

## Build a macOS DMG

```bash
npm run make:mac
```

The DMG will appear under `dist/` packaged by electron-builder.

## Notes & Permissions

- Some locations like `/Library/...` may require admin rights to delete. The app uses `trash` whenever possible.
- For broader read access (e.g. full Application Support), you may need to grant **Full Disk Access** in System Settings → Privacy & Security.
- This template avoids Node integration in the renderer and exposes only a minimal API via `preload` for better security.