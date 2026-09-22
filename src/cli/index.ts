import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { SessionManager } from '../sessionManager';
import { IntentGovernor, GovernanceAudit } from '../core';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

function banner() {
  console.log(`\n${CYAN}${BOLD}🛡️  IntentGuard CLI v0.8.0${RESET} ${DIM}— Autonomous AI Coding Control Plane${RESET}\n`);
}

function showHelp() {
  banner();
  console.log(`Usage: ${BOLD}intentguard${RESET} <command> [options] (or ${BOLD}ig${RESET} <command>)\n`);
  console.log(`${BOLD}Commands:${RESET}`);
  console.log(`  ${CYAN}list${RESET}                          List all agent sessions (Claude, Antigravity, Codex)`);
  console.log(`  ${CYAN}inspect${RESET} <session-id>          Deep dive into session cost, tokens, time, & touches`);
  console.log(`  ${CYAN}audit${RESET} <session-id>            Run IntentGovernor audit against declared plan`);
  console.log(`  ${CYAN}rollback${RESET} <session-id>         Generate git restore commands to revert agent changes`);
  console.log(`    ${DIM}--spill-only${RESET}                  Only rollback files outside declared implementation plan`);
  console.log(`    ${DIM}--exec${RESET}                        Execute the git restore commands immediately`);
  console.log(`  ${CYAN}compare${RESET} <id1> <id2>           Compare two sessions side-by-side (benchmarking)`);
  console.log(`  ${CYAN}help${RESET}                          Show this help menu\n`);
  console.log(`${BOLD}Examples:${RESET}`);
  console.log(`  $ ${DIM}ig list${RESET}`);
  console.log(`  $ ${DIM}ig audit 2b9d2347${RESET}`);
  console.log(`  $ ${DIM}ig rollback 2b9d2347 --spill-only --exec${RESET}\n`);
}

async function runList(manager: SessionManager) {
  banner();
  console.log(`${DIM}Scanning sessions across Antigravity, Claude Code, and Codex...${RESET}\n`);
  const sessions = await manager.getSessions();
  if (!sessions.length) {
    console.log(`${YELLOW}No agent sessions found.${RESET}`);
    return;
  }

  const header = `${BOLD}${'ID'.padEnd(12)} ${'AGENT'.padEnd(14)} ${'STEPS'.padStart(6)}   ${'MODIFIED'.padEnd(20)} ${'TITLE'}${RESET}`;
  console.log(header);
  console.log(DIM + '─'.repeat(80) + RESET);

  for (const s of sessions.slice(0, 25)) {
    const idShort = s.conversationId.substring(0, 10);
    const brand = s.brand || 'antigravity';
    let brandTag = `${CYAN}${brand}${RESET}`;
    if (brand === 'claude') brandTag = `${MAGENTA}${brand}${RESET}`;
    if (brand === 'codex') brandTag = `${GREEN}${brand}${RESET}`;

    const steps = String(s.stepCount).padStart(6);
    const mod = (s.lastModified || 'unknown').substring(0, 19).padEnd(20);
    const title = (s.title || idShort).substring(0, 30);

    console.log(`${idShort.padEnd(12)} ${brandTag.padEnd(23)} ${steps}   ${mod} ${title}`);
  }
  console.log(`\n${DIM}Showing top ${Math.min(sessions.length, 25)} of ${sessions.length} sessions.${RESET}\n`);
}

async function resolveSessionId(manager: SessionManager, prefix: string): Promise<string | null> {
  const sessions = await manager.getSessions();
  const match = sessions.find(s => s.conversationId.toLowerCase().startsWith(prefix.toLowerCase()));
  return match ? match.conversationId : null;
}

