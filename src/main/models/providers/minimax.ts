import { createAnthropic } from '@ai-sdk/anthropic';
import { MiniMaxProvider, isMiniMaxProvider } from '@common/agent';
import { Model, ModelInfo, ProviderProfile, SettingsData, UsageReportData } from '@common/types';

import type { LanguageModelUsage } from 'ai';
import type { LanguageModelV2 } from '@ai-sdk/provider';

import logger from '@/logger';
import { AiderModelMapping, CacheControl, LlmProviderStrategy } from '@/models';
import { LoadModelsResponse } from '@/models/types';
import { Task } from '@/task/task';
import { getEffectiveEnvironmentVariable } from '@/utils';

const MINIMAX_BASE_URL = 'https://api.minimax.io/anthropic';
const MINIMAX_MODELS_ENDPOINT = `${MINIMAX_BASE_URL}/v1/models`;

export const loadMiniMaxModels = async (
  profile: ProviderProfile,
  modelsInfo: Record<string, ModelInfo>,
  settings: SettingsData,
): Promise<LoadModelsResponse> => {
  if (!isMiniMaxProvider(profile.provider)) {
    return {
      models: [],
      success: false,
    };
  }

  const provider = profile.provider;
  const apiKey = provider.apiKey || '';
  const apiKeyEnv = getEffectiveEnvironmentVariable('MINIMAX_API_KEY', settings);

  if (!apiKey && !apiKeyEnv?.value) {
    return { models: [], success: false };
  }

  try {
    const response = await fetch(MINIMAX_MODELS_ENDPOINT, {
      headers: {
        'x-api-key': apiKey || apiKeyEnv?.value || '',
        'anthropic-version': '2023-06-01',
      },
    });
    if (!response.ok) {
      return {
        models: [],
        success: false,
        error: `MiniMax models API response failed: ${response.status} ${response.statusText} ${await response.text()}`,
      };
    }

    const data = await response.json();
    const models =
      data.data?.map((m: { id: string }) => {
        const info = modelsInfo[m.id];
        return {
          id: m.id,
          providerId: profile.id,
          ...info,
        } satisfies Model;
      }) || [];

    return { models, success: true };
  } catch (error) {
    return {
      models: [],
      success: false,
      error: typeof error === 'string' ? error : error instanceof Error ? error.message : JSON.stringify(error),
    };
  }
};

export const hasMiniMaxEnvVars = (settings: SettingsData): boolean => {
  return !!getEffectiveEnvironmentVariable('MINIMAX_API_KEY', settings, undefined)?.value;
};

export const getMiniMaxAiderMapping = (provider: ProviderProfile, modelId: string): AiderModelMapping => {
  const miniMaxProvider = provider.provider as MiniMaxProvider;
  const envVars: Record<string, string> = {
    ANTHROPIC_API_URL: MINIMAX_BASE_URL,
  };

  if (miniMaxProvider.apiKey) {
    envVars.ANTHROPIC_API_KEY = miniMaxProvider.apiKey;
  }

  return {
    modelName: `anthropic/${modelId}`,
    environmentVariables: envVars,
  };
};

export const createMiniMaxLlm = (profile: ProviderProfile, model: Model, settings: SettingsData, projectDir: string): LanguageModelV2 => {
  const provider = profile.provider as MiniMaxProvider;
  let apiKey = provider.apiKey;

  if (!apiKey) {
    const effectiveVar = getEffectiveEnvironmentVariable('MINIMAX_API_KEY', settings, projectDir);
    if (effectiveVar) {
      apiKey = effectiveVar.value;
      logger.debug(`Loaded MINIMAX_API_KEY from ${effectiveVar.source}`);
    }
  }

  if (!apiKey) {
    throw new Error('MiniMax API key is required in Providers settings or Aider environment variables (MINIMAX_API_KEY)');
  }

  const anthropicProvider = createAnthropic({
    apiKey,
    baseURL: MINIMAX_BASE_URL,
    headers: profile.headers,
  });
  return anthropicProvider(model.id);
};

type MiniMaxMetadata = {
  anthropic: {
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
};

export const calculateMiniMaxCost = (
  model: Model,
  sentTokens: number,
  receivedTokens: number,
  cacheWriteTokens: number = 0,
  cacheReadTokens: number = 0,
): number => {
  const inputCostPerToken = model.inputCostPerToken ?? 0;
  const outputCostPerToken = model.outputCostPerToken ?? 0;
  const cacheWriteInputTokenCost = model.cacheWriteInputTokenCost ?? inputCostPerToken;
  const cacheReadInputTokenCost = model.cacheReadInputTokenCost ?? 0;

  const inputCost = sentTokens * inputCostPerToken;
  const outputCost = receivedTokens * outputCostPerToken;
  const cacheCreationCost = cacheWriteTokens * cacheWriteInputTokenCost;
  const cacheReadCost = cacheReadTokens * cacheReadInputTokenCost;
  const cacheCost = cacheCreationCost + cacheReadCost;

  return inputCost + outputCost + cacheCost;
};

export const getMiniMaxUsageReport = (
  task: Task,
  provider: ProviderProfile,
  model: Model,
  usage: LanguageModelUsage,
  providerMetadata?: unknown,
): UsageReportData => {
  const totalSentTokens = usage.inputTokens || 0;
  const receivedTokens = usage.outputTokens || 0;

  const { anthropic } = (providerMetadata as MiniMaxMetadata) || {};
  const cacheWriteTokens = anthropic?.cacheCreationInputTokens ?? 0;
  const cacheReadTokens = anthropic?.cacheReadInputTokens ?? usage?.cachedInputTokens ?? 0;

  const sentTokens = totalSentTokens - cacheReadTokens;

  const messageCost = calculateMiniMaxCost(model, sentTokens, receivedTokens, cacheWriteTokens, cacheReadTokens);

  const usageReportData: UsageReportData = {
    model: `${provider.id}/${model.id}`,
    sentTokens,
    receivedTokens,
    cacheWriteTokens,
    cacheReadTokens,
    messageCost,
    agentTotalCost: task.task.agentTotalCost + messageCost,
  };

  return usageReportData;
};

export const getMiniMaxCacheControl = (): CacheControl => {
  return {
    anthropic: {
      cacheControl: { type: 'ephemeral' },
    },
  };
};

export const minimaxProviderStrategy: LlmProviderStrategy = {
  createLlm: createMiniMaxLlm,
  getUsageReport: getMiniMaxUsageReport,
  loadModels: loadMiniMaxModels,
  hasEnvVars: hasMiniMaxEnvVars,
  getAiderMapping: getMiniMaxAiderMapping,
  getCacheControl: getMiniMaxCacheControl,
};
