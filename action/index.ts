import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { IntentGovernor, DeclaredIntent, GovernanceAudit } from '../src/core';

function getExecOutput(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function setActionOutput(name: string, value: string) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile && fs.existsSync(outputFile)) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  } else {
    console.log(`[OUTPUT] ${name}=${value}`);
  }
}

function appendStepSummary(markdown: string) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, markdown + '\n');
  }
}

async function run() {
  console.log('\n🛡️ Running IntentGuard GitHub Action PR Gatekeeper...\n');

  const planPath = process.env.INPUT_PLAN_PATH || 'implementation_plan.md';
  const failOnBreaker = (process.env.INPUT_FAIL_ON_CIRCUIT_BREAK || 'true').toLowerCase() === 'true';
  const failOnSpill = (process.env.INPUT_FAIL_ON_SPILL || 'false').toLowerCase() === 'true';
  const baseBranch = process.env.INPUT_BASE_BRANCH || 'origin/main';

  // 1. Read Implementation Plan
  let planMarkdown = '';
  if (fs.existsSync(planPath)) {
    planMarkdown = fs.readFileSync(planPath, 'utf8');
    console.log(`Loaded plan from: ${planPath} (${planMarkdown.length} chars)`);
  } else {
    // Check fallback locations (e.g., docs/ or brain/)
    const fallbacks = [
      path.join(process.cwd(), 'docs', 'implementation_plan.md'),
      path.join(process.cwd(), '.gemini', 'antigravity', 'brain', 'implementation_plan.md')
    ];
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) {
        planMarkdown = fs.readFileSync(fb, 'utf8');
        console.log(`Loaded plan from fallback: ${fb}`);
        break;
      }
    }
  }

  const declaredIntent = IntentGovernor.parsePlan(planMarkdown);
  console.log(`Declared Intent hasPlan: ${declaredIntent.hasPlan}, planned files: ${declaredIntent.plannedFiles.length}`);

  // 2. Discover Modified Files in PR / Commit Range
  let diffFilesOutput = getExecOutput(`git diff --name-only ${baseBranch}...HEAD`);
  if (!diffFilesOutput) {
    diffFilesOutput = getExecOutput('git diff --name-only HEAD~1...HEAD');
  }
  if (!diffFilesOutput) {
    diffFilesOutput = getExecOutput('git status --porcelain');
  }

  const modifiedFiles: string[] = diffFilesOutput
    .split('\n')
    .map(line => line.replace(/^[MADRCU?! ]{1,2}\s*/, '').trim())
    .filter(Boolean);

  console.log(`Identified ${modifiedFiles.length} modified file(s) in branch.`);

  // 3. Build synthetic FileEvents and FileStats for the Governor
  const fileEvents: any[] = [];
  const fileStats: any[] = [];

  for (const f of modifiedFiles) {
    fileEvents.push({
      stepIndex: 1,
      action: 'EDIT',
      path: f,
      filename: path.basename(f)
    });
    fileStats.push({
      path: f,
      filename: path.basename(f),
      edits: 1,
      creates: 0,
      views: 1
    });
  }

  // 4. Run IntentGovernor Audit
  const audit: GovernanceAudit = IntentGovernor.auditSession(declaredIntent, fileEvents, fileStats);

  // 5. Build Markdown Scorecard
  const statusIcon = audit.circuitBreaker.tripped ? '⚡' : (audit.unplannedSpillFiles.length > 0 ? '⚠️' : '🛡️');
  const scorecard = [
    `## ${statusIcon} IntentGuard AI Agent Governance Scorecard`,
    '',
    `| Metric | Value | Status |`,
    `| :--- | :--- | :--- |`,
    `| **Intent Adherence** | \`${audit.intentAdherenceRate}%\` | ${audit.intentAdherenceRate >= 80 ? '🟢 Compliant' : (audit.intentAdherenceRate >= 60 ? '🟡 Deviated' : '🔴 Non-Compliant')} |`,
    `| **Circuit Breaker** | \`${audit.circuitBreaker.tripped ? 'TRIPPED' : 'ARMED'}\` | ${audit.circuitBreaker.tripped ? '🔴 Failed' : '🟢 Safe'} |`,
    `| **Planned & Executed** | \`${audit.plannedAndDone.length}\` files | 🟢 In-Bounds |`,
    `| **Unplanned Scope Spill** | \`${audit.unplannedSpillFiles.length}\` files | ${audit.unplannedSpillFiles.length === 0 ? '🟢 Zero Spill' : '🟡 Review Required'} |`,
    '',
    `### 📋 Executive Verdict: **${audit.verdict}**`,
    `> ${audit.verdictSummary}`,
    ''
  ];

  if (audit.unplannedSpillFiles.length > 0) {
    scorecard.push('### 🚨 Scope Spill Files Detected');
    scorecard.push('The following files were modified by the agent but were **never declared** in the implementation plan:');
    audit.unplannedSpillFiles.forEach(f => scorecard.push(`- \`${f}\``));
    scorecard.push('');
    scorecard.push('```bash');
    scorecard.push(`# 1-Click Rollback for Unplanned Spill`);
    scorecard.push(`git restore ${audit.unplannedSpillFiles.map(f => `"${f}"`).join(' ')}`);
    scorecard.push('```');
    scorecard.push('');
  }

  if (audit.violations.length > 0) {
    scorecard.push('### ⚠️ Violations & Security Warnings');
    audit.violations.forEach(v => {
      scorecard.push(`- **[${v.severity}]** \`${path.basename(v.filePath)}\`: ${v.reason}`);
    });
    scorecard.push('');
  }

  const markdownContent = scorecard.join('\n');
  console.log(markdownContent);
  appendStepSummary(markdownContent);

  // Set GitHub Action Outputs
  setActionOutput('adherence_score', String(audit.intentAdherenceRate));
  setActionOutput('circuit_tripped', String(audit.circuitBreaker.tripped));
  setActionOutput('spill_count', String(audit.unplannedSpillFiles.length));
  setActionOutput('scorecard_markdown', JSON.stringify(markdownContent));

  // Determine CI Gate Failure
  if (failOnBreaker && audit.circuitBreaker.tripped) {
    console.error(`\n❌ IntentGuard Gatekeeper FAILED: Blast-radius circuit breaker was tripped.`);
    process.exit(1);
  }

  if (failOnSpill && audit.unplannedSpillFiles.length > 0) {
    console.error(`\n❌ IntentGuard Gatekeeper FAILED: Scope spill detected with fail_on_spill=true.`);
    process.exit(1);
  }

  console.log('\n✅ IntentGuard Gatekeeper PASSED: Agent changes are within governance boundaries.\n');
}

run().catch(err => {
  console.error(`Fatal action error: ${err.message}`);
  process.exit(1);
});
