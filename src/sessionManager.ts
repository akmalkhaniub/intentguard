import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { AgentBrand, ContextEngineeringMetrics, AgentLeaderboard, AgentForkPacket } from './adapters/types';
import { AdapterRegistry } from './adapters/adapterRegistry';
import { IntentGovernor, GovernanceAudit, DeclaredIntent } from './core';

export interface SessionSummary {
  conversationId: string;
  title: string;
  stepCount: number;
  lastModified: string;
  workspaceUris: string;
  brand?: AgentBrand;
  modelName?: string;
}

export interface FileDelta {
  action: 'NEW' | 'EDIT' | 'WRITE';
  targetPath: string;
  filename: string;
  startLine?: number;
  endLine?: number;
  targetContent?: string;
  replacementContent?: string;
  codeContent?: string;
  unifiedDiff: string;
  rollbackCommand: string;
  reversePatch?: string;
}

export interface RollbackPlan {
  modifiedFiles: string[];
  fullRollbackCommand: string;
  filesCount: number;
}

export interface FileEvent {
  stepIndex: number;
  action: 'NEW' | 'EDIT' | 'WRITE' | 'READ' | 'COMMAND' | 'SUBAGENT';
  path: string;
  filename: string;
  details: string;
  durationSec: number;
  status: string;
  delta?: FileDelta;
}

export interface FileStat {
  path: string;
  filename: string;
  views: number;
  edits: number;
  creates: number;
  churnLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  exists: boolean;
}

export interface SubagentEvent {
  stepIndex: number;
  role: string;
  type: string;
  prompt: string;
  durationSec: number;
}

export interface StepBottleneck {
  stepIndex: number;
  durationSec: number;
  category: 'COMMAND' | 'REASONING' | 'FILE_EDIT' | 'RESEARCH' | 'SUBAGENT';
  summary: string;
  diagnosis: string;
}

export interface PlanAudit {
  hasPlan: boolean;
  plannedFiles: string[];
  executedFiles: string[];
  plannedAndDone: string[];
  plannedAndMissed: string[];
  unplannedEdits: string[];
  adherenceRate: number;
  verificationPlanned: string[];
  verificationExecuted: string[];
}

export interface CostMetrics {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  maxContextTokens: number;
  costBreakdown: string;
}

export interface DiagnosticIncident {
  stepIndex: number;
  type: 'ERROR' | 'RETRY_LOOP' | 'LONG_RUNNING_COMMAND';
  description: string;
  resolution: string;
}

export interface DiagnosticReport {
  verdict: 'HEALTHY' | 'RECOVERED_FROM_ERRORS' | 'FAILED_OR_INCOMPLETE';
  healthScore: number;
  executiveSummary: string;
  incidents: DiagnosticIncident[];
  recommendation: string;
}

export interface RiskFinding {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'SECRET_LEAK' | 'DESTRUCTIVE_EDIT' | 'COMMAND_DOOM_LOOP' | 'PHANTOM_DEPENDENCY';
  stepIndex: number;
  message: string;
  evidence: string;
}

export interface RiskScanResult {
  riskGrade: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: RiskFinding[];
  hasSecretLeak: boolean;
  hasDestructiveEdit: boolean;
  hasCommandDoomLoop: boolean;
}

export interface TimeMetrics {
  totalDurationSec: number;
  reasoningDurationSec: number;
  commandDurationSec: number;
  fileEditDurationSec: number;
  researchDurationSec: number;
  bottlenecks: StepBottleneck[];
  retryLoopsCount: number;
}

export interface SessionDetail {
  conversationId: string;
  title: string;
  brand?: AgentBrand;
  modelName?: string;
  totalSteps: number;
  steps: any[];
  fileEvents: FileEvent[];
  mermaidPhaseChart: string;
  mermaidSequenceChart: string;
  fileStats: FileStat[];
  subagents: SubagentEvent[];
  toolDistribution: { [toolName: string]: number };
  timeMetrics: TimeMetrics;
  costMetrics: CostMetrics;
  diagnosticReport: DiagnosticReport;
  riskScan: RiskScanResult;
  planAudit: PlanAudit;
  governanceAudit?: GovernanceAudit;
  rollbackPlan: RollbackPlan;
  contextMetrics?: ContextEngineeringMetrics;
  artifacts: {
    implementationPlan?: string;
    walkthrough?: string;
    taskLogs?: { name: string; path: string }[];
    scratchFiles?: string[];
  };
}

export class SessionManager {
  private homeDir: string;
  private antigravityDir: string;
  private brainDir: string;
  private _cachedSessions: SessionSummary[] | null = null;
  private _cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS: number = 10000;

  constructor() {
    this.homeDir = os.homedir();
    this.antigravityDir = path.join(this.homeDir, '.gemini', 'antigravity');
    this.brainDir = path.join(this.antigravityDir, 'brain');
  }

