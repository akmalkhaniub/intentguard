import { FileEvent, FileStat, SubagentEvent, CostMetrics, TimeMetrics, DiagnosticReport, RiskScanResult, PlanAudit, RollbackPlan } from '../sessionManager';

export type AgentBrand = 'antigravity' | 'claude' | 'codex' | 'cline';

export interface UniversalSessionSummary {
  conversationId: string;
  title: string;
  stepCount: number;
  lastModified: string;
  workspaceUris: string;
  brand: AgentBrand;
  modelName: string;
}

export interface ContextEngineeringMetrics {
  systemPromptTokens: number;
  sourceCodeTokens: number;
  reasoningTokens: number;
  toolOutputTokens: number;
  terminalNoiseTokens: number;
  cacheHitTokens: number;
  cacheCreationTokens: number;
  contextPoisoningDetected: boolean;
  poisoningReason?: string;
  cacheSavingsUsd: number;
}

export interface AgentLeaderboardEntry {
  brand: AgentBrand;
  displayName: string;
  sessionCount: number;
  avgCostUsd: number;
  avgDurationSec: number;
  firstPassSuccessRate: number; // percentage (0-100)
  avgPlanAdherence: number;     // percentage (0-100)
  totalTokensUsed: number;
  totalErrors: number;
}

export interface AgentLeaderboard {
  entries: AgentLeaderboardEntry[];
  totalSessions: number;
  fastestAgent: string;
  cheapestAgent: string;
  mostReliableAgent: string;
}

export interface AgentForkPacket {
  sourceBrand: AgentBrand;
  targetBrand: AgentBrand;
  conversationId: string;
  initialPrompt: string;
  lastError?: string;
  modifiedFiles: string[];
  gitDiffPreview: string;
  formattedHandOffPrompt: string;
}

export interface UniversalSessionDetail {
  conversationId: string;
  brand: AgentBrand;
  modelName: string;
  title: string;
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
  rollbackPlan: RollbackPlan;
  contextMetrics: ContextEngineeringMetrics;
  artifacts: {
    implementationPlan?: string;
    walkthrough?: string;
    taskLogs?: { name: string; path: string }[];
    scratchFiles?: string[];
  };
}

export interface AgentAdapter {
  readonly brand: AgentBrand;
  canHandle(conversationId: string): boolean;
  getSessions(): Promise<UniversalSessionSummary[]>;
  getSessionDetail(conversationId: string): UniversalSessionDetail;
}
