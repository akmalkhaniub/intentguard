/**
 * Universal Intent & Trace Specification (UTIS v1.0)
 * Core Domain Contract for IntentGuard.
 */

export type AgentBrand = 'claude' | 'antigravity' | 'codex' | 'custom';

export interface DeclaredIntent {
  hasPlan: boolean;
  plannedFiles: string[];
  plannedTasks: string[];
  userGoal: string;
}

export interface ScopeViolation {
  filePath: string;
  stepIndex: number;
  severity: 'WARNING' | 'CRITICAL';
  reason: string;
  suggestedAction: string;
}

export interface CircuitBreakerState {
  tripped: boolean;
  reason?: string;
  trippedStepIndex?: number;
  hotspotFiles: string[];
  destructiveTruncations: string[];
}

export interface GovernanceAudit {
  intentAdherenceRate: number; // 0 to 100
  plannedAndDone: string[];
  plannedAndMissed: string[];
  unplannedSpillFiles: string[];
  violations: ScopeViolation[];
  circuitBreaker: CircuitBreakerState;
  verdict: 'COMPLIANT' | 'DEVIATED' | 'CIRCUIT_TRIPPED';
  verdictSummary: string;
}

export interface ModelPricingTier {
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM: number;
  cacheWritePerM: number;
  provider: string;
}

export type DecisionNodeType = 'ROOT' | 'MILESTONE' | 'TOOL_EXEC' | 'PIVOT_RETRY' | 'SUBAGENT' | 'SPILL_ALERT';

export interface DecisionNode {
  id: string;
  stepIndex: number;
  timestamp?: string;
  parentId: string | null;
  childrenIds: string[];
  type: DecisionNodeType;
  label: string;
  summary: string;
  rationale?: string;
  filesTouched: string[];
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  steeringNudge?: string;
}

export interface DecisionTree {
  rootId: string;
  nodes: Record<string, DecisionNode>;
  totalBranches: number;
  pivotsCount: number;
  spillsCount: number;
}

export interface CircuitBreakerPolicy {
  enforcementMode: 'STRICT' | 'PERMISSIVE' | 'WARN_ONLY';
  maxAllowedSpills: number; // default: 0
  shrinkThresholdPercent: number; // default: 25
  blockedCommands: string[]; // e.g. ["rm -rf", "DROP TABLE", "git reset --hard"]
  autoRollbackOnTrip: boolean;
}

export interface LiveInterceptEvent {
  stepIndex: number;
  timestamp: string;
  filePath?: string;
  command?: string;
  severity: 'WARNING' | 'CRITICAL';
  reason: string;
  suggestedAction: string;
  revertCommand?: string;
  steeringNudge: string;
}
