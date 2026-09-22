# Change Log

All notable changes to the "intentguard" extension will be documented in this file.

## [0.8.0] - The IntentGuard Autonomous Control Plane & Rollback Suite

- **🛡️ IntentGuard Brand & Autonomous Control Plane**:
  - Rebranded extension to **`intentguard`** (`akmalkhaniub.intentguard`), addressing **"The Missing Middle"** problem where developers and teams are blind during autonomous code crunching.
  - Formulated the Universal Intent & Trace Specification (**UTIS v1.0**).
  - Implemented the 4 In-Flight Control Interventions:
    1. *Semantic Scope Boundary*: Enforces execution within `implementation_plan.md` file bounds and detects unannounced requirement spill.
    2. *Blast-Radius Circuit Breaker*: Trips upon detecting high churn hotspots (≥3 edits) or destructive file shrinkage (>25%).
    3. *Context Poisoning Gateway*: Flags when raw terminal dumps consume >25% of the LLM's active prompt window.
    4. *Credential & Secret Shield*: Blocks accidental staging of API tokens and secrets.
- **👥 Decoupled Hexagonal Architecture (3 Personas)**:
  - **Persona A (Visual IDE Builder)**: Interactive VS Code/Cursor cockpit with Live IntentGuard Status Banner, adherence meter, scope spill warning pills, and 1-click **"⏪ Revert Scope Spill"** button.
  - **Persona B (Terminal Purist)**: Standalone headless CLI (`intentguard` / `ig`) supporting `list`, `inspect <id>`, `audit <id>`, `rollback <id> [--spill-only] [--exec]`, and `compare <id1> <id2>`.
  - **Persona C (DevOps Gatekeeper)**: GitHub Action (`action/action.yml` and `action/index.ts`) for PR gatekeeping with automated Markdown governance scorecards and CI failure on circuit breaks.
- **🔄 Zero Breakage & 100% Backwards Compatibility**:
  - Primary command identifiers `intentguard.openVisualizer` and `intentguard.refreshSessions` registered alongside backwards-compatible aliases for `agentlens.*` and `antigravity.*`.
  - Maintained 100% offline, air-gapped support with local vendor assets.