async function runInspect(manager: SessionManager, idPrefix: string) {
  const fullId = await resolveSessionId(manager, idPrefix);
  if (!fullId) {
    console.error(`${RED}Error: Session '${idPrefix}' not found.${RESET}`);
    process.exit(1);
  }

  banner();
  const detail = manager.getSessionDetail(fullId);
  console.log(`${BOLD}Session:${RESET}       ${fullId}`);
  console.log(`${BOLD}Brand / Model:${RESET} ${(detail.brand || 'antigravity').toUpperCase()} (${detail.modelName || 'Gemini'})\n`);

  console.log(`${BOLD}📊 Metrics Overview:${RESET}`);
  console.log(`  Steps:             ${detail.totalSteps}`);
  console.log(`  Total Tokens:      ${detail.costMetrics.totalTokens.toLocaleString()} (${detail.costMetrics.inputTokens.toLocaleString()} in / ${detail.costMetrics.outputTokens.toLocaleString()} out)`);
  console.log(`  Est. Cost:         ${GREEN}$${detail.costMetrics.estimatedCostUsd.toFixed(4)}${RESET}`);
  console.log(`  Execution Time:    ${detail.timeMetrics.totalDurationSec}s (Edits: ${detail.timeMetrics.fileEditDurationSec}s, Shell: ${detail.timeMetrics.commandDurationSec}s)`);
  console.log(`  Health Verdict:    ${detail.diagnosticReport.verdict === 'HEALTHY' ? GREEN : YELLOW}${detail.diagnosticReport.verdict}${RESET} (${detail.diagnosticReport.healthScore}/100)`);
  console.log(`  Risk Grade:        ${detail.riskScan.riskGrade === 'CRITICAL' ? RED : (detail.riskScan.riskGrade === 'MEDIUM' ? YELLOW : GREEN)}${detail.riskScan.riskGrade}${RESET}\n`);

  console.log(`${BOLD}📁 Files Touched (${detail.fileStats.length}):${RESET}`);
  for (const f of detail.fileStats) {
    const churn = f.churnLevel === 'HIGH' ? `${RED}🔥 HIGH${RESET}` : (f.churnLevel === 'MEDIUM' ? `${YELLOW}MED${RESET}` : `${DIM}LOW${RESET}`);
    console.log(`  ${f.filename.padEnd(28)} edits: ${String(f.edits).padEnd(3)} creates: ${String(f.creates).padEnd(3)} churn: ${churn}`);
  }

  if (detail.governanceAudit) {
    const ga = detail.governanceAudit;
    console.log(`\n${BOLD}🛡️ IntentGuard Governance:${RESET}`);
    console.log(`  Adherence:         ${ga.intentAdherenceRate >= 75 ? GREEN : RED}${ga.intentAdherenceRate}%${RESET}`);
    console.log(`  Circuit Breaker:   ${ga.circuitBreaker.tripped ? `${RED}⚡ TRIPPED (${ga.circuitBreaker.reason})${RESET}` : `${GREEN}ARMED & SAFE${RESET}`}`);
    console.log(`  Scope Spill:       ${ga.unplannedSpillFiles.length ? `${YELLOW}${ga.unplannedSpillFiles.join(', ')}${RESET}` : `${GREEN}0 Files (In-Bounds)${RESET}`}`);
  }
  console.log('');
}

