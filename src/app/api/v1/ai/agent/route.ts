import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { GeminiProviderAdapter } from '@/lib/ai/GeminiProviderAdapter';
import { toolRegistry } from '@/lib/ai/ToolRegistry';

const provider = new GeminiProviderAdapter();

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthSession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED: Please sign in to access the AI Task Agent.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const userInput = body.userInput || '';

    // Enforce strict 2,000 character input limit
    if (typeof userInput !== 'string' || userInput.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT: Message cannot be empty.' },
        { status: 400 }
      );
    }

    if (userInput.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'INPUT_TOO_LONG: Maximum prompt length is 2,000 characters.' },
        { status: 400 }
      );
    }

    // Limit context history to 5 turns max
    const rawContext = Array.isArray(body.contextHistory) ? body.contextHistory : [];
    const contextHistory = rawContext.slice(-5).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 500),
    }));

    const agentRequest = {
      userInput: userInput.trim(),
      locale: (body.locale || 'mr') as 'en' | 'hi' | 'mr',
      sessionUser: {
        id: user.id,
        role: user.role,
        name: user.name || undefined,
        mobile: user.mobile || undefined,
        profileVerified: user.profileVerified,
      },
      currentPage: body.currentPage || undefined,
      contextHistory,
    };

    const agentResponse = await provider.processTask(agentRequest);

    // If AI requested a tool execution
    if (agentResponse.requestedTool) {
      const tool = toolRegistry.get(agentResponse.requestedTool);

      if (!tool) {
        return NextResponse.json({
          success: true,
          response: {
            ...agentResponse,
            responseType: 'ERROR',
            responseMessage: `Requested tool '${agentResponse.requestedTool}' is not registered.`,
          },
        });
      }

      // Execute tool safely on server
      const toolResult = await tool.execute(agentResponse.toolArguments, {
        userId: user.id,
        role: user.role,
        profileVerified: user.profileVerified,
      });

      if (!toolResult.success) {
        return NextResponse.json({
          success: true,
          response: {
            ...agentResponse,
            responseType: 'ERROR',
            responseMessage: toolResult.error || 'Tool execution failed',
          },
        });
      }

      if (tool.confirmationRequired) {
        return NextResponse.json({
          success: true,
          response: {
            ...agentResponse,
            responseType: 'CONFIRMATION_REQUIRED',
            requiresConfirmation: true,
            previewPayload: {
              previewId: toolResult.previewId,
              ...toolResult.previewPayload,
            },
            responseMessage: agentResponse.responseMessage || 'Please review and confirm before proceeding.',
          },
        });
      }

      return NextResponse.json({
        success: true,
        response: {
          ...agentResponse,
          responseType: 'TOOL_RESULT',
          toolResultData: toolResult.data,
        },
      });
    }

    return NextResponse.json({
      success: true,
      response: agentResponse,
    });
  } catch (err: any) {
    console.error('Error in AI agent API route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
