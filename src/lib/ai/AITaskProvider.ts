import { z } from 'zod';

export const AIResponseTypeSchema = z.enum([
  'ANSWER',
  'NAVIGATION',
  'TOOL_RESULT',
  'CLARIFICATION_REQUIRED',
  'CONFIRMATION_REQUIRED',
  'ERROR',
  'UNSUPPORTED_REQUEST',
]);

export type AIResponseType = z.infer<typeof AIResponseTypeSchema>;

export const AIAgentResponseSchema = z.object({
  responseType: AIResponseTypeSchema,
  intent: z.string(),
  entities: z.record(z.string(), z.unknown()),
  requestedTool: z.string().nullable(),
  toolArguments: z.record(z.string(), z.unknown()),
  requiresConfirmation: z.boolean(),
  previewPayload: z.record(z.string(), z.unknown()).optional().nullable(),
  responseMessage: z.string(),
  isDemoMode: z.boolean(),
});

export type AIAgentResponse = z.infer<typeof AIAgentResponseSchema>;

export interface AIAgentContextMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  lastCrop?: string;
  lastMarket?: string;
  lastEntityId?: string;
}

export interface AIAgentRequest {
  userInput: string;
  locale: 'en' | 'hi' | 'mr';
  sessionUser: {
    id: string;
    role: string;
    name?: string;
    mobile?: string;
    profileVerified?: boolean;
  };
  currentPage?: string;
  contextHistory?: AIAgentContextMessage[];
}

export interface IAITaskProvider {
  providerName: string;
  isDemoMode: boolean;
  processTask(request: AIAgentRequest): Promise<AIAgentResponse>;
}
