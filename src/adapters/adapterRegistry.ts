import { AgentAdapter, AgentBrand, UniversalSessionSummary, UniversalSessionDetail, AgentLeaderboard, AgentLeaderboardEntry, AgentForkPacket } from './types';
import { ClaudeAdapter } from './claudeAdapter';
import { CodexAdapter } from './codexAdapter';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: AgentAdapter[] = [];

  private constructor() {
    this.adapters.push(new ClaudeAdapter());
    this.adapters.push(new CodexAdapter());
  }

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public registerAdapter(adapter: AgentAdapter) {
    this.adapters.unshift(adapter);
  }

  public async getAllSessions(antigravitySessions: UniversalSessionSummary[]): Promise<UniversalSessionSummary[]> {
    const all: UniversalSessionSummary[] = [...antigravitySessions];

    for (const adapter of this.adapters) {
      try {
        const list = await adapter.getSessions();
        all.push(...list);
      } catch {}
    }

    // Sort descending by last modified
    return all.sort((a, b) => {
      const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return timeB - timeA;
    });
  }

  public getAdapterForSession(conversationId: string): AgentAdapter | undefined {
    return this.adapters.find(a => a.canHandle(conversationId));
  }

  public computeLeaderboard(allSessions: UniversalSessionDetail[]): AgentLeaderboard {
    const brandMap: { [b in AgentBrand]?: {
      count: number;
      totalCost: number;
      totalDuration: number;
      successCount: number;
      totalAdherence: number;
      totalTokens: number;
      totalErrors: number;
    }} = {};

    for (const s of allSessions) {
      const b = s.brand;
      if (!brandMap[b]) {
        brandMap[b] = { count: 0, totalCost: 0, totalDuration: 0, successCount: 0, totalAdherence: 0, totalTokens: 0, totalErrors: 0 };
      }
      const item = brandMap[b]!;
      item.count++;
      item.totalCost += s.costMetrics?.estimatedCostUsd || 0;
      item.totalDuration += s.timeMetrics?.totalDurationSec || 0;
      if (s.diagnosticReport?.verdict === 'HEALTHY') {
        item.successCount++;
      }
      item.totalAdherence += s.planAudit?.hasPlan ? s.planAudit.adherenceRate : 100;
      item.totalTokens += s.costMetrics?.totalTokens || 0;
      item.totalErrors += (s.diagnosticReport?.incidents || []).length;
    }

    const entries: AgentLeaderboardEntry[] = [];
    const brandLabels: { [b in AgentBrand]: string } = {
      antigravity: 'Google Antigravity',
      claude: 'Claude (Anthropic)',
      codex: 'OpenAI Codex',
      cline: 'Cline / Roo Code'
    };

    let cheapest = 'Google Antigravity';
    let fastest = 'Claude (Anthropic)';
    let mostReliable = 'Google Antigravity';
    let minCost = Infinity;
    let minDuration = Infinity;
    let maxSuccess = -1;

    for (const b of Object.keys(brandMap) as AgentBrand[]) {
      const item = brandMap[b]!;
      if (item.count === 0) continue;

      const avgCost = item.totalCost / item.count;
      const avgDuration = Math.round(item.totalDuration / item.count);
      const firstPassRate = Math.round((item.successCount / item.count) * 100);
      const avgAdherence = Math.round(item.totalAdherence / item.count);

      const label = brandLabels[b] || b;
      entries.push({
        brand: b,
        displayName: label,
        sessionCount: item.count,
        avgCostUsd: avgCost,
        avgDurationSec: avgDuration,
        firstPassSuccessRate: firstPassRate,
        avgPlanAdherence: avgAdherence,
        totalTokensUsed: item.totalTokens,
        totalErrors: item.totalErrors
      });

      if (avgCost < minCost) {
        minCost = avgCost;
        cheapest = label;
      }
      if (avgDuration < minDuration) {
        minDuration = avgDuration;
        fastest = label;
      }
      if (firstPassRate > maxSuccess) {
        maxSuccess = firstPassRate;
        mostReliable = label;
      }
    }

    return {
      entries: entries,
      totalSessions: allSessions.length,
      fastestAgent: fastest,
      cheapestAgent: cheapest,
      mostReliableAgent: mostReliable
    };
  }

  public createForkPacket(sourceDetail: UniversalSessionDetail, targetBrand: AgentBrand): AgentForkPacket {
    const firstPrompt = sourceDetail.steps.find(s => s.source === 'USER_EXPLICIT' || s.type === 'USER_INPUT')?.content || sourceDetail.title;
    const lastIncident = sourceDetail.diagnosticReport?.incidents?.[0]?.description || 'Session paused or encountered difficulties.';
    const files = sourceDetail.fileStats.map(f => f.filename);

    const prompt = `[AGENT HAND-OFF]\n` +
      `Source Agent: ${sourceDetail.brand.toUpperCase()} (${sourceDetail.modelName})\n` +
      `Target Agent: ${targetBrand.toUpperCase()}\n` +
      `Original Objective: ${firstPrompt}\n\n` +
      `Files modified so far:\n${files.map(f => `- ${f}`).join('\n') || '- None'}\n\n` +
      `Last Recorded Status / Error:\n${lastIncident}\n\n` +
      `Instructions: Please inspect the modified files and complete the remaining objectives without regressing prior work.`;

    return {
      sourceBrand: sourceDetail.brand,
      targetBrand: targetBrand,
      conversationId: sourceDetail.conversationId,
      initialPrompt: firstPrompt,
      lastError: lastIncident,
      modifiedFiles: files,
      gitDiffPreview: sourceDetail.rollbackPlan?.fullRollbackCommand || '',
      formattedHandOffPrompt: prompt
    };
  }
}
