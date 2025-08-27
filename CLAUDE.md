# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development
```bash
npm run dev          # Start development server (Vite + Electron)
npm run start        # Start Electron with built files
```

### Building
```bash
npm run build:react  # Build React app only
npm run build        # Build React app + create Electron app
npm run make:mac     # Build macOS DMG package
```

### Linting
```bash
npm run lint         # Currently placeholder - add actual linter here
```

## Project Architecture

### Tech Stack
- **React + TypeScript** - Main UI framework with strict typing
- **Electron** - Desktop app wrapper with secure context isolation
- **Vite** - Development server and build tool
- **Tailwind CSS** - Utility-first styling with dark mode support
- **Radix UI** - Accessible component primitives

### Key Architecture Patterns

**Secure Electron Setup:**
- Context isolation enabled (`contextIsolation: true`)
- Node integration disabled (`nodeIntegration: false`) 
- Preload script exposes minimal API via `contextBridge`
- Main process handles all filesystem operations

**IPC Communication:**
- `electron/preload.ts` - Exposes `window.cleaner` API to renderer
- `electron/main.ts` - Handles `scan-all` and `delete-items` IPC calls
- Real-time progress updates via `scan-progress` events

**Component Structure:**
- `src/components/` - Feature components (Header, Sidebar, CategorySection, ItemRow)
- `src/components/ui/` - Reusable UI primitives (shadcn/ui style)
- `src/contexts/` - React contexts (theme provider)
- `src/types.ts` - Shared TypeScript interfaces and types

### File System Scanner Architecture

**Categories & Scanning:**
- 6 predefined cleanup categories: Cache, Logs, Temporary, Old Downloads, Browser Cache, App Support
- Each category has dedicated scanner function in `electron/main.ts`
- Scanners respect macOS security boundaries and permissions
- Progress tracking during multi-category scans

**Safe Deletion:**
- Primary method: `trash` library (moves to macOS Trash)
- Fallback: `sudo` prompt for system-protected paths
- Never permanently deletes files directly

### State Management

**React State Patterns:**
- Global app state in `App.tsx` with hooks
- Selected items tracked via `Record<string, boolean>` mapping
- Category grouping computed via `useMemo` for performance
- Responsive sidebar state management

## Development Notes

### Path Aliasing
- `@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

### Styling System  
- Tailwind configured with custom color system using CSS variables
- Dark mode support via `"class"` strategy
- Safe area insets for macOS integration

### Build Configuration
- Vite builds to `dist/` directory
- Electron-builder packages from `dist/` + `electron/` folders
- macOS app ID: `com.maykon.cleanmymacpro`
- Target: DMG for macOS distribution

### Security Considerations
- All filesystem operations isolated to main process
- Preload script provides minimal API surface
- User confirmation required before deletions
- Respects macOS permission boundaries (may require Full Disk Access)

### UI Language
- Interface uses Portuguese (Brazilian) text
- Error messages and confirmations in Portuguese
- Consider this when modifying user-facing strings