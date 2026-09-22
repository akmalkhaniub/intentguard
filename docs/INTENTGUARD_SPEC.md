# 🛡️ IntentGuard: The Autonomous Agent Control Plane & In-Flight Intent Governor

**Universal In-Flight Intent Enforcement, Requirement Spill Interception, and Blast-Radius Governance for AI Coding Agents.**  
*Supporting Anthropic Claude, Google Antigravity, and OpenAI Codex.*

---

- **Document Version**: `1.0.0-SPEC`  
- **Date**: `September 22, 2026`  
- **Author**: `Akmal Khan & Core Engineering Team`  
- **Repository**: [`https://github.com/akmalkhaniub/agentlens`](https://github.com/akmalkhaniub/agentlens) *(Target Brand: IntentGuard)*  
- **Classification**: `Product Architecture & Spec-Driven Roadmap`

---

## Executive Summary

Modern AI software development suffers from an acute **"Missing Middle"** crisis:
1. **The Start (Well-Served)**: Developers write thorough prompts, rules (`.cursorrules`), and architectural blueprints (`implementation_plan.md`).
2. **The End (Post-Mortem)**: Developers review giant 1,500-line git diffs, broken test suites, and pull requests.
3. **The Middle (The Black Hole)**: Between prompt and output, autonomous coding agents execute 50–100 cognitive tool steps in an unmonitored black box. As step count increases, **context decay and cognitive drift** cause agents to silently refactor unrelated files, leak secrets, hollow out functions, and spill outside declared requirements.

**IntentGuard** is the **first inline Agent Control Plane** that sits directly between agent reasoning and your git repository. It dynamically derives the **Intent Boundary** from the developer's specification, monitors every file edit and command in real-time, circuit-breaks out-of-scope modifications before they damage code, and provides instant 1-click git rollbacks.

```mermaid
flowchart LR
  subgraph START["🟢 THE START (Intent)"]
    direction TB
    S1["Human Prompt"]
    S2["implementation_plan.md"]
    S3["Skills & Rules (.cursorrules)"]
  end

  subgraph MIDDLE["🛡️ THE INTENTGUARD CONTROL PLANE (In-Flight)"]
    direction TB
    G1{"Intent Boundary Filter"}
    G2{"Blast-Radius Governor"}
    G3{"Context Poisoning Interceptor"}
    G4{"Git Checkpoint Revert"}
  end

  subgraph AGENT["🤖 AGENT EXECUTION"]
    direction TB
    A1["Claude Code CLI"]
    A2["Google Antigravity"]
    A3["OpenAI Codex"]
  end

  subgraph END["🔵 VERIFIED REPOSITORY"]
    direction TB
    E1["Zero-Spill Code Working Tree"]
    E2["High Plan Fidelity (>95%)"]
    E3["Clean PR Ready to Merge"]
  end

  START ==> G1
  AGENT <==> MIDDLE
  MIDDLE ==> END

  style MIDDLE fill:#f0fdf4,stroke:#16a34a,stroke-width:3px
  style AGENT fill:#fef2f2,stroke:#ef4444,stroke-width:2px
```

---

## 1. The Industry Problem: Why "The Middle" Collapses

When autonomous agents process complex software tasks, fidelity to initial requirements decays as step count increases:

```mermaid
xychart-beta
    title "Agent Intent Adherence vs. Step Count (The Middle Collapse)"
    x-axis ["Step 1 (Plan)", "Step 10 (First Edit)", "Step 25 (Tests Fail)", "Step 40 (Spill Begins)", "Step 60 (Doom Loop)", "Step 80 (Final Diff)"]
    y-axis "Intent Fidelity %" 0 --> 100
    line [100, 95, 78, 48, 28, 15]
```

### The 4 Manifestations of Cognitive Drift

| Failure Mode | How It Manifests in the Middle | IntentGuard In-Flight Solution |
| :--- | :--- | :--- |
| **1. Scope Creep / Requirement Spill** | Asked to update an auth token in `auth.ts`, the agent silently modifies the database schema in `schema.prisma` and updates 10 routing files. | **Semantic Scope Boundary**: Validates every file edit against the declared plan. Flags out-of-scope edits instantly. |
| **2. High Churn & Destructive Loops** | Agent fails a compiler check and repeatedly edits the same 400-line file 8 times, gradually deleting error-handling code to silence warnings. | **Blast-Radius Circuit Breaker**: Trips when a file is modified >3 times in one turn or shrinks by >25%. |
| **3. Context Poisoning** | Agent executes `npm test` and receives 3,000 lines of terminal noise, flushing out the original instructions from active attention. | **Noise Compaction Gateway**: Intercepts noisy stdout/stderr, compressing it into structured summaries for the agent while keeping raw logs for humans. |
| **4. Accidental Secret & Token Leaks** | Agent outputs an unmasked API key or bearer token into file logs or bash arguments. | **Zero-Tolerance Credential Shield**: Blocks execution immediately upon detecting token entropy patterns (`sk-`, `ghp_`, `AIzaSy`). |

---

## 2. Multi-Persona Segmentation Strategy

To build IntentGuard as a venture-scale product without regressing or bloating the existing VS Code experience, we delineate three independent consumer surfaces powered by a single core SDK:

```mermaid
flowchart TD
  SDK["@intentguard/core (Universal Trace & Governance SDK)"]
  
  SDK --> ClientA["1. In-Editor Cockpit (VS Code & Cursor Extension)"]
  SDK --> ClientB["2. Standalone Headless CLI (Terminal Developers)"]
  SDK --> ClientC["3. CI/CD Gatekeeper Action (GitHub PR Automation)"]

  style SDK fill:#dbeafe,stroke:#2563eb,stroke-width:2px
  style ClientA fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
  style ClientB fill:#fef3c7,stroke:#d97706,stroke-width:2px
  style ClientC fill:#dcfce7,stroke:#16a34a,stroke-width:2px
```

### Persona A: The In-Editor Developer (VS Code / Cursor)
- **Interface**: Visual extension dashboard with time-travel VCR scrubbing, Monaco split diffs, and 1-click restore buttons.
- **Workflow**: Real-time side-by-side execution view that pulses red when the agent steps out of bounds.

### Persona B: The Terminal Purist (Claude Code CLI / Neovim / tmux)
- **Interface**: Standalone CLI (`intentguard` or `ig`).
- **Workflow**: Terminal curses UI running in a split pane; intercepts shell processes and generates instant rollback commands (`ig rollback --step 14`).

### Persona C: The Team Lead & DevOps Engineer (CI/CD PR Audits)
- **Interface**: GitHub Action (`intentguard/action@v1`).
- **Workflow**: Runs on every pull request generated by an agent. Audits plan fidelity, scans for secret leaks, checks token costs, and posts a rich status check before merging.

---

## 3. Spec-Driven Architecture & Contract Specification

All components communicate through a strictly versioned contract: the **Universal Trace & Intent Specification (UTIS v1.0)**.

### Sequence Diagram: In-Flight Governance Flow

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Spec as Intent Contract (implementation_plan.md)
    participant Engine as IntentGuard Engine
    participant Agent as Autonomous Agent (Claude/AGY/Codex)
    participant Git as Git Working Tree

    Dev->>Spec: Declare Tasks & Planned Files (auth.ts, login.tsx)
    Dev->>Agent: Launch Agent Execution
    Agent->>Engine: Tool Call Intercept: edit_file("auth.ts")
    Engine->>Spec: Check Scope: Is "auth.ts" in plannedFiles?
    Spec-->>Engine: Status: ALLOWED (In Scope)
    Engine->>Git: Apply File Edit to Working Tree
    Engine-->>Agent: Edit Succeeded

    Note over Agent,Engine: Turn 18: Agent Hallucinates Drift
    Agent->>Engine: Tool Call Intercept: edit_file("prisma/schema.prisma")
    Engine->>Spec: Check Scope: Is "schema.prisma" in plannedFiles?
    Spec-->>Engine: Status: VIOLATION (Unplanned Scope Creep!)
    Engine-->>Dev: 🚨 Live Alert: Intent Spill Detected on schema.prisma!
    Engine-->>Agent: 🛑 INTERCEPT: Tool Call Blocked. Request Human Confirmation.
    Dev->>Engine: Click: "Revert Turn 18 & Steer Agent Back to auth.ts"
    Engine->>Git: git restore "prisma/schema.prisma"
    Engine-->>Agent: Injected Steering Prompt: "Do not touch schema.prisma. Focus on auth.ts."
```

---

## 4. Universal Intent & Trace Schema (`utis.schema.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UniversalIntentTrace",
  "type": "object",
  "required": [
    "sessionId",
    "brand",
    "model",
    "declaredIntent",
    "steps",
    "governanceStatus",
    "costMetrics"
  ],
  "properties": {
    "sessionId": { "type": "string" },
    "brand": { "type": "string", "enum": ["claude", "antigravity", "codex", "custom"] },
    "model": { "type": "string" },
    "declaredIntent": {
      "type": "object",
      "properties": {
        "hasPlan": { "type": "boolean" },
        "plannedFiles": { "type": "array", "items": { "type": "string" } },
        "userGoal": { "type": "string" }
      }
    },
    "governanceStatus": {
      "type": "object",
      "properties": {
        "intentAdherenceRate": { "type": "number", "minimum": 0, "maximum": 100 },
        "scopeSpillFiles": { "type": "array", "items": { "type": "string" } },
        "churnHotspots": { "type": "array", "items": { "type": "string" } },
        "circuitBreakerTripped": { "type": "boolean" },
        "riskGrade": { "type": "string", "enum": ["LOW", "MEDIUM", "CRITICAL"] }
      }
    },
    "rollbackPlan": {
      "type": "object",
      "properties": {
        "isolatedFiles": { "type": "array", "items": { "type": "string" } },
        "gitRestoreCommand": { "type": "string" },
        "reversePatches": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

---

## 5. Phased Product Roadmap

```mermaid
gantt
    title IntentGuard Product Delivery Roadmap (2026-2027)
    dateFormat  YYYY-MM-DD
    section Phase 1: Engine & VS Code
    Brand Alignment to IntentGuard        :done, p1a, 2026-09-22, 2d
    Core SDK Isolation (@intentguard/core) :active, p1b, 2026-09-24, 4d
    Live Scope Spill Gauge in Dashboard   :p1c, 2026-09-28, 5d
    section Phase 2: Headless CLI
    CLI Architecture & Terminal Curses    :p2a, 2026-10-05, 7d
    In-Flight Shell Interceptor Daemon    :p2b, 2026-10-12, 7d
    Terminal Replay & Instant Revert      :p2c, 2026-10-19, 5d
    section Phase 3: CI/CD Gatekeeper
    GitHub Action PR Status Bot           :p3a, 2026-10-26, 7d
    Plan vs Reality PR Diff Annotator     :p3b, 2026-11-02, 6d
    Team Governance & Benchmark Cloud     :p3c, 2026-11-09, 14d
```

---

## 6. Zero-Breakage Isolation Strategy

To guarantee that adding the CLI and CI/CD tools **never degrades or breaks the VS Code extension**:
1. **Core SDK as a Headless NPM Package**: All business algorithms (parsing, diffing, rate cards, risk scan) reside in `@intentguard/core`.
2. **Backward-Compatible Message Protocol**: The VS Code webview message bus continues accepting legacy `setSessionData`, `openNativeDiff`, and `runInTerminal` commands without schema drift.
3. **No Dynamic Network Calls**: The VS Code extension remains 100% self-contained, local, and air-gapped with bundled vendor dependencies.
