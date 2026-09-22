# 👥 IntentGuard: Multi-Persona Separation & Surface Architecture Plan

**Ensuring Zero Regressions for VS Code Users While Scaling to CLI and Enterprise CI/CD.**

---

- **Document Version**: `1.0.0-PLAN`  
- **Date**: `September 22, 2026`  
- **Author**: `Akmal Khan & Core Engineering Team`  
- **Repository**: [`https://github.com/akmalkhaniub/agentlens`](https://github.com/akmalkhaniub/agentlens) *(IntentGuard Monorepo)*  
- **Status**: `Approved for Execution`

---

## 1. Architectural Separation of Concerns

To allow independent evolution of each interface, we enforce a strict **Hexagonal / Ports-and-Adapters Architecture**:

```mermaid
flowchart TD
  subgraph DOMAIN["🏛️ CORE DOMAIN (@intentguard/core)"]
    direction TB
    D1["Trace Parser (Claude / Antigravity / Codex)"]
    D2["Semantic Scope Boundary Engine"]
    D3["Blast-Radius Circuit Breaker"]
    D4["Git Rollback & Patch Generator"]
    D5["Dynamic Multi-Model Pricing Card"]
    D6["Credential Leak & Risk Linters"]
  end

  subgraph PORTS["🔌 DRIVING PORTS (Contracts)"]
    P1["ITraceReaderPort"]
    P2["IScopeGovernorPort"]
    P3["IRollbackExecutorPort"]
  end

  subgraph ADAPTERS["💻 USER CLIENTS (Isolated Surfaces)"]
    direction TB
    A1["🎨 Client 1: VS Code & Cursor Extension<br/>(Visual Cockpit, Monaco Diffs, Webview)"]
    A2["💻 Client 2: Standalone CLI Daemon<br/>(Terminal Curses, Shell Hooks, Headless)"]
    A3["🤖 Client 3: GitHub Actions CI/CD Bot<br/>(PR Status Gatekeeper, Team Cloud)"]
  end

  DOMAIN ==> PORTS
  PORTS ==> A1
  PORTS ==> A2
  PORTS ==> A3

  style DOMAIN fill:#eff6ff,stroke:#2563eb,stroke-width:2px
  style PORTS fill:#f5f3ff,stroke:#7c3aed,stroke-width:2px
  style ADAPTERS fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
```

---

## 2. Persona Breakdown & Dedicated Features

```mermaid
flowchart LR
  subgraph P1["1. Visual IDE Builder (Solo Dev)"]
    F1["In-Editor Dashboard Tab"]
    F2["1-Click Split Diff (Monaco)"]
    F3["VCR Scrubber Bar (1x, 2x, 4x)"]
    F4["Categorized View Switcher"]
    F5["1-Click Git Terminal Restore"]
  end

  subgraph P2["2. Terminal Purist (DevOps / Hacker)"]
    F6["Fast ASCII Trace Tables"]
    F7["Interactive curses Timeline"]
    F8["Shell Interception Hook"]
    F9["Instant 'ig rollback' Command"]
    F10["Zero Webview Dependencies"]
  end

  subgraph P3["3. Team Lead & CI/CD Gatekeeper"]
    F11["Automated PR Status Checks"]
    F12["Requirement Spill Alerts in PR"]
    F13["Credential Leak Merge Blocker"]
    F14["Cross-Agent Cost Analytics"]
    F15["Team Spend / Model Scorecards"]
  end

  style P1 fill:#fdf4ff,stroke:#c026d3,stroke-width:2px
  style P2 fill:#fefce8,stroke:#ca8a04,stroke-width:2px
  style P3 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
```

---

## 3. How We Guarantee Zero Regressions for the VS Code Extension

| Risk Area | Why Extensions Usually Break | IntentGuard Defensive Architecture |
| :--- | :--- | :--- |
| **1. Webview Message Protocol** | Adding CLI features alters JSON payloads, causing webview JS exceptions. | **Fixed Schema Guard**: Webview message handlers (`setSessionData`, `openNativeDiff`, `runInTerminal`) remain 100% frozen. New fields are strictly additive and optional. |
| **2. Bundle Size & Startup Time** | Adding heavy CLI dependencies (like Ink, Commander, or Chalk) bloats the extension. | **Separate Bundles**: The VS Code extension only bundles `@intentguard/core` via `esbuild`. The CLI has its own separate entry point and dependencies. |
| **3. Offline / Air-Gapped Operation** | Adding cloud analytics breaks air-gapped environments. | **Local-First Mandate**: The VS Code client operates with zero remote network calls (`default-src 'none'`). All vendor scripts (`mermaid`, `marked`) stay bundled in `media/vendor/`. |
| **4. Command Namespaces** | Changing command names breaks existing keybindings and custom shortcuts. | **Dual Registration**: The extension registers both new `intentguard.*` commands AND preserves legacy `agentlens.*` and `antigravity.*` aliases. |

---

## 4. Deliverable Matrix by Persona

| Persona | Deliverable Artifact | Distribution Channel | Installation Command |
| :--- | :--- | :--- | :--- |
| **Visual In-Editor** | `intentguard-vscode-*.vsix` | VS Code Marketplace & Open VSX | `code --install-extension intentguard.vsix` |
| **Terminal Purist** | Standalone Node / Native Binary | NPM & Homebrew | `npm install -g @intentguard/cli` or `brew install intentguard` |
| **Team / CI/CD** | GitHub Action Template | GitHub Marketplace | `uses: akmalkhaniub/intentguard-action@v1` |

---

## 5. Monorepo Directory Layout

```
g:/ReplitProjects/antigravity-vscode-extension/
├── docs/
│   ├── INTENTGUARD_SPEC.md            <-- Master Product Architecture
│   └── PERSONA_SEPARATION_PLAN.md      <-- This Multi-Persona Plan
├── packages/
│   ├── core/                          <-- Shared Headless SDK (@intentguard/core)
│   │   ├── src/
│   │   │   ├── adapters/              <-- Claude, AGY, Codex Normalizers
│   │   │   ├── governor/              <-- Scope & Churn Circuit Breaker
│   │   │   ├── economics/             <-- Multi-Model Dynamic Rate Cards
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── vscode/                        <-- Current VS Code Extension (Hardened)
│   │   ├── src/
│   │   ├── media/                     <-- Local mermaid, marked, UI
│   │   └── package.json
│   │
│   ├── cli/                           <-- Standalone Terminal Tool (Phase 2)
│   │   ├── src/index.ts               <-- 'ig list', 'ig inspect', 'ig rollback'
│   │   └── package.json
│   │
│   └── action/                        <-- GitHub PR Action Gatekeeper (Phase 3)
│       ├── action.yml
│       └── src/index.ts
└── package.json                       <-- Root Workspace Manager
```
