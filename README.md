<div align="center">

# 🌌 AgentLens: Universal AI Agent Observability & Benchmarking Suite
### For Google Antigravity, Anthropic Claude (Claude Code / Desktop / Cline), and OpenAI Codex

**The definitive diagnostic cockpit, time-travel player, git rollback assistant, context engineering breakdown, and cross-agent benchmarking suite for AI coding agents.**

[![Visual Studio Marketplace Version](https://img.shields.io/badge/vs%20marketplace-v0.6.1-blue.svg)](https://marketplace.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Engine: VS Code](https://img.shields.io/badge/vscode-%5E1.85.0-brightgreen.svg)](#requirements)
[![Rating: 10.0](https://img.shields.io/badge/rating-10.0%2F10%20Universal-purple.svg)](#key-features)

---

</div>

## 💡 Why AgentLens?

Modern AI software development is no longer single-model or single-tool. Developers regularly toggle between **Google Antigravity**, **Anthropic Claude** (via Claude Code CLI, Claude Desktop, Cline, or Roo Code), and **OpenAI Codex** depending on task complexity, pricing, and cognitive demands.

However, each tool stores its execution traces in disparate, fragmented formats (`transcript.jsonl`, `~/.claude/projects/`, `.codex/traces/`), with different schema representations for file edits and tool calls.

**AgentLens** is the **first universal observability standard** that unifies all agent traces into a single, high-fidelity diagnostic cockpit inside VS Code. Every feature — from **1-click Git rollbacks** and **Monaco native diffs** to **time-travel scrubbing** and **plan auditing** — works seamlessly and identically across Claude, Antigravity, and Codex.

---

## ✨ Universal Killer++ Capabilities

### 🌐 1. Universal Multi-Agent Architecture (Claude, Antigravity, Codex)
- **Automatic Engine Detection**: Discovers sessions from Antigravity (`~/.gemini/antigravity/brain`), Claude Code CLI (`~/.claude/`), Cline / Roo Code (`%APPDATA%/Code/User/globalStorage/`), and OpenAI Codex (`.codex/`).
- **Normalized Universal Diffing**: Seamlessly unifies tool calls (`replace_file_content`, `write_to_file`, `replace_in_file`, `edit_file`, `execute_command`) into standardized before/after code deltas and reverse patches.
- **Agent Brand Badges**: Color-coded indicators across the sidebar and dashboard (🟣 Claude, 🔵 Antigravity, 🟢 Codex).

### 📊 2. Context Engineering Diagnostics & Budget Breakdown
- **Context Composition Bar**: Visualizes token budget allocations across:
  - 🟣 **System Prompt & Rules**: Static instructions and skills.
  - 🔵 **Ingested Source Code**: Repositories and file reads.
  - 🟡 **Reasoning & CoT**: Internal model thinking tokens.
  - 🟠 **Tool Payloads**: Structured function arguments and JSON results.
  - 🔴 **Terminal Noise**: Raw CLI stdout/stderr logs.
- **Anthropic & Gemini Prompt Caching**: Displays exact cache hit tokens and calculates real financial savings (\$).
- **🚨 Context Poisoning Warning**: Automatically alerts you when bloated terminal output (e.g. `npm install` spam, raw traces) consumes >25% of the context window, degrading the LLM's attention span.

### 🏆 3. Repository Multi-Agent Leaderboard
- **Cross-Agent Repo Benchmarking**: Quantifies how different AI agents perform inside your specific repository.
- **Aggregated Metrics**:
  - ⚡ **Fastest Agent**: Lowest average task completion time.
  - 💵 **Most Cost-Effective**: Lowest average dollar cost per resolved task.
  - 🛡️ **Most Reliable**: Highest first-pass task completion rate without fatal errors.
  - 🎯 **Average Plan Adherence (%)**: Fidelity to initial implementation plans.

### 🔄 4. 1-Click Agent Hand-Off / Fork
- **Inter-Agent Continuity**: Stalled on a difficult bug in Antigravity? Click **"🔄 Hand-Off / Fork"** to instantly generate an optimal prompt packet for **Claude Code** or **Codex**.
- **Context Compaction**: Compiles the current task, modified files footprint, remaining plan tasks, and diagnostic state into a clean clipboard prompt.

### 🖥️ 5. Decoupled Task Logs & Scratchpad Explorer
- **Background Task Separation**: Directly open and inspect detached background logs (`.system_generated/tasks/task-*.log`) in VS Code without polluting the LLM's context.
- **Scratch Files**: 1-click access to temporary agent scratchpad scripts in `scratch/`.

### ⚖️ 6. Side-by-Side Session Comparator & Benchmarking
- **A/B Benchmark Any Two Agent Sessions**: Select any past session from your local history to benchmark against your active session.
- **Instant Comparative Deltas**: Automatically calculates relative variance badges:
  - 📈 *Health Score Delta* (e.g. `+10 pts`)
  - 💵 *Financial Delta* (e.g. `-$0.0125` cheaper)
  - ⏱️ *Latency Delta* (e.g. `-35s` faster)
  - 📦 *Step & Token Count Differentials*
- **Automated Efficiency Verdict**: Generates an executive verdict determining which session approach was cleaner, faster, and had fewer errors.
- **File Footprint Overlap & Divergence**: Visually maps files touched by *Both Sessions (Common)* vs. *Only Session A* vs. *Only Session B*, displaying exact edit frequencies for each.

### ⏪ 7. 1-Click Git Revert & Rollback Assistant
- **Safe Working Tree Restoration**: Generates targeted, non-destructive `git restore` commands strictly isolating only files modified by the agent session — zero risk to your unrelated unstaged files.
- **Run in VS Code Terminal**: 1-click execution button with confirmation dialog that launches a dedicated terminal and restores files immediately.
- **Selective File Revert**: Checkbox table allowing you to cherry-pick individual files to revert or copy custom restoration commands.
- **Export Reverse Patch (`.patch`)**: Generates unified reverse diff patches that can be applied with `git apply` or committed to an emergency branch.

### ↔️ 8. Split Diff & Native VS Code Diff Inspector
- **In-Dashboard Dual Mode**: Seamlessly toggle between **Unified Diff** (`+` / `-` lines) and **Side-by-Side Split Diff** right inside the transcript card.
- **Native Monaco Diff Editor (`vscode.diff`)**: 1-click **"↔️ Native Diff"** button opens VS Code's official side-by-side Monaco diff viewer with syntax highlighting, mini-map, and intra-line difference highlighting.
- **Per-Step Reverse Patches**: 1-click copy of isolated patch snippets for any single edit step.

### 🎞️ 9. The "Time-Travel" Agent Player with Global Keyboard Controls
- **Interactive Scrubber Slider**: Drag the playback scrubber across steps 1 to $N$.
- **Replay Coding Sessions**: Hit `▶ Play` to watch the agent's thought process, tool invocations, and file modifications unfold like a video at **1x, 2x, or 4x speed**.
- **⌨️ Keyboard Controls**:
  - `Space`: Play / Pause playback
  - `←` / `→`: Step backward / step forward
  - `Home` / `End`: Jump to start / jump to end
  - `1`, `2`, `4`: Instant playback speed toggling
  - `Escape`: Instantly close modal overlays
- **Active Delta Scrubber Pill**: Live glowing badge (`⚡ Delta: filename (EDIT)`) appears during playback whenever the current step touches code; click it to jump straight to the diff!
- **Active Step Illumination**: Automatically highlights the active step card and auto-scrolls in real time.

### 🔍 10. Step Filtering & Real-Time Search Toolbar
- **1-Click Filter Chips**: Instantly narrow down long sessions to:
  - ✏️ **File Edits**: Only steps that created or modified code.
  - 🖥️ **Terminal**: Shell commands, test runners, and build logs.
  - ⚠️ **Warnings & Errors**: Steps that failed, triggered compiler errors, or had retries.
  - 💭 **Thinking**: Steps with deep reasoning and chain-of-thought strategy.
- **Live Search Bar**: Instantly filters steps by keyword, file path, command, or error string.

### 🛡️ 11. Hallucination & Security Risk Scanner
- **🔑 Secret & Token Leak Guard**: Scans outputs for accidentally leaked credentials (`sk-`, `AIzaSy`, `ghp_`, bearer tokens, passwords).
- **🚨 Destructive File Shrink Alerts**: Warns if a file was accidentally hollowed out or truncated by an unintended overwrite.
- **🔄 Command Doom Loop Detector**: Flags if the agent repeatedly ran the same failing shell command without changing strategy.
- **Security Scorecard**: Rates sessions as `PASSED (Low Risk)`, `WARNING`, or `CRITICAL RISK`.

### 🎯 12. Plan vs. Reality (Intent & Drift Auditor)
- Automatically parses `implementation_plan.md` and cross-references it with what the agent actually executed:
  - 🟢 **Executed as Planned**: Files declared in the plan that were properly edited.
  - 🟡 **Scope Creep / Unplanned Edits**: Files touched that were *never* in the design plan (catching regressions early).
  - 🔴 **Missed Intentions**: Files or verification tests promised in the plan that the agent stopped before touching!
  - **Plan Adherence Score (%)**: A live percentage score of how faithfully the agent followed its plan.

### 🔀 13. Multi-Agent Task Switching & Handoffs
- Interactive **Mermaid Sequence Diagram** (`sequenceDiagram`):
  - Visualizes the user prompt ➔ lead agent ➔ subagent swarms.
  - Displays specific prompts delegated, active lifelines, and task completion returns.

### ⏱️ 14. Time & Latency Bottleneck Profiler
- **Latency Breakdown**: Measures seconds and percentages spent in:
  - 💭 *Model Chain-of-Thought Reasoning*
  - 🖥️ *Terminal Commands, Builds & Package Downloads*
  - ✏️ *File Writing & Modifying*
- **Top Slowest Steps Table**: Automatically pinpoints performance bottlenecks with diagnostic causes (e.g. *Slow npm build*, *Deep reasoning on refactor*).
- **Self-Correction & Retry Loops**: Automatically counts and highlights moments where the agent struggled with compiler errors.

### 💰 15. Token & Dollar Cost Accounting ($)
- Real-time token economics calculated with dynamic model-aware rate cards (Gemini Flash, Gemini Pro, Claude 3.5/3.7 Sonnet, GPT-4o):
  - **Estimated Session Cost ($)**
  - **Total Tokens Used** (Input Context vs Output / Thinking tokens)
  - **Peak Context Window Gauge**: Tracks context growth to guard against token bloat.

### 🔴 16. Live Real-Time Tailing Engine & Standalone PR Export
- **Live File Watcher**: Streams incoming agent steps in real time directly into the webview with a pulsing `🟢 LIVE WATCHER ACTIVE` indicator.
- **1-Click Standalone HTML PR Report**: Click **"📤 Export PR Report (.html)"** to generate a single, completely self-contained `.html` file. Attach it to a GitHub PR, post to Slack, or publish to GitHub Pages!

---

## 🚀 Getting Started

### 1. Installation
Install directly via VS Code Extensions Marketplace, or install the `.vsix`:
```powershell
code --install-extension antigravity-visualizer-0.6.1.vsix
```

### 2. Usage
1. Click the **AgentLens icon** on the left Activity Bar.
2. Select any conversation in the **Agent Sessions** panel (Antigravity, Claude, or Codex).
3. The interactive diagnostic dashboard opens in an editor tab.
4. Explore the 13 diagnostic tabs:
   * **`🗺️ Cognitive Phases`**: Scalable grouped architecture lifecycle.
   * **`🔀 Agent Handoffs`**: Multi-agent sequence diagram.
   * **`⏪ Git Rollback Assistant`**: 1-click restore commands & reverse patches.
   * **`⚖️ Session Comparator`**: Side-by-side A/B benchmarking & file footprint diff.
   * **`🏆 Repo Leaderboard`**: Cross-agent speed, cost, reliability, and adherence rankings.
   * **`🤖 AI Diagnostic Report`**: Automated health score and incident log.
   * **`🛡️ Risk & Sanity Scan`**: Security linter for secrets and destructive edits.
   * **`💰 Tokens & Context`**: Context Engineering stacked bar, prompt cache savings, and poisoning alerts.
   * **`⏱️ Time & Bottlenecks`**: Latency breakdown and bottleneck analysis.
   * **`🎯 Plan vs. Reality`**: Intent adherence and scope creep audit.
   * **`🔥 File Churn Matrix`**: High-churn modification hotspot map.
   * **`💬 Step Transcript`**: Filterable steps with native split diffs.
   * **`📑 Plan & Logs`**: Markdown plans, scratchpad files, and decoupled task logs.

---

## ⌨️ Extension Commands

| Command | Title | Description |
| :--- | :--- | :--- |
| `antigravity.openVisualizer` | **Open Visualizer Dashboard** | Opens the diagnostic dashboard for the active session. |
| `antigravity.refreshSessions` | **Refresh Sessions** | Re-scans Antigravity, Claude, and Codex directories for new sessions. |

---

## 🛡️ Privacy & Security

* **100% Local Execution**: Runs entirely on your local machine with zero telemetry or third-party cloud data transmission.
* **Sensitive Token Detection**: Warns you before you share or export session traces containing credentials.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
