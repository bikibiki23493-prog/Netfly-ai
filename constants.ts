import { ModelType } from './types';

export const DEFAULT_MODEL = ModelType.FLASH;
export const DEFAULT_THINKING_BUDGET = 2048; // Default budget when thinking is enabled
export const MAX_THINKING_BUDGET_FLASH = 24576;
export const MAX_THINKING_BUDGET_PRO = 32768;

export const MODEL_LABELS: Record<ModelType, string> = {
  [ModelType.FLASH]: 'Gemini 2.5 Flash',
  [ModelType.PRO]: 'Gemini 3.0 Pro'
};

export const INITIAL_GREETING = "Hello! I'm Netfly Ai. How can I help you today?";