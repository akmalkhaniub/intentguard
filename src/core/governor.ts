import * as path from 'path';
import { DeclaredIntent, GovernanceAudit, ScopeViolation, CircuitBreakerState } from './types';

export class IntentGovernor {
  /**
   * Parses implementation_plan.md into structured DeclaredIntent.
   */
  public static parsePlan(planMarkdown: string | undefined): DeclaredIntent {
    if (!planMarkdown || !planMarkdown.trim()) {
      return {
        hasPlan: false,
        plannedFiles: [],
        plannedTasks: [],
        userGoal: 'No implementation plan provided.'
      };
    }

    const plannedFilesSet = new Set<string>();
    const plannedTasks: string[] = [];

    // Extract files from markdown file links e.g. [file.ts](file:///...) or `path/to/file`
    const linkRegex = /\[([^\]]+\.[a-zA-Z0-9]+)\]\((?:file:\/\/\/[^\)]+|[^\)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(planMarkdown)) !== null) {
      if (match[1] && !match[1].includes('*') && !match[1].startsWith('http')) {
        plannedFilesSet.add(match[1].trim());
      }
    }

    // Extract backticked files
    const codeRegex = /`([a-zA-Z0-9_\-\.\/\\\:]+\.[a-zA-Z0-9]{1,6})`/g;
    while ((match = codeRegex.exec(planMarkdown)) !== null) {
      if (match[1] && !match[1].includes(' ') && !match[1].startsWith('http')) {
        plannedFilesSet.add(path.basename(match[1].trim()));
      }
    }

    // Extract proposed tasks
    const lines = planMarkdown.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('* [ ]')) {
        plannedTasks.push(trimmed.replace(/^[-*]\s*\[[ x]\]\s*/, ''));
      }
    }

    // Extract User Goal
    let userGoal = 'Follow implementation plan.';
    const goalMatch = planMarkdown.match(/#+\s*([^\n]+)/);
    if (goalMatch && goalMatch[1]) {
      userGoal = goalMatch[1].trim();
    }

    return {
      hasPlan: plannedFilesSet.size > 0 || plannedTasks.length > 0,
      plannedFiles: Array.from(plannedFilesSet),
      plannedTasks,
      userGoal
    };
  }

  /**
   * Audits session executions against declared intent.
   */
  public static auditSession(
    declaredIntent: DeclaredIntent,
    fileEvents: { stepIndex: number; action: string; path: string; details?: string; delta?: any }[],
    fileStats: { path: string; filename: string; edits: number; creates: number; views: number }[]
  ): GovernanceAudit {
    const executedFilesSet = new Set<string>();
    const fileEditCounts: Record<string, number> = {};
    const violations: ScopeViolation[] = [];
    const destructiveTruncations: string[] = [];
    const hotspotFiles: string[] = [];

    // Tally executions
    for (const ev of fileEvents) {
      if (ev.action === 'EDIT' || ev.action === 'WRITE' || ev.action === 'NEW') {
        const baseName = path.basename(ev.path);
        executedFilesSet.add(baseName);
        executedFilesSet.add(ev.path);
        fileEditCounts[baseName] = (fileEditCounts[baseName] || 0) + 1;

        // Check for sudden file shrink (>25% deletion)
        if (ev.delta) {
          const origLines = (ev.delta.targetContent || '').split('\n').length;
          const newLines = (ev.delta.replacementContent || ev.delta.codeContent || '').split('\n').length;
          if (origLines > 40 && newLines < origLines * 0.75) {
            destructiveTruncations.push(baseName);
            violations.push({
              filePath: ev.path,
              stepIndex: ev.stepIndex,
              severity: 'CRITICAL',
              reason: `Destructive file shrink: ${baseName} was reduced by ${Math.round((1 - newLines / origLines) * 100)}% (${origLines} -> ${newLines} lines).`,
              suggestedAction: `Review diff and consider rolling back Step #${ev.stepIndex}.`
            });
          }
        }
      }
    }

    // Check Churn Hotspots (Blast Radius)
    for (const [fName, count] of Object.entries(fileEditCounts)) {
      if (count >= 3) {
        hotspotFiles.push(fName);
      }
    }

    // Evaluate Scope Spill vs Declared Plan
    const plannedAndDone: string[] = [];
    const plannedAndMissed: string[] = [];
    const unplannedSpillFiles: string[] = [];

    if (declaredIntent.hasPlan) {
      for (const planned of declaredIntent.plannedFiles) {
        const pBase = path.basename(planned);
        if (executedFilesSet.has(pBase) || executedFilesSet.has(planned)) {
          plannedAndDone.push(planned);
        } else {
          plannedAndMissed.push(planned);
        }
      }

      // Check executed files for unannounced scope spill
      for (const stat of fileStats) {
        if (stat.edits > 0 || stat.creates > 0) {
          const isPlanned = declaredIntent.plannedFiles.some(
            p => path.basename(p) === stat.filename || stat.path.includes(p)
          );
          if (!isPlanned) {
            unplannedSpillFiles.push(stat.filename);
            violations.push({
              filePath: stat.path,
              stepIndex: 1,
              severity: 'WARNING',
              reason: `Requirement Spill: "${stat.filename}" was modified but was never listed in implementation_plan.md.`,
              suggestedAction: `Verify if "${stat.filename}" modification was intentional or accidental scope creep.`
            });
          }
        }
      }
    } else {
      // If no formal plan, all executed files are registered without penalty
      for (const stat of fileStats) {
        if (stat.edits > 0 || stat.creates > 0) {
          plannedAndDone.push(stat.filename);
        }
      }
    }

    // Circuit Breaker Evaluation
    let circuitTripped = false;
    let tripReason: string | undefined;

    if (destructiveTruncations.length > 0) {
      circuitTripped = true;
      tripReason = `Circuit Breaker: Destructive file shrink detected on ${destructiveTruncations.join(', ')}.`;
    } else if (hotspotFiles.length >= 2) {
      circuitTripped = true;
      tripReason = `Circuit Breaker: High churn blast-radius detected across multiple files (${hotspotFiles.join(', ')}).`;
    }

    const circuitBreaker: CircuitBreakerState = {
      tripped: circuitTripped,
      reason: tripReason,
      hotspotFiles,
      destructiveTruncations
    };

    // Calculate Adherence Rate
    const totalPlanned = declaredIntent.plannedFiles.length;
    let adherence = 100;
    if (totalPlanned > 0) {
      const completionFraction = plannedAndDone.length / totalPlanned;
      const spillPenalty = Math.min(40, unplannedSpillFiles.length * 10);
      adherence = Math.max(0, Math.min(100, Math.round(completionFraction * 100 - spillPenalty)));
    }

    let verdict: 'COMPLIANT' | 'DEVIATED' | 'CIRCUIT_TRIPPED' = 'COMPLIANT';
    let verdictSummary = 'Session faithfully executed declared intent with zero out-of-scope spill.';

    if (circuitBreaker.tripped) {
      verdict = 'CIRCUIT_TRIPPED';
      verdictSummary = tripReason || 'Circuit breaker tripped due to excessive churn or destructive truncations.';
    } else if (unplannedSpillFiles.length > 0 || adherence < 75) {
      verdict = 'DEVIATED';
      verdictSummary = `Scope spill detected: ${unplannedSpillFiles.length} unplanned file(s) modified (${unplannedSpillFiles.slice(0, 3).join(', ')}).`;
    }

    return {
      intentAdherenceRate: adherence,
      plannedAndDone,
      plannedAndMissed,
      unplannedSpillFiles,
      violations,
      circuitBreaker,
      verdict,
      verdictSummary
    };
  }
}
