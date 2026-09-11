import {
  IAITaskProvider,
  AIAgentRequest,
  AIAgentResponse,
  AIAgentResponseSchema,
} from './AITaskProvider';
import { AIDemoAdapter } from './AIDemoAdapter';

export class GeminiProviderAdapter implements IAITaskProvider {
  public providerName = 'Google Gemini 2.0 Flash REST Adapter';
  public isDemoMode = false;
  private demoFallback = new AIDemoAdapter();

  public async processTask(request: AIAgentRequest): Promise<AIAgentResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // API Key missing, fallback to Demo Mode
      return this.demoFallback.processTask(request);
    }

    try {
      const prompt = `You are KrishiSetu AI Task Agent.
You assist farmers with market prices, weather, transport, storage, and order management.
User locale: ${request.locale}. User role: ${request.sessionUser.role}.
User input: "${request.userInput}".

You MUST return a valid JSON object matching this structure EXACTLY:
{
  "responseType": "ANSWER" | "NAVIGATION" | "TOOL_RESULT" | "CLARIFICATION_REQUIRED" | "CONFIRMATION_REQUIRED" | "ERROR" | "UNSUPPORTED_REQUEST",
  "intent": "<intent_string>",
  "entities": {},
  "requestedTool": "<tool_name_or_null>",
  "toolArguments": {},
  "requiresConfirmation": boolean,
  "responseMessage": "<friendly_response_message>"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini API returned empty response payload');
      }

      const parsedJson = JSON.parse(rawText);

      // Validate strict Zod schema boundary
      const validated = AIAgentResponseSchema.parse({
        ...parsedJson,
        isDemoMode: false,
      });

      return validated;
    } catch (err: any) {
      console.warn('GeminiProviderAdapter error, falling back to Demo Mode:', err.message);
      return this.demoFallback.processTask(request);
    }
  }
}