async function runAudit(manager: SessionManager, idPrefix: string) {
  const fullId = await resolveSessionId(manager, idPrefix);
  if (!fullId) {
    console.error(`${RED}Error: Session '${idPrefix}' not found.${RESET}`);
    process.exit(1);
  }

  banner();
  const detail = manager.getSessionDetail(fullId);
  const ga: GovernanceAudit | undefined = detail.governanceAudit;

  if (!ga) {
    console.log(`${YELLOW}No governance audit data available for this session.${RESET}`);
    return;
  }

  console.log(`${BOLD}AUDIT REPORT FOR SESSION: ${fullId.substring(0, 10)}${RESET}`);
  console.log(DIM + '═'.repeat(60) + RESET + '\n');

  // Adherence
  const adhColor = ga.intentAdherenceRate >= 80 ? GREEN : (ga.intentAdherenceRate >= 60 ? YELLOW : RED);
  console.log(`${BOLD}Intent Adherence Rate:${RESET}   ${adhColor}${BOLD}${ga.intentAdherenceRate}%${RESET}`);
  console.log(`${BOLD}Verdict:${RESET}                 ${ga.verdict === 'COMPLIANT' ? GREEN : (ga.verdict === 'CIRCUIT_TRIPPED' ? RED : YELLOW)}${ga.verdict}${RESET}`);
  console.log(`${BOLD}Summary:${RESET}                 ${ga.verdictSummary}\n`);

  // Circuit Breaker
  if (ga.circuitBreaker.tripped) {
    console.log(`${RED}${BOLD}⚡ CIRCUIT BREAKER TRIPPED!${RESET}`);
    console.log(`  Reason: ${ga.circuitBreaker.reason}`);
    if (ga.circuitBreaker.destructiveTruncations.length) {
      console.log(`  Destructive Truncations: ${ga.circuitBreaker.destructiveTruncations.join(', ')}`);
    }
    if (ga.circuitBreaker.hotspotFiles.length) {
      console.log(`  Blast-Radius Hotspots:   ${ga.circuitBreaker.hotspotFiles.join(', ')}`);
    }
    console.log('');
  } else {
    console.log(`${GREEN}🛡️  Circuit Breaker: ARMED (No destructive shrink or multi-hotspot blast radius)${RESET}\n`);
  }

  // Scope Boundary Check
  console.log(`${BOLD}Planned & Executed (${ga.plannedAndDone.length}):${RESET}`);
  if (ga.plannedAndDone.length) {
    ga.plannedAndDone.forEach(f => console.log(`  ${GREEN}✓${RESET} ${f}`));
  } else {
    console.log(`  ${DIM}None${RESET}`);
  }

  console.log(`\n${BOLD}Unplanned Scope Spill (${ga.unplannedSpillFiles.length}):${RESET}`);
  if (ga.unplannedSpillFiles.length) {
    ga.unplannedSpillFiles.forEach(f => console.log(`  ${YELLOW}⚠️  ${f} (Out-of-scope edit)${RESET}`));
  } else {
    console.log(`  ${GREEN}✓ Zero unplanned files modified.${RESET}`);
  }

  if (ga.violations.length) {
    console.log(`\n${BOLD}Scope & Safety Violations (${ga.violations.length}):${RESET}`);
    ga.violations.forEach(v => {
      const vColor = v.severity === 'CRITICAL' ? RED : YELLOW;
      console.log(`  ${vColor}[${v.severity}]${RESET} ${BOLD}${path.basename(v.filePath)}${RESET}: ${v.reason}`);
      console.log(`    ${DIM}Action: ${v.suggestedAction}${RESET}`);
    });
  }

  console.log('\n' + DIM + '═'.repeat(60) + RESET);

  if (ga.circuitBreaker.tripped || ga.verdict === 'CIRCUIT_TRIPPED') {
    console.log(`${RED}${BOLD}EXIT 1: Circuit breaker tripped. PR gate should block merge.${RESET}\n`);
    process.exit(1);
  } else if (ga.unplannedSpillFiles.length > 0) {
    console.log(`${YELLOW}EXIT 0 (with warnings): Scope spill detected. Review before merge.${RESET}\n`);
  } else {
    console.log(`${GREEN}EXIT 0: Compliant with declared intent.${RESET}\n`);
  }
}

async function runRollback(manager: SessionManager, idPrefix: string, spillOnly: boolean, exec: boolean) {
  const fullId = await resolveSessionId(manager, idPrefix);
  if (!fullId) {
    console.error(`${RED}Error: Session '${idPrefix}' not found.${RESET}`);
    process.exit(1);
  }

  banner();
  const detail = manager.getSessionDetail(fullId);
  let filesToRevert: string[] = [];

  if (spillOnly) {
    const ga = detail.governanceAudit;
    if (!ga || !ga.unplannedSpillFiles.length) {
      console.log(`${GREEN}No out-of-scope spill files found to revert.${RESET}`);
      return;
    }
    filesToRevert = ga.unplannedSpillFiles;
    console.log(`${YELLOW}${BOLD}Targeting Scope Spill Files Only (${filesToRevert.length}):${RESET}`);
  } else {
    filesToRevert = detail.rollbackPlan.modifiedFiles || [];
    console.log(`${CYAN}${BOLD}Targeting All Session Modified Files (${filesToRevert.length}):${RESET}`);
  }

  for (const f of filesToRevert) {
    console.log(`  ${DIM}•${RESET} ${f}`);
  }

  const gitCmd = `git restore ${filesToRevert.map(f => `"${f}"`).join(' ')}`;
  console.log(`\n${BOLD}Rollback Command:${RESET}`);
  console.log(`  ${CYAN}${gitCmd}${RESET}\n`);

  if (exec) {
    try {
      console.log(`${YELLOW}Executing git restore...${RESET}`);
      execSync(gitCmd, { stdio: 'inherit' });
      console.log(`${GREEN}✅ Successfully rolled back ${filesToRevert.length} file(s).${RESET}\n`);
    } catch (err: any) {
      console.error(`${RED}Rollback failed: ${err.message}${RESET}`);
      process.exit(1);
    }
  } else {
    console.log(`${DIM}Tip: Append ${BOLD}--exec${RESET}${DIM} to execute the command immediately.${RESET}\n`);
  }
}

