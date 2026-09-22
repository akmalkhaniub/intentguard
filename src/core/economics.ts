import { AgentBrand, ModelPricingTier } from './types';

export class ModelRateCard {
  private static readonly TIERS: Record<string, ModelPricingTier> = {
    // Anthropic Claude
    'claude-3-7-sonnet': { inputPerM: 3.00, outputPerM: 15.00, cacheReadPerM: 0.30, cacheWritePerM: 3.75, provider: 'Anthropic' },
    'claude-3-5-sonnet': { inputPerM: 3.00, outputPerM: 15.00, cacheReadPerM: 0.30, cacheWritePerM: 3.75, provider: 'Anthropic' },
    'claude-3-5-haiku':  { inputPerM: 0.80, outputPerM: 4.00,  cacheReadPerM: 0.08, cacheWritePerM: 1.00, provider: 'Anthropic' },
    'claude-3-opus':      { inputPerM: 15.00, outputPerM: 75.00, cacheReadPerM: 1.50, cacheWritePerM: 18.75, provider: 'Anthropic' },
    'claude-default':     { inputPerM: 3.00, outputPerM: 15.00, cacheReadPerM: 0.30, cacheWritePerM: 3.75, provider: 'Anthropic' },

    // Google Antigravity / Gemini
    'gemini-2.0-flash':   { inputPerM: 0.10, outputPerM: 0.40, cacheReadPerM: 0.025, cacheWritePerM: 0.10, provider: 'Google' },
    'gemini-2.0-pro':     { inputPerM: 1.25, outputPerM: 5.00, cacheReadPerM: 0.3125, cacheWritePerM: 1.25, provider: 'Google' },
    'gemini-1.5-pro':     { inputPerM: 1.25, outputPerM: 5.00, cacheReadPerM: 0.3125, cacheWritePerM: 1.25, provider: 'Google' },
    'antigravity-default':{ inputPerM: 0.10, outputPerM: 0.40, cacheReadPerM: 0.025, cacheWritePerM: 0.10, provider: 'Google' },

    // OpenAI Codex / GPT-4o
    'gpt-4o':             { inputPerM: 2.50, outputPerM: 10.00, cacheReadPerM: 1.25, cacheWritePerM: 2.50, provider: 'OpenAI' },
    'o3-mini':            { inputPerM: 1.10, outputPerM: 4.40, cacheReadPerM: 0.55, cacheWritePerM: 1.10, provider: 'OpenAI' },
    'codex-default':      { inputPerM: 2.50, outputPerM: 10.00, cacheReadPerM: 1.25, cacheWritePerM: 2.50, provider: 'OpenAI' }
  };

  public static getPricing(brand: AgentBrand, modelName?: string): ModelPricingTier {
    const norm = (modelName || '').toLowerCase();
    for (const [key, tier] of Object.entries(this.TIERS)) {
      if (norm.includes(key)) {
        return tier;
      }
    }

    if (brand === 'claude') return this.TIERS['claude-default'];
    if (brand === 'codex') return this.TIERS['codex-default'];
    return this.TIERS['antigravity-default'];
  }

  public static computeCost(
    brand: AgentBrand,
    modelName: string | undefined,
    inputTokens: number,
    outputTokens: number,
    cacheHitTokens: number = 0
  ): { totalCostUsd: number; cacheSavingsUsd: number; breakdown: string } {
    const tier = this.getPricing(brand, modelName);

    const regularInput = Math.max(0, inputTokens - cacheHitTokens);
    const inputCost = (regularInput / 1_000_000) * tier.inputPerM;
    const cacheCost = (cacheHitTokens / 1_000_000) * tier.cacheReadPerM;
    const outputCost = (outputTokens / 1_000_000) * tier.outputPerM;

    const cacheSavings = (cacheHitTokens / 1_000_000) * Math.max(0, tier.inputPerM - tier.cacheReadPerM);
    const totalCost = inputCost + cacheCost + outputCost;

    return {
      totalCostUsd: Math.max(0.0001, Math.round(totalCost * 10000) / 10000),
      cacheSavingsUsd: Math.round(cacheSavings * 10000) / 10000,
      breakdown: `${tier.provider} (${tier.inputPerM}/$${tier.outputPerM} per 1M) | In: $${inputCost.toFixed(5)} | Out: $${outputCost.toFixed(5)} | Cached: $${cacheCost.toFixed(5)}`
    };
  }
}