- **🌌 Complete Universal Rebrand**:
  - Rebranded extension package from `antigravity-visualizer` to **`agentlens`** to accurately reflect first-class, equal support for **Anthropic Claude**, **Google Antigravity**, and **OpenAI Codex**.
  - New primary command suite: `agentlens.openVisualizer` and `agentlens.refreshSessions` (with backward-compatible aliases for legacy configurations).
  - Activity Bar view container renamed to `agentlens-sidebar` ("AgentLens (AI Observability)").
  - Renamed official GitHub repository to [`https://github.com/akmalkhaniub/agentlens`](https://github.com/akmalkhaniub/agentlens).
- **🛡️ 100% Air-Gapped & Offline Ready**:
  - Bundled vendor dependencies (`mermaid.min.js`, `marked.min.js`) locally with strict Content-Security-Policy nonces.
- **⚡ Categorized Navigation**:
  - Added segmented category bar (`Execution & Flow`, `Code & Rollbacks`, `Diagnostics & Safety`, `Benchmarks & Models`) eliminating tab overflow.
- **🎨 Native Theme & Tactile Polish**:
  - Full theme compliance with dynamic VS Code variables for Light Modern, Dark+, and High-Contrast modes.
  - In-place `✅ Copied!` button micro-interactions, modal `Esc` dismiss, and backdrop click handlers.

## [0.6.0] - Universal Multi-Agent Observability & Benchmarking Suite

- **🌐 Universal Multi-Agent Support (Claude, Antigravity, Codex)**:
  - Model-agnostic observability supporting **Anthropic Claude** (Claude Code CLI `~/.claude/`, Claude Desktop, Cline, Roo Code), **Google Antigravity** (`~/.gemini/antigravity/`), and **OpenAI Codex** (`.codex/`).
  - Standardized normalization of diverse tool schemas (`replace_file_content`, `write_to_file`, `replace_in_file`, `edit_file`, `execute_command`) into universal deltas.
  - Sidebar tree view with agent brand badges and color coding (🟣 Claude, 🔵 Antigravity, 🟢 Codex).
- **🏆 Repository Multi-Agent Leaderboard**:
  - Live repository benchmark table ranking all AI coding agents that have worked on your project.
  - Automatically calculates:
    - ⚡ *Fastest Agent* (lowest average execution latency).
    - 💵 *Most Cost-Effective* (lowest average dollar cost per resolved task).
    - 🛡️ *Most Reliable* (highest first-pass task completion rate without fatal exceptions).
    - 🎯 *Average Plan Adherence (%)* and total incidents/retries.
- **📊 Context Engineering Diagnostics & Budget Breakdown**:
  - Stacked token consumption bar breaking down active context into:
    - 🟣 System Prompt & Custom Rules
    - 🔵 Ingested Source Code Files
    - 🟡 Reasoning / Chain-of-Thought
    - 🟠 Tool Inputs & API Payloads
    - 🔴 Terminal Noise & Log Output
  - **Prompt Caching Metrics**: Calculates Anthropic/Gemini cached prefix tokens and estimated cash savings (\$).
  - **Context Poisoning Detector**: Triggers an alert when noisy terminal logs hijack >25% of the context window, degrading reasoning quality.
- **🔄 1-Click Agent Hand-Off / Fork**:
  - Seamlessly transfer a running or stalled task between agents (e.g. from Antigravity to Claude Code, or Claude to Antigravity).
  - Automatically generates an agent-specific prompt packet containing current file modifications, unresolved plan requirements, and diagnostic state, copied straight to clipboard.
- **🖥️ Decoupled Background Task Logs & Scratchpad Explorer**:
  - Direct 1-click inspection of decoupled background processes (`.system_generated/tasks/task-*.log`) kept out of the main LLM context.
  - Explorer for transient scratch files created in `scratch/`.

## [0.5.0] - The 10.0 Benchmark & Comparison Edition

- **⚖️ Side-by-Side Session Comparator & Benchmarking**:
  - Compare any two agent sessions side-by-side with instantaneous comparative delta badges (`+pts`, `-$cost`, `±time`, `±steps`, `±files`).
  - Automated efficiency verdict: calculates whether the active session or comparison session was faster, cheaper, and had fewer errors.
  - File footprint overlap & divergence matrix: visually categorizes files as *Common to Both*, *Only in Session A*, or *Only in Session B*, showing exact edit counts for each.
  - Dropdown populated with all available local sessions from `~/.gemini/antigravity/brain`.
- **⌨️ Global VCR Keyboard Controls**:
  - `Space`: Play / Pause the agent playback scrubber.
  - `←` / `→` Arrow Keys: Step backward / step forward one action.
  - `Home` / `End`: Jump to beginning / jump to end.
  - `1`, `2`, `4`: Instant playback speed toggling (1x, 2x, 4x).
  - Context-aware: intelligently ignores keystrokes when typing in search bars or inputs.
  - Added visual keyboard shortcuts badge directly in the player bar.

## [0.4.0] - The 10/10 Edition

- **1-Click Git Revert & Rollback Assistant**:
  - Safe, non-destructive `git restore` commands isolating only files modified during the session.
  - Interactive file selection table with checkboxes to cherry-pick files to restore.
  - Direct execution button to run rollback commands directly in the VS Code terminal.
  - Reverse `.patch` generator and exporter for emergency rollback branches.
- **Interactive Split Diff & Native Monaco Diff Editor**:
  - In-card toggle between Unified Diff (`+` / `-`) and Side-by-Side Split Diff.
  - 1-click **"↔️ Native Diff"** action leveraging `vscode.diff` to open VS Code's official side-by-side Monaco diff viewer with syntax highlighting and mini-map.
  - 1-click clipboard copy of isolated per-step reverse patches.
- **Step Filtering & Real-Time Search Toolbar**:
  - Filter chips for File Edits, Terminal Commands, Warnings/Errors, and Thinking.
  - Live instantaneous search bar filtering through thoughts, content, and tool arguments.
- **Active Delta VCR Scrubber Pill**:
  - Real-time indicator in the playback scrubber highlighting active file modifications.
  - 1-click jump from the timeline scrubber directly to the active code delta in the transcript.

## [0.3.0] - Killer++ Observability & Diagnostics

- **Time-Travel Agent Player (VCR)**: Play, pause, scrub timeline at 1x, 2x, or 4x speed with live step illumination and cognitive readout.
- **Plan vs. Reality Auditor**: Automated cross-referencing against `implementation_plan.md` calculating Plan Adherence Rate (%), scope creep detection, and missed intentions.
- **Hallucination & Security Scanner**: Leaked credential detection (`sk-`, `AIzaSy`, `ghp_`), destructive overwrite protection, and command doom loop detection.
- **Multi-Agent Task Switching Sequence Diagram**: Real-time visualization of user, lead agent, and delegated subagent swarms with lifelines.
- **Latency & Bottleneck Profiler**: Automatic detection of the slowest steps with diagnostic classifications.
- **Token & Dollar Cost Accounting**: Live financial analysis with Gemini pricing tiers and peak context window gauge.
- **1-Click Standalone PR Export**: Self-contained HTML report export for GitHub Pull Requests and Slack.

## [0.2.0] - Live Tailing Engine & Churn Matrix

- **Native File Watcher**: Automatic polling and tailing of `transcript.jsonl` with real-time webview updates.
- **File Churn Matrix**: Risk heat-map pinpointing high-churn files where the agent repeatedly iterated.
- **Markdown Rendering**: Full GitHub-flavored markdown parsing for agent thoughts and plans.

## [0.1.0] - Initial Release

- **Activity Bar Integration**: Antigravity Sessions sidebar tree with timestamps and step count badges.
- **Webview Dashboard**: Interactive Mermaid flowchart of file modifications (`[NEW]`, `[EDIT]`, `[READ]`).
- **Native File Jumping**: Click any file event in the flowchart or operations table to open it natively in VS Code.
- **Subagent Swarms Tab**: Visualize hierarchical delegated tasks and subagents.
- **Step-by-Step Transcript**: Expandable model reasoning chains and parameter inspection.
- **Tool Analytics**: Metrics on tool usage distribution and error counts.
