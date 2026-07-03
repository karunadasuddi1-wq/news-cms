/**
 * usageTracker.js
 * Logs AI usage and calculates cost per provider/model
 */

const { AiUsageLog } = require('../models');

// Cost per 1000 tokens in USD (input/output)
const PRICING = {
  anthropic: {
    'claude-sonnet-4-6':    { input: 0.003,   output: 0.015 },
    'claude-opus-4-6':      { input: 0.015,   output: 0.075 },
    'claude-haiku-4-5':     { input: 0.00025, output: 0.00125 },
    default:                { input: 0.003,   output: 0.015 },
  },
  openai: {
    'gpt-4o':               { input: 0.005,   output: 0.015 },
    'gpt-4o-mini':          { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo':          { input: 0.01,    output: 0.03 },
    default:                { input: 0.005,   output: 0.015 },
  },
  gemini: {
    'gemini-1.5-pro':       { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash':     { input: 0.000075,output: 0.0003 },
    default:                { input: 0.000075,output: 0.0003 },
  },
  groq: {
    'llama-3.1-70b-versatile': { input: 0.00059, output: 0.00079 },
    'mixtral-8x7b-32768':      { input: 0.00024, output: 0.00024 },
    default:                   { input: 0.00059, output: 0.00079 },
  },
  mistral: {
    'mistral-large-latest': { input: 0.003,   output: 0.009 },
    'mistral-medium':       { input: 0.00275, output: 0.0081 },
    default:                { input: 0.003,   output: 0.009 },
  },
};

// USD to INR conversion rate (update periodically)
const USD_TO_INR = 83.5;

function calculateCost(provider, model, inputTokens, outputTokens) {
  const providerPricing = PRICING[provider] || PRICING.anthropic;
  const modelPricing = providerPricing[model] || providerPricing.default;
  const costUsd = (inputTokens / 1000) * modelPricing.input +
                  (outputTokens / 1000) * modelPricing.output;
  return Math.round(costUsd * 1000000) / 1000000; // 6 decimal places
}

async function logUsage({ userId, action, provider, model, inputTokens, outputTokens, metadata = {} }) {
  try {
    const costUsd = calculateCost(provider, model, inputTokens, outputTokens);
    await AiUsageLog.create({
      userId: userId || null,
      action,
      provider,
      model: model || 'unknown',
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      costUsd,
      metadata,
    });
    return costUsd;
  } catch (err) {
    console.error('[usage-tracker] Failed to log usage:', err.message);
    return 0;
  }
}

function formatCost(usd) {
  const inr = usd * USD_TO_INR;
  return {
    usd: `$${usd.toFixed(4)}`,
    inr: `₹${inr.toFixed(2)}`,
    usd_raw: usd,
    inr_raw: inr,
  };
}

module.exports = { logUsage, calculateCost, formatCost, USD_TO_INR };
