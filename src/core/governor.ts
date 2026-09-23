import * as path from 'path';
import { DeclaredIntent, GovernanceAudit, ScopeViolation, CircuitBreakerState, DecisionNode, DecisionTree, CircuitBreakerPolicy, LiveInterceptEvent } from './types';

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

  /**
   * Constructs an interactive Tree-of-Thought (ToT) decision graph.
   * Identifies milestones, exploratory pivots/retries, subagent delegations, and scope spill events.
   */
  public static buildDecisionTree(
    steps: Array<{
      stepIndex: number;
      type?: string;
      toolCalls?: Array<{ toolName: string; args?: any; summary?: string }>;
      thinking?: string;
      content?: string;
      status?: string;
      timestamp?: string;
    }>,
    fileEvents: Array<{ stepIndex: number; action: string; path: string; details?: string }>,
    declaredIntent: DeclaredIntent,
    subagents: Array<{ stepIndex: number; role: string; type: string; prompt: string }> = []
  ): DecisionTree {
    const nodes: Record<string, DecisionNode> = {};
    const rootId = 'node-root';
    let totalBranches = 1;
    let pivotsCount = 0;
    let spillsCount = 0;

    // 1. Create Root Decision Node
    const initialPrompt = steps.find(s => s.type === 'USER_INPUT')?.content || declaredIntent.userGoal || 'User Task Request';
    const rootSummary = initialPrompt.length > 120 ? initialPrompt.substring(0, 117) + '...' : initialPrompt;

    nodes[rootId] = {
      id: rootId,
      stepIndex: 0,
      timestamp: steps[0]?.timestamp || new Date().toISOString(),
      parentId: null,
      childrenIds: [],
      type: 'ROOT',
      label: 'Goal Specification',
      summary: rootSummary,
      rationale: declaredIntent.userGoal,
      filesTouched: declaredIntent.plannedFiles,
      status: 'SUCCESS',
      steeringNudge: `Focus purely on declared goal: "${declaredIntent.userGoal}". Planned scope: ${declaredIntent.plannedFiles.join(', ') || 'Self-contained'}.`
    };

    let currentNodeId = rootId;

    // Map subagents by stepIndex
    const subagentByStep: Record<number, { role: string; type: string; prompt: string }> = {};
    for (const sub of subagents) {
      subagentByStep[sub.stepIndex] = sub;
    }

    // Map file events by stepIndex
    const fileEventsByStep: Record<number, Array<{ action: string; path: string }>> = {};
    for (const fe of fileEvents) {
      if (!fileEventsByStep[fe.stepIndex]) fileEventsByStep[fe.stepIndex] = [];
      fileEventsByStep[fe.stepIndex].push(fe);
    }

    // Track previously touched files to detect out-of-scope spill
    const plannedSet = new Set(declaredIntent.plannedFiles.map(f => path.basename(f).toLowerCase()));

    // 2. Iterate through steps and extract decision nodes
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepIdx = step.stepIndex ?? i;
      const sub = subagentByStep[stepIdx];
      const stepFiles = fileEventsByStep[stepIdx] || [];
      const touchedBases = stepFiles.map(f => path.basename(f.path));

      // Check if this step is a Subagent delegation
      if (sub) {
        totalBranches++;
        const subId = `node-subagent-${stepIdx}`;
        nodes[subId] = {
          id: subId,
          stepIndex: stepIdx,
          timestamp: step.timestamp,
          parentId: currentNodeId,
          childrenIds: [],
          type: 'SUBAGENT',
          label: `Subagent: ${sub.role || sub.type}`,
          summary: sub.prompt.length > 140 ? sub.prompt.substring(0, 137) + '...' : sub.prompt,
          rationale: `Delegated sub-task to specialized ${sub.type} subagent.`,
          filesTouched: touchedBases,
          status: 'SUCCESS',
          steeringNudge: `Resume control from subagent delegation at step #${stepIdx}. Focus on integrating subagent findings.`
        };
        nodes[currentNodeId].childrenIds.push(subId);
        currentNodeId = subId;
        continue;
      }

      // Check if this step had an error or retry
      const hasError = step.status === 'ERROR' || (step.content && step.content.toLowerCase().includes('error:'));
      if (hasError) {
        pivotsCount++;
        totalBranches++;
        const pivotId = `node-pivot-${stepIdx}`;
        const errSummary = (step.content || 'Execution error encountered; agent initiated fallback pivot.')
          .split('\n')[0].substring(0, 120);

        nodes[pivotId] = {
          id: pivotId,
          stepIndex: stepIdx,
          timestamp: step.timestamp,
          parentId: currentNodeId,
          childrenIds: [],
          type: 'PIVOT_RETRY',
          label: `Pivot / Fallback (Step #${stepIdx})`,
          summary: errSummary,
          rationale: step.thinking ? step.thinking.substring(0, 200) + '...' : 'Agent encountered unexpected condition and branched.',
          filesTouched: touchedBases,
          status: 'WARNING',
          steeringNudge: `Rewind to error step #${stepIdx}. Alternative suggested: avoid previous failing command, verify file paths and types before executing.`
        };
        nodes[currentNodeId].childrenIds.push(pivotId);
        currentNodeId = pivotId;
        continue;
      }

      // Check for Scope Spill event
      if (declaredIntent.hasPlan && touchedBases.length > 0) {
        const unplanned = touchedBases.filter(b => !plannedSet.has(b.toLowerCase()));
        if (unplanned.length > 0) {
          spillsCount++;
          const spillId = `node-spill-${stepIdx}`;
          nodes[spillId] = {
            id: spillId,
            stepIndex: stepIdx,
            timestamp: step.timestamp,
            parentId: currentNodeId,
            childrenIds: [],
            type: 'SPILL_ALERT',
            label: `Scope Spill: ${unplanned[0]}`,
            summary: `Agent touched unplanned file(s): ${unplanned.join(', ')}.`,
            rationale: step.thinking ? step.thinking.substring(0, 200) + '...' : 'Unplanned scope mutation detected.',
            filesTouched: touchedBases,
            status: 'FAILED',
            steeringNudge: `You modified "${unplanned.join(', ')}" which was never part of implementation_plan.md. Revert changes to this file immediately and restrict edits strictly to planned files.`
          };
          nodes[currentNodeId].childrenIds.push(spillId);
          currentNodeId = spillId;
          continue;
        }
      }

      // Capture Milestones (significant file writes or every 10 steps)
      const hasFileWrite = stepFiles.some(f => f.action === 'EDIT' || f.action === 'WRITE' || f.action === 'NEW');
      if (hasFileWrite || stepIdx % 10 === 0 || i === steps.length - 1) {
        const milestoneId = `node-step-${stepIdx}`;
        let label = `Step #${stepIdx}`;
        if (hasFileWrite) {
          label = `Edit: ${touchedBases[0] || 'Code'}`;
        } else if (i === steps.length - 1) {
          label = `Completed (Step #${stepIdx})`;
        }

        const thinkingSummary = step.thinking
          ? step.thinking.split('\n')[0].substring(0, 120)
          : (step.toolCalls?.[0]?.summary || `Agent executed ${step.toolCalls?.[0]?.toolName || 'action'}`);

        nodes[milestoneId] = {
          id: milestoneId,
          stepIndex: stepIdx,
          timestamp: step.timestamp,
          parentId: currentNodeId,
          childrenIds: [],
          type: 'MILESTONE',
          label,
          summary: thinkingSummary,
          rationale: step.thinking ? step.thinking.substring(0, 200) : undefined,
          filesTouched: touchedBases,
          status: 'SUCCESS',
          steeringNudge: `Fork from Step #${stepIdx}. Continue from state where ${label} was completed.`
        };
        nodes[currentNodeId].childrenIds.push(milestoneId);
        currentNodeId = milestoneId;
      }
    }

    return {
      rootId,
      nodes,
      totalBranches,
      pivotsCount,
      spillsCount
    };
  }

  /**
   * Evaluates a real-time/proposed tool action against Declared Intent and Active Policy.
   * If a breach occurs, returns a LiveInterceptEvent to trip the Circuit Breaker.
   */
  public static evaluateRealTimeAction(
    action: {
      stepIndex: number;
      toolName: string;
      filePath?: string;
      command?: string;
      codeContent?: string;
      targetContent?: string;
      replacementContent?: string;
    },
    declaredIntent: DeclaredIntent,
    policy: CircuitBreakerPolicy
  ): LiveInterceptEvent | null {
    const timestamp = new Date().toISOString();

    // 1. Check Blocked Shell Commands
    if (action.command) {
      for (const blocked of policy.blockedCommands) {
        if (action.command.toLowerCase().includes(blocked.toLowerCase())) {
          return {
            stepIndex: action.stepIndex,
            timestamp,
            command: action.command,
            severity: 'CRITICAL',
            reason: `Circuit Breaker: Prohibited command pattern detected ("${blocked}").`,
            suggestedAction: `Execution blocked. Do not run destructive or high-risk shell commands without explicit human oversight.`,
            revertCommand: `echo "Command was intercepted and cancelled."`,
            steeringNudge: `Refuse to execute dangerous command "${action.command}". Use non-destructive, scoped alternatives.`
          };
        }
      }
    }

    // 2. Check Destructive File Shrink
    if (action.targetContent && (action.replacementContent !== undefined || action.codeContent !== undefined)) {
      const origLines = action.targetContent.split('\n').length;
      const newLines = (action.replacementContent || action.codeContent || '').split('\n').length;
      const threshold = 1 - (policy.shrinkThresholdPercent / 100);
      if (origLines > 35 && newLines < origLines * threshold) {
        const baseName = action.filePath ? path.basename(action.filePath) : 'file';
        const reductionPct = Math.round((1 - newLines / origLines) * 100);
        return {
          stepIndex: action.stepIndex,
          timestamp,
          filePath: action.filePath,
          severity: 'CRITICAL',
          reason: `Circuit Breaker: Destructive file shrink detected on "${baseName}" (${reductionPct}% line reduction from ${origLines} to ${newLines}).`,
          suggestedAction: `Block or revert modification to prevent catastrophic code loss.`,
          revertCommand: action.filePath ? `git checkout HEAD -- "${action.filePath}"` : undefined,
          steeringNudge: `You just attempted to delete ${reductionPct}% of "${baseName}". Make surgical edits using targeted replacement chunks rather than replacing large codeblocks.`
        };
      }
    }

    // 3. Check Scope Spill vs Declared Plan
    if (action.filePath && declaredIntent.hasPlan && policy.enforcementMode !== 'PERMISSIVE') {
      const baseName = path.basename(action.filePath).toLowerCase();
      const isPlanned = declaredIntent.plannedFiles.some(
        p => path.basename(p).toLowerCase() === baseName || action.filePath?.includes(p)
      );

      if (!isPlanned) {
        const severity = policy.enforcementMode === 'STRICT' ? 'CRITICAL' : 'WARNING';
        return {
          stepIndex: action.stepIndex,
          timestamp,
          filePath: action.filePath,
          severity,
          reason: `Scope Spill: "${path.basename(action.filePath)}" was modified but was never declared in implementation_plan.md.`,
          suggestedAction: `Choose whether to authorize this file into the plan, revert changes, or steer the agent away.`,
          revertCommand: `git checkout HEAD -- "${action.filePath}"`,
          steeringNudge: `Your declared implementation plan does NOT include "${path.basename(action.filePath)}". Cease modifications to this file and focus only on: ${declaredIntent.plannedFiles.join(', ')}.`
        };
      }
    }

    return null;
  }
}