  public getBrainDir(): string {
    return this.brainDir;
  }

  public clearCache(): void {
    this._cachedSessions = null;
    this._cacheTimestamp = 0;
  }

  public async getSessions(forceRefresh: boolean = false): Promise<SessionSummary[]> {
    const now = Date.now();
    if (!forceRefresh && this._cachedSessions && (now - this._cacheTimestamp) < this.CACHE_TTL_MS) {
      return this._cachedSessions;
    }

    let antigravitySessions: SessionSummary[] = [];
    try {
      const liveSessions = await this.fetchFromLocalServer();
      if (liveSessions && liveSessions.length > 0) {
        antigravitySessions = liveSessions;
      }
    } catch {}

    if (antigravitySessions.length === 0) {
      antigravitySessions = this.fastScanBrain();
    }

    antigravitySessions.forEach(s => {
      s.brand = 'antigravity';
      s.modelName = 'Gemini 2.0 Flash';
    });

    const all = AdapterRegistry.getInstance().getAllSessions(antigravitySessions as any);
    this._cachedSessions = all;
    this._cacheTimestamp = now;
    return all;
  }

  private fetchFromLocalServer(): Promise<SessionSummary[]> {
    return new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:8520/api/conversations?limit=150', { timeout: 200 }, res => {
        if (res.statusCode !== 200) {
          return reject(new Error('Server responded with ' + res.statusCode));
        }
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            const mapped = data.map((item: any) => ({
              conversationId: item.conversation_id,
              title: item.title || 'Untitled Session',
              stepCount: item.step_count || 0,
              lastModified: item.last_modified || '',
              workspaceUris: item.workspace_uris || ''
            }));
            resolve(mapped);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });
    });
  }

  private fastScanBrain(): SessionSummary[] {
    if (!fs.existsSync(this.brainDir)) {
      return [];
    }

    const items = fs.readdirSync(this.brainDir, { withFileTypes: true });
    const summaries: SessionSummary[] = [];

    for (const item of items) {
      if (!item.isDirectory() || item.name === 'tempmediaStorage') {
        continue;
      }

      const convId = item.name;
      const logDir = path.join(this.brainDir, convId, '.system_generated', 'logs');
      let transcriptPath = path.join(logDir, 'transcript.jsonl');
      if (!fs.existsSync(transcriptPath)) {
        transcriptPath = path.join(logDir, 'transcript_full.jsonl');
      }

      let title = `Session ${convId.substring(0, 8)}`;
      let lastMod = '';
      let stepCount = 0;

      if (fs.existsSync(transcriptPath)) {
        try {
          const stat = fs.statSync(transcriptPath);
          lastMod = stat.mtime.toISOString().substring(0, 19).replace('T', ' ');
          stepCount = Math.max(1, Math.round(stat.size / 900));

          const fd = fs.openSync(transcriptPath, 'r');
          const buf = Buffer.alloc(1024);
          const bytesRead = fs.readSync(fd, buf, 0, 1024, 0);
          fs.closeSync(fd);

          const firstLine = buf.toString('utf8', 0, bytesRead).split('\n')[0];
          if (firstLine) {
            try {
              const parsed = JSON.parse(firstLine);
              if (parsed.content) {
                const clean = parsed.content
                  .replace(/<USER_REQUEST>/g, '')
                  .replace(/<\/USER_REQUEST>/g, '')
                  .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
                  .trim();
                if (clean.length > 0) {
                  title = clean.substring(0, 50).split('\n')[0];
                }
              }
            } catch {}
          }
        } catch {}
      }

      summaries.push({
        conversationId: convId,
        title: title,
        stepCount: stepCount,
        lastModified: lastMod,
        workspaceUris: ''
      });
    }

    return summaries.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  }

  public getSessionDetail(conversationId: string): SessionDetail {
    const adapter = AdapterRegistry.getInstance().getAdapterForSession(conversationId);
    if (adapter) {
      return adapter.getSessionDetail(conversationId) as any;
    }

    const cBrain = path.join(this.brainDir, conversationId);
    let transcriptFile = path.join(cBrain, '.system_generated', 'logs', 'transcript.jsonl');
    const fullTranscriptFile = path.join(cBrain, '.system_generated', 'logs', 'transcript_full.jsonl');

    if (!fs.existsSync(transcriptFile) && fs.existsSync(fullTranscriptFile)) {
      transcriptFile = fullTranscriptFile;
    }

    const steps: any[] = [];
    if (fs.existsSync(transcriptFile)) {
      const content = fs.readFileSync(transcriptFile, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            steps.push(JSON.parse(trimmed));
          } catch {}
        }
      }
    }

    // 1. Compute Step Durations & Token Usage
    let estimatedInputChars = 0;
    let estimatedOutputChars = 0;
    let maxStepContextChars = 0;

    for (let i = 0; i < steps.length; i++) {
      const curr = steps[i];
      const currTime = curr.created_at ? new Date(curr.created_at).getTime() : 0;
      const nextTime = i + 1 < steps.length && steps[i + 1].created_at ? new Date(steps[i + 1].created_at).getTime() : 0;
      let dur = 0;
      if (currTime > 0 && nextTime > 0 && nextTime >= currTime) {
        dur = Math.round((nextTime - currTime) / 1000);
        if (dur > 600) dur = 600;
      }
      curr.durationSec = dur;

      const contentLen = (curr.content || '').length;
      const thinkingLen = (curr.thinking || '').length;
      const toolsLen = JSON.stringify(curr.tool_calls || []).length;

      if (curr.source === 'USER_EXPLICIT' || curr.type === 'USER_INPUT') {
        estimatedInputChars += contentLen;
      } else {
        estimatedOutputChars += contentLen + thinkingLen + toolsLen;
      }

      const currentContextChars = estimatedInputChars + estimatedOutputChars;
      if (currentContextChars > maxStepContextChars) {
        maxStepContextChars = currentContextChars;
      }
    }

    const inputTokens = Math.max(100, Math.round(estimatedInputChars / 4));
    const outputTokens = Math.max(100, Math.round(estimatedOutputChars / 4));
    const totalTokens = inputTokens + outputTokens;
    const maxContextTokens = Math.round(maxStepContextChars / 4);

    // Model-aware rate card
    let inputRatePerM = 0.10;
    let outputRatePerM = 0.40;
    const modelLower = (steps.find(s => s.model)?.model || '').toLowerCase();
    if (modelLower.includes('pro')) {
      inputRatePerM = 1.25;
      outputRatePerM = 5.00;
    } else if (modelLower.includes('claude')) {
      inputRatePerM = 3.00;
      outputRatePerM = 15.00;
    } else if (modelLower.includes('gpt') || modelLower.includes('codex') || modelLower.includes('o3') || modelLower.includes('o1')) {
      inputRatePerM = 2.50;
      outputRatePerM = 10.00;
    }

    const inputCost = (inputTokens / 1_000_000) * inputRatePerM;
    const outputCost = (outputTokens / 1_000_000) * outputRatePerM;
    const totalCostUsd = Math.round((inputCost + outputCost) * 10000) / 10000;

    const costMetrics: CostMetrics = {
      totalTokens,
      inputTokens,
      outputTokens,
      estimatedCostUsd: Math.max(0.0001, totalCostUsd),
      maxContextTokens,
      costBreakdown: `Input: $${inputCost.toFixed(5)} (${inputTokens.toLocaleString()} tok @ $${inputRatePerM}/M) | Output: $${outputCost.toFixed(5)} (${outputTokens.toLocaleString()} tok @ $${outputRatePerM}/M)`
    };

    // 2. Parse Artifacts, Background Tasks, and Scratchpad
    const artifacts: { implementationPlan?: string; walkthrough?: string; taskLogs?: { name: string; path: string }[]; scratchFiles?: string[] } = {};
    const planFile = path.join(cBrain, 'implementation_plan.md');
    if (fs.existsSync(planFile)) {
      artifacts.implementationPlan = fs.readFileSync(planFile, 'utf8');
    }
    const walkthroughFile = path.join(cBrain, 'walkthrough.md');
    if (fs.existsSync(walkthroughFile)) {
      artifacts.walkthrough = fs.readFileSync(walkthroughFile, 'utf8');
    }

    const tasksDir = path.join(cBrain, '.system_generated', 'tasks');
    if (fs.existsSync(tasksDir)) {
      try {
        const files = fs.readdirSync(tasksDir);
        artifacts.taskLogs = files.filter(f => f.endsWith('.log')).map(f => ({ name: f, path: path.join(tasksDir, f) }));
      } catch {}
    }

    const scratchDir = path.join(cBrain, 'scratch');
    if (fs.existsSync(scratchDir)) {
      try {
        const files = fs.readdirSync(scratchDir);
        artifacts.scratchFiles = files.map(f => path.join(scratchDir, f));
      } catch {}
    }

    // 3. Process Events, Bottlenecks, and Risk Scan
    const fileEvents: FileEvent[] = [];
    const fileSummaryMap: { [filePath: string]: FileStat } = {};
    const subagents: SubagentEvent[] = [];
    const toolCounts: { [toolName: string]: number } = {};
    const bottlenecks: StepBottleneck[] = [];
    const incidents: DiagnosticIncident[] = [];
    const riskFindings: RiskFinding[] = [];

    const sequenceLines: string[] = [
      'sequenceDiagram',
      '    autonumber',
      '    actor User',
      '    participant Lead as Antigravity (Lead)'
    ];
    const registeredParticipants = new Set<string>(['User', 'Lead']);

    let totalReasoningTime = 0;
    let totalCommandTime = 0;
    let totalFileEditTime = 0;
    let totalResearchTime = 0;
    let retryLoopsCount = 0;
    let lastEditedFile = '';
    let lastCmd = '';
    let lastCmdFailed = false;
    let failedStepsCount = 0;

    // Regex for credentials & tokens
    const secretRegex = /(?:sk-[a-zA-Z0-9]{20,}|AIzaSy[a-zA-Z0-9_-]{33}|ghp_[a-zA-Z0-9]{36}|bearer\s+[a-zA-Z0-9_\-\.]{25,}|password\s*[:=]\s*["'][^"']{6,}["'])/i;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepIdx = step.step_index ?? i;
      const dur = step.durationSec || 0;
      const status = step.status || 'DONE';
      const toolCalls = step.tool_calls || [];
      const hasThinking = Boolean(step.thinking);
      const rawContent = (step.content || '') + ' ' + (step.thinking || '');

      // Check for secret leaks
      const secretMatch = secretRegex.exec(rawContent);
      if (secretMatch) {
        riskFindings.push({
          severity: 'CRITICAL',
          category: 'SECRET_LEAK',
          stepIndex: stepIdx,
          message: 'Potential secret, API key, or credential pattern detected in step output.',
          evidence: secretMatch[0].substring(0, 10) + '...'
        });
      }

      if (status === 'ERROR') {
        failedStepsCount++;
        incidents.push({
          stepIndex: stepIdx,
          type: 'ERROR',
          description: `Step #${stepIdx} exited with ERROR status.`,
          resolution: 'Agent analyzed error in subsequent step.'
        });
      }

      if (step.source === 'USER_EXPLICIT' || step.type === 'USER_INPUT') {
        const userSummary = (step.content || 'User Request')
          .replace(/<USER_REQUEST>/g, '')
          .replace(/<\/USER_REQUEST>/g, '')
          .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
          .trim()
          .substring(0, 45).replace(/"/g, "'");
        sequenceLines.push(`    User->>Lead: "${userSummary || 'User Request'}"`);
      }

      if (hasThinking) {
        totalReasoningTime += dur;
        if (dur >= 25) {
          bottlenecks.push({
            stepIndex: stepIdx,
            durationSec: dur,
            category: 'REASONING',
            summary: `Model Thinking (${dur}s)`,
            diagnosis: `Complex multi-step reasoning or high-context evaluation.`
          });
        }
      }

      for (const tc of toolCalls) {
        const name = tc.name || 'unknown';
        toolCounts[name] = (toolCounts[name] || 0) + 1;
        let args = tc.args || {};
        if (typeof args === 'string') {
          try { args = JSON.parse(args); } catch {}
        }

        let actionType: 'NEW' | 'EDIT' | 'WRITE' | 'READ' | 'COMMAND' | 'SUBAGENT' | null = null;
        let targetPath: string | null = null;
        let details = '';
        let delta: FileDelta | undefined = undefined;

        if (name === 'replace_file_content') {
          actionType = 'EDIT';
          targetPath = args.TargetFile || args.target_file;
          details = args.Instruction || args.instruction || 'Modify content';
          totalFileEditTime += dur;

          if (targetPath) {
            const cleanPath = targetPath.replace(/["']/g, '');
            const filename = path.basename(cleanPath) || cleanPath;
            const targetContent = args.TargetContent || args.target_content || '';
            const replacementContent = args.ReplacementContent || args.replacement_content || '';
            const startLine = args.StartLine || args.start_line;
            const endLine = args.EndLine || args.end_line;

            const origLines = targetContent ? targetContent.split('\n') : [];
            const newLines = replacementContent ? replacementContent.split('\n') : [];
            const diffLines: string[] = [
              `--- a/${filename}`,
              `+++ b/${filename}`,
              `@@ -${startLine || 1},${origLines.length} +${startLine || 1},${newLines.length} @@`
            ];
            origLines.forEach(l => diffLines.push('- ' + l));
            newLines.forEach(l => diffLines.push('+ ' + l));
            const unifiedDiff = diffLines.join('\n');

            const revLines: string[] = [
              `--- a/${filename}`,
              `+++ b/${filename}`,
              `@@ -${startLine || 1},${newLines.length} +${startLine || 1},${origLines.length} @@`
            ];
            newLines.forEach(l => revLines.push('- ' + l));
            origLines.forEach(l => revLines.push('+ ' + l));
            const reversePatch = revLines.join('\n');

            delta = {
              action: 'EDIT',
              targetPath: cleanPath,
              filename,
              startLine,
              endLine,
              targetContent,
              replacementContent,
              unifiedDiff,
              rollbackCommand: `git restore "${cleanPath}"`,
              reversePatch
            };
            tc.delta = delta;
          }
        } else if (name === 'write_to_file') {
          const overwrite = args.Overwrite ?? false;
          actionType = overwrite ? 'WRITE' : 'NEW';
          targetPath = args.TargetFile || args.target_file;
          details = args.Description || args.description || 'Write file';
          totalFileEditTime += dur;

          if (targetPath) {
            const cleanPath = targetPath.replace(/["']/g, '');
            const filename = path.basename(cleanPath) || cleanPath;
            const codeContent = args.CodeContent || args.code_content || '';
            const codeLines = codeContent.split('\n');

            const diffLines: string[] = [
              `--- /dev/null`,
              `+++ b/${filename}`,
              `@@ -0,0 +1,${codeLines.length} @@`
            ];
            codeLines.slice(0, 80).forEach(l => diffLines.push('+ ' + l));
            if (codeLines.length > 80) diffLines.push(`+ ... (${codeLines.length - 80} more lines)`);
            const unifiedDiff = diffLines.join('\n');

            delta = {
              action: overwrite ? 'WRITE' : 'NEW',
              targetPath: cleanPath,
              filename,
              codeContent,
              unifiedDiff,
              rollbackCommand: overwrite ? `git restore "${cleanPath}"` : `git clean -f "${cleanPath}"`
            };
            tc.delta = delta;
          }

          // Check for destructive truncate: overwrite with very few lines
          const codeLines = (args.CodeContent || '').split('\n').length;
          if (overwrite && codeLines < 5) {
            riskFindings.push({
              severity: 'WARNING',
              category: 'DESTRUCTIVE_EDIT',
              stepIndex: stepIdx,
              message: `Potential file truncation: ${path.basename(targetPath || '')} overwritten with only ${codeLines} lines.`,
              evidence: `File: ${targetPath}`
            });
          }

        } else if (name === 'view_file' || name === 'grep_search' || name === 'find_by_name' || name === 'list_dir') {
          actionType = 'READ';
          targetPath = args.AbsolutePath || args.absolute_path || args.SearchPath || args.DirectoryPath;
          details = `Inspect ${name}`;
          totalResearchTime += dur;
        } else if (name === 'run_command') {
          const cmd = args.CommandLine || args.command_line || '';
          totalCommandTime += dur;

          // Doom loop detection
          if (cmd === lastCmd && lastCmdFailed) {
            riskFindings.push({
              severity: 'WARNING',
              category: 'COMMAND_DOOM_LOOP',
              stepIndex: stepIdx,
              message: `Repetitive command execution: '${cmd.substring(0, 30)}...' ran multiple times after failing.`,
              evidence: cmd
            });
          }
          lastCmd = cmd;
          lastCmdFailed = (status === 'ERROR');

          if (dur >= 15) {
            bottlenecks.push({
              stepIndex: stepIdx,
              durationSec: dur,
              category: 'COMMAND',
              summary: `${cmd.substring(0, 35)} (${dur}s)`,
              diagnosis: `Long-running terminal execution (build, package manager, or test suite).`
            });
          }

          fileEvents.push({
            stepIndex: stepIdx,
            action: 'COMMAND',
            path: cmd,
            filename: cmd.length > 40 ? cmd.substring(0, 40) + '...' : cmd,
            details: args.toolSummary || 'Shell command',
            durationSec: dur,
            status: status
          });

          const safeCmd = cmd.substring(0, 30).replace(/["'\\]/g, ' ');
          sequenceLines.push(`    Lead->>Lead: run_command("${safeCmd}")`);
          continue;

        } else if (name === 'invoke_subagent') {
          const subList = args.Subagents || [];
          for (const sub of subList) {
            const role = sub.Role || 'Subagent';
            const cleanPartId = role.replace(/[^a-zA-Z0-9]/g, '');
            if (!registeredParticipants.has(cleanPartId)) {
              registeredParticipants.add(cleanPartId);
              sequenceLines.splice(4, 0, `    participant ${cleanPartId} as ${role}`);
            }

            subagents.push({
              stepIndex: stepIdx,
              role: role,
              type: sub.TypeName || 'subagent',
              prompt: sub.Prompt || '',
              durationSec: dur
            });

            const promptSnippet = (sub.Prompt || '').substring(0, 40).replace(/["'\\]/g, ' ');
            sequenceLines.push(`    Lead->>${cleanPartId}: invoke_subagent("${promptSnippet}")`);
            sequenceLines.push(`    activate ${cleanPartId}`);
            sequenceLines.push(`    ${cleanPartId}-->>Lead: Task complete`);
            sequenceLines.push(`    deactivate ${cleanPartId}`);
          }

          fileEvents.push({
            stepIndex: stepIdx,
            action: 'SUBAGENT',
            path: `Subagents: ${subList.length}`,
            filename: 'Subagent Swarm',
            details: `Invoked ${subList.length} subagent(s)`,
            durationSec: dur,
            status: status
          });
          continue;
        }

        if (targetPath) {
          const cleanPath = targetPath.replace(/["']/g, '');
          const filename = path.basename(cleanPath) || cleanPath;

          if (cleanPath === lastEditedFile && (actionType === 'EDIT' || actionType === 'WRITE')) {
            retryLoopsCount++;
            incidents.push({
              stepIndex: stepIdx,
              type: 'RETRY_LOOP',
              description: `Consecutive edit to ${filename} (Self-correction / debugging).`,
              resolution: 'Resolved in subsequent steps.'
            });
          }
          if (actionType === 'EDIT' || actionType === 'WRITE') {
            lastEditedFile = cleanPath;
          }

          if (!fileSummaryMap[cleanPath]) {
            fileSummaryMap[cleanPath] = {
              path: cleanPath,
              filename: filename,
              views: 0,
              edits: 0,
              creates: 0,
              churnLevel: 'LOW',
              exists: fs.existsSync(cleanPath)
            };
          }

          if (actionType === 'READ') {
            fileSummaryMap[cleanPath].views++;
          } else if (actionType === 'NEW') {
            fileSummaryMap[cleanPath].creates++;
            sequenceLines.push(`    Lead->>Lead: Create "${filename}"`);
          } else {
            fileSummaryMap[cleanPath].edits++;
            sequenceLines.push(`    Lead->>Lead: Edit "${filename}"`);
          }

          const totalTouches = fileSummaryMap[cleanPath].edits + fileSummaryMap[cleanPath].creates;
          if (totalTouches >= 3) {
            fileSummaryMap[cleanPath].churnLevel = 'HIGH';
          } else if (totalTouches === 2) {
            fileSummaryMap[cleanPath].churnLevel = 'MEDIUM';
          } else {
            fileSummaryMap[cleanPath].churnLevel = 'LOW';
          }

          fileEvents.push({
            stepIndex: stepIdx,
            action: actionType,
            path: cleanPath,
            filename: filename,
            details: details,
            durationSec: dur,
            status: status,
            delta: delta
          });
        }
      }
    }

    bottlenecks.sort((a, b) => b.durationSec - a.durationSec);

    // 4. Smart Scalable Phase Aggregation
    const fileStatsList = Object.values(fileSummaryMap);
    const readFiles = fileStatsList.filter(f => f.views > 0);
    const createdFiles = fileStatsList.filter(f => f.creates > 0);
    const editedFiles = fileStatsList.filter(f => f.edits > 0);
    const commandsList = fileEvents.filter(e => e.action === 'COMMAND');

    const phaseLines: string[] = ['flowchart LR'];

    phaseLines.push(`    subgraph P1["🔍 1. Discovery (${readFiles.length} files inspected)"]`);
    phaseLines.push('        direction TB');
    if (readFiles.length === 0) {
      phaseLines.push('        r_none["Direct start (No prior reads)"]');
    } else {
      readFiles.slice(0, 4).forEach((f, idx) => {
        phaseLines.push(`        r_${idx}["👁️ ${f.filename}"]`);
      });
      if (readFiles.length > 4) {
        phaseLines.push(`        r_more["... and ${readFiles.length - 4} more files"]`);
      }
    }
    phaseLines.push('    end');

    const totalModCount = createdFiles.length + editedFiles.length;
    phaseLines.push(`    subgraph P2["⚡ 2. Implementation (${totalModCount} files modified)"]`);
    phaseLines.push('        direction TB');
    if (totalModCount === 0) {
      phaseLines.push('        imp_none["No file modifications"]');
    } else {
      const topModified = fileStatsList
        .filter(f => f.edits > 0 || f.creates > 0)
        .sort((a, b) => (b.edits + b.creates) - (a.edits + a.creates));

      topModified.slice(0, 6).forEach((f, idx) => {
        const tag = f.creates > 0 ? '📄 New' : '✏️ Edit';
        const churnText = (f.edits + f.creates) > 1 ? ` (${f.edits + f.creates}x churn)` : '';
        phaseLines.push(`        imp_${idx}["${tag}: ${f.filename}${churnText}"]`);
      });
      if (topModified.length > 6) {
        phaseLines.push(`        imp_more["... and ${topModified.length - 6} more files"]`);
      }
    }
    phaseLines.push('    end');

    phaseLines.push(`    subgraph P3["🧪 3. Verification (${commandsList.length} commands run)"]`);
    phaseLines.push('        direction TB');
    if (commandsList.length === 0) {
      phaseLines.push('        v_none["No commands executed"]');
    } else {
      commandsList.slice(0, 4).forEach((c, idx) => {
        const safe = c.filename.substring(0, 26).replace(/["'\\]/g, ' ');
        phaseLines.push(`        v_${idx}["💻 ${safe}"]`);
      });
      if (commandsList.length > 4) {
        phaseLines.push(`        v_more["... and ${commandsList.length - 4} more commands"]`);
      }
    }
    phaseLines.push('    end');

    phaseLines.push('    P1 ==> P2');
    phaseLines.push('    P2 ==> P3');

    const mermaidPhaseChart = phaseLines.join('\n');

    const mermaidSequenceChart = sequenceLines.length > 4 
      ? sequenceLines.join('\n') 
      : 'sequenceDiagram\n    actor User\n    participant Lead as Antigravity\n    User->>Lead: No agent handoffs recorded';

    // 5. Automated Diagnostic Report
    let healthScore = 100;
    if (failedStepsCount > 0) healthScore -= (failedStepsCount * 12);
    if (retryLoopsCount > 0) healthScore -= (retryLoopsCount * 8);
    if (riskFindings.some(f => f.severity === 'CRITICAL')) healthScore -= 30;
    healthScore = Math.max(15, Math.min(100, healthScore));

    let verdict: 'HEALTHY' | 'RECOVERED_FROM_ERRORS' | 'FAILED_OR_INCOMPLETE' = 'HEALTHY';
    if (failedStepsCount > 0 && retryLoopsCount > 0) {
      verdict = 'RECOVERED_FROM_ERRORS';
    } else if (failedStepsCount > 2) {
      verdict = 'FAILED_OR_INCOMPLETE';
    }

    let summaryText = `The session executed ${steps.length} steps touching ${fileStatsList.length} files. `;
    if (retryLoopsCount > 0) {
      summaryText += `Detected ${retryLoopsCount} self-correction loops where files were re-edited to fix issues. `;
    }
    if (bottlenecks.length > 0) {
      summaryText += `Primary bottleneck was step #${bottlenecks[0].stepIndex} (${bottlenecks[0].durationSec}s).`;
    }

    const diagnosticReport: DiagnosticReport = {
      verdict,
      healthScore,
      executiveSummary: summaryText,
      incidents: incidents.slice(0, 6),
      recommendation: verdict === 'HEALTHY' 
        ? 'Code changes appear clean with minimal churn. Safe to merge after running standard tests.' 
        : 'Review files with high churn (marked 🔥) to verify bugfix logic before deploying.'
    };

    // 6. Risk Scan Result
    let riskGrade: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskFindings.some(f => f.severity === 'CRITICAL')) riskGrade = 'CRITICAL';
    else if (riskFindings.some(f => f.severity === 'WARNING')) riskGrade = 'MEDIUM';

    const riskScan: RiskScanResult = {
      riskGrade,
      findings: riskFindings,
      hasSecretLeak: riskFindings.some(f => f.category === 'SECRET_LEAK'),
      hasDestructiveEdit: riskFindings.some(f => f.category === 'DESTRUCTIVE_EDIT'),
      hasCommandDoomLoop: riskFindings.some(f => f.category === 'COMMAND_DOOM_LOOP')
    };

    // 7. Plan vs. Reality Audit & IntentGuard Governance
    const planAudit = this.auditPlanVsReality(artifacts.implementationPlan, fileEvents);
    const declaredIntent: DeclaredIntent = IntentGovernor.parsePlan(artifacts.implementationPlan);
    const governanceAudit: GovernanceAudit = IntentGovernor.auditSession(declaredIntent, fileEvents, fileStatsList);
    const totalSessionTime = totalReasoningTime + totalCommandTime + totalFileEditTime + totalResearchTime;

    // 8. Rollback & Revert Plan
    const modifiedSet = new Set<string>();
    fileEvents.forEach(e => {
      if (e.action === 'EDIT' || e.action === 'WRITE' || e.action === 'NEW') {
        if (e.path && e.path !== 'unknown') {
          modifiedSet.add(e.path);
        }
      }
    });
    const modifiedFiles = Array.from(modifiedSet);
    const fullRollbackCommand = modifiedFiles.length > 0
      ? `git restore ${modifiedFiles.map(f => `"${f}"`).join(' ')}`
      : '# No modified files to restore in this session';

    const rollbackPlan: RollbackPlan = {
      modifiedFiles,
      fullRollbackCommand,
      filesCount: modifiedFiles.length
    };

    // 9. Context Engineering & Window Metrics
    let totalPromptChars = 0;
    let totalToolChars = 0;
    let totalThinkingChars = 0;
    let terminalOutputChars = 0;

    for (const step of steps) {
      if (step.content) totalPromptChars += step.content.length;
      if (step.thinking) totalThinkingChars += step.thinking.length;
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          const tcStr = JSON.stringify(tc.args || {});
          totalToolChars += tcStr.length;
          if (tc.name === 'run_command') {
            terminalOutputChars += tcStr.length;
          }
        }
      }
    }

    const totalChars = totalPromptChars + totalToolChars + totalThinkingChars;
    const estContextTokens = Math.max(1, Math.round(totalChars / 4));
    const isPoisoned = terminalOutputChars > totalChars * 0.25;

    const contextMetrics: ContextEngineeringMetrics = {
      systemPromptTokens: 2800,
      sourceCodeTokens: Math.round((totalToolChars / 4) * 0.6),
      reasoningTokens: Math.round(totalThinkingChars / 4),
      toolOutputTokens: Math.round((totalToolChars / 4) * 0.4),
      terminalNoiseTokens: Math.round(terminalOutputChars / 4),
      cacheHitTokens: Math.round(estContextTokens * 0.35),
      cacheCreationTokens: Math.round(estContextTokens * 0.1),
      contextPoisoningDetected: isPoisoned,
      poisoningReason: isPoisoned ? 'High terminal command output consumed >25% of active prompt context.' : undefined,
      cacheSavingsUsd: (estContextTokens * 0.35) * 0.0000001
    };

    return {
      conversationId: conversationId,
      brand: 'antigravity',
      modelName: 'Gemini 2.0 Flash',
      title: `Session ${conversationId.substring(0, 8)}`,
      totalSteps: steps.length,
      steps: steps,
      fileEvents: fileEvents,
      mermaidPhaseChart: mermaidPhaseChart,
      mermaidSequenceChart: mermaidSequenceChart,
      fileStats: fileStatsList,
      subagents: subagents,
      toolDistribution: toolCounts,
      timeMetrics: {
        totalDurationSec: totalSessionTime,
        reasoningDurationSec: totalReasoningTime,
        commandDurationSec: totalCommandTime,
        fileEditDurationSec: totalFileEditTime,
        researchDurationSec: totalResearchTime,
        bottlenecks: bottlenecks.slice(0, 5),
        retryLoopsCount: retryLoopsCount
      },
      costMetrics: costMetrics,
      diagnosticReport: diagnosticReport,
      riskScan: riskScan,
      planAudit: planAudit,
      governanceAudit: governanceAudit,
      rollbackPlan: rollbackPlan,
      contextMetrics: contextMetrics,
      artifacts: artifacts
    };
  }

  public getLeaderboard(allSessions: SessionDetail[]): AgentLeaderboard {
    return AdapterRegistry.getInstance().computeLeaderboard(allSessions as any);
  }

  public createForkPacket(sourceDetail: SessionDetail, targetBrand: AgentBrand): AgentForkPacket {
    return AdapterRegistry.getInstance().createForkPacket(sourceDetail as any, targetBrand);
  }

  private auditPlanVsReality(planMarkdown: string | undefined, fileEvents: FileEvent[]): PlanAudit {
    if (!planMarkdown) {
      return {
        hasPlan: false,
        plannedFiles: [],
        executedFiles: Array.from(new Set(fileEvents.map(e => e.filename))),
        plannedAndDone: [],
        plannedAndMissed: [],
        unplannedEdits: [],
        adherenceRate: 0,
        verificationPlanned: [],
        verificationExecuted: []
      };
    }

    const plannedFilesSet = new Set<string>();
    const fileRegex = /####\s+\[(MODIFY|NEW|DELETE)\]\s+\[?([a-zA-Z0-9_\-\.\/\\]+)\]?/gi;
    let match;
    while ((match = fileRegex.exec(planMarkdown)) !== null) {
      if (match[2]) {
        plannedFilesSet.add(path.basename(match[2].trim()));
      }
    }

    const linkRegex = /\[([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)\]\(file:\/\/\/[^\)]+\)/gi;
    while ((match = linkRegex.exec(planMarkdown)) !== null) {
      if (match[1]) {
        plannedFilesSet.add(match[1].trim());
      }
    }

    const plannedFiles = Array.from(plannedFilesSet);
    const executedFilesSet = new Set<string>();
    fileEvents.forEach(e => {
      if (e.action === 'NEW' || e.action === 'EDIT' || e.action === 'WRITE') {
        executedFilesSet.add(e.filename);
      }
    });
    const executedFiles = Array.from(executedFilesSet);

    const plannedAndDone = plannedFiles.filter(f => executedFilesSet.has(f));
    const plannedAndMissed = plannedFiles.filter(f => !executedFilesSet.has(f));
    const unplannedEdits = executedFiles.filter(f => !plannedFilesSet.has(f));

    const totalPlanned = plannedFiles.length || 1;
    const adherenceRate = Math.round((plannedAndDone.length / totalPlanned) * 100);

    return {
      hasPlan: true,
      plannedFiles: plannedFiles,
      executedFiles: executedFiles,
      plannedAndDone: plannedAndDone,
      plannedAndMissed: plannedAndMissed,
      unplannedEdits: unplannedEdits,
      adherenceRate: adherenceRate,
      verificationPlanned: [],
      verificationExecuted: []
    };
  }
}
