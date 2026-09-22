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