async function runCompare(manager: SessionManager, idPrefix1: string, idPrefix2: string) {
  const id1 = await resolveSessionId(manager, idPrefix1);
  const id2 = await resolveSessionId(manager, idPrefix2);
  if (!id1 || !id2) {
    console.error(`${RED}Error: One or both session IDs could not be resolved.${RESET}`);
    process.exit(1);
  }

  banner();
  const d1 = manager.getSessionDetail(id1);
  const d2 = manager.getSessionDetail(id2);

  console.log(`${BOLD}⚖️  SESSION COMPARATOR:${RESET}`);
  console.log(`  Session A: ${CYAN}${id1.substring(0, 10)}${RESET} (${(d1.brand || 'antigravity').toUpperCase()})`);
  console.log(`  Session B: ${MAGENTA}${id2.substring(0, 10)}${RESET} (${(d2.brand || 'antigravity').toUpperCase()})\n`);

  const rows = [
    ['Total Steps', d1.totalSteps, d2.totalSteps],
    ['Duration', `${d1.timeMetrics.totalDurationSec}s`, `${d2.timeMetrics.totalDurationSec}s`],
    ['Total Tokens', d1.costMetrics.totalTokens.toLocaleString(), d2.costMetrics.totalTokens.toLocaleString()],
    ['Est. Cost', `$${d1.costMetrics.estimatedCostUsd.toFixed(4)}`, `$${d2.costMetrics.estimatedCostUsd.toFixed(4)}`],
    ['Files Modified', d1.fileStats.length, d2.fileStats.length],
    ['Intent Adherence', `${d1.governanceAudit?.intentAdherenceRate || 0}%`, `${d2.governanceAudit?.intentAdherenceRate || 0}%`],
    ['Health Verdict', d1.diagnosticReport.verdict, d2.diagnosticReport.verdict],
  ];

  console.log(`${BOLD}${'METRIC'.padEnd(20)} ${'SESSION A'.padEnd(20)} ${'SESSION B'}${RESET}`);
  console.log(DIM + '─'.repeat(60) + RESET);
  for (const [m, a, b] of rows) {
    console.log(`${String(m).padEnd(20)} ${String(a).padEnd(20)} ${String(b)}`);
  }
  console.log('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] ? args[0].toLowerCase() : 'help';
  const manager = new SessionManager();

  switch (cmd) {
    case 'list':
    case 'ls':
      await runList(manager);
      break;

    case 'inspect':
    case 'show':
      if (!args[1]) {
        console.error(`${RED}Usage: intentguard inspect <session-id>${RESET}`);
        process.exit(1);
      }
      await runInspect(manager, args[1]);
      break;

    case 'audit':
      if (!args[1]) {
        console.error(`${RED}Usage: intentguard audit <session-id>${RESET}`);
        process.exit(1);
      }
      await runAudit(manager, args[1]);
      break;

    case 'rollback':
    case 'revert':
      if (!args[1]) {
        console.error(`${RED}Usage: intentguard rollback <session-id> [--spill-only] [--exec]${RESET}`);
        process.exit(1);
      }
      const spillOnly = args.includes('--spill-only');
      const exec = args.includes('--exec');
      await runRollback(manager, args[1], spillOnly, exec);
      break;

    case 'compare':
      if (!args[1] || !args[2]) {
        console.error(`${RED}Usage: intentguard compare <session-id-1> <session-id-2>${RESET}`);
        process.exit(1);
      }
      await runCompare(manager, args[1], args[2]);
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

main().catch(err => {
  console.error(`${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
