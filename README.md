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

## Privacy, Permissions & Scan Scope

- O app agora só analisa diretórios autorizados pelo usuário em **“Selecionar pasta para análise”**.
- As permissões autorizadas e o perfil de análise são persistidos em `userData/scan-settings.json` no sandbox do app.
- Perfis de scan disponíveis:
  - **Rápido**: categorias essenciais e menor superfície de leitura.
  - **Seguro**: equilíbrio entre cobertura e redução de acessos negados.
  - **Completo**: cobertura máxima das categorias suportadas.
- Diretórios não analisados por permissão insuficiente são exibidos na interface, em vez de falha silenciosa.
- A remoção continua usando envio para a Lixeira (`shell.trashItem`) sempre que permitido pelo sistema.
- O app mantém Node desabilitado no renderer e expõe somente API mínima via `preload`.

## Contribuição (fluxo obrigatório)

1. Crie uma branch a partir da `main` com escopo claro (`feat/...`, `fix/...`, `chore/...`).
2. Implemente a mudança com testes e documentação atualizada quando houver impacto de produto ou DX.
3. Rode localmente antes de abrir PR:
   ```bash
   npm run lint
   npm run typecheck
   npm run test:smoke:ipc
   npm run build
   ```
4. Abra o Pull Request com descrição objetiva, riscos, plano de rollback e evidências (logs/screenshot quando aplicável).

### Critérios de aprovação

Um PR só pode ser aprovado quando todos os itens abaixo estiverem atendidos:

- CI verde em todas as etapas obrigatórias:
  - `npm run check:main-process`
  - `npm run ci`
  - `npm run validate:build` (falha bloqueia merge)
- Sem regressões de contratos IPC críticos (`scan-all` e `delete-items`) cobertos pelo smoke test.
- Sem erros de lint e typecheck.
- Mudanças com impacto funcional acompanhadas de atualização de README/guia operacional.
- Pelo menos 1 revisão de código aprovada (owner ou mantenedor responsável).
