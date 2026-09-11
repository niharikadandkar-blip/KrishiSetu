'use client';

import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, MessageSquare, AlertCircle, ExternalLink } from 'lucide-react';
import { VoiceInput } from '@/components/voice/VoiceInput';
import { AITaskConfirmation } from './AITaskConfirmation';

export function AITaskAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      responseType?: string;
      toolResultData?: any;
      previewPayload?: any;
      isDemoMode?: boolean;
    }>
  >([
    {
      role: 'assistant',
      content: 'Namaste! I am KrishiSetu AI Task Agent. How can I help you with prices, weather, orders, or transport today?',
      isDemoMode: true,
    },
  ]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user' as const, content: textToSend.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: textToSend.trim(),
          locale: 'mr',
          contextHistory: messages.slice(-5),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.error || 'Failed to process task. Please try again.',
            responseType: 'ERROR',
          },
        ]);
        return;
      }

      const agentResp = data.response;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: agentResp.responseMessage,
          responseType: agentResp.responseType,
          toolResultData: agentResp.toolResultData,
          previewPayload: agentResp.previewPayload,
          isDemoMode: agentResp.isDemoMode,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.message || 'Network connection error.',
          responseType: 'ERROR',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Launcher Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white p-3.5 rounded-full shadow-2xl border border-emerald-500/30 flex items-center gap-2 transition-all transform hover:scale-105"
        title="Open KrishiSetu AI Task Agent"
      >
        <Bot className="w-6 h-6 animate-pulse" />
        <span className="text-xs font-extrabold pr-1 hidden sm:inline">AI Task Agent</span>
      </button>

      {/* Sliding Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 animate-slide-in">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    KrishiSetu AI Task Agent
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      Controlled AI
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Natural language task execution layer</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Log Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {msg.isDemoMode && msg.role === 'assistant' && (
                      <span className="inline-block px-2 py-0.5 mb-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded">
                        AI Demo Mode
                      </span>
                    )}

                    <p className="leading-relaxed whitespace-pre-line font-medium">{msg.content}</p>

                    {/* Tool Result Data Cards */}
                    {msg.toolResultData && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5 font-mono text-[11px]">
                        {Array.isArray(msg.toolResultData) ? (
                          msg.toolResultData.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="font-bold">{item.cropName || item.mandiName || item.facilityName || 'Result'}</span>
                              {item.modalPrice && <span className="float-right text-emerald-600 font-bold">₹{item.modalPrice}/Qtl</span>}
                            </div>
                          ))
                        ) : (
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            {msg.toolResultData.navigateTo ? (
                              <a
                                href={msg.toolResultData.navigateTo}
                                className="text-emerald-600 underline font-bold flex items-center gap-1"
                              >
                                Navigate to {msg.toolResultData.navigateTo} <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              JSON.stringify(msg.toolResultData, null, 2).slice(0, 150)
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Confirmation Modal Container */}
                    {msg.responseType === 'CONFIRMATION_REQUIRED' && msg.previewPayload && (
                      <div className="mt-3">
                        <AITaskConfirmation
                          previewPayload={msg.previewPayload}
                          onConfirmed={(result) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                role: 'assistant',
                                content: `✅ ${result.message || 'Action executed successfully!'}`,
                              },
                            ]);
                          }}
                          onCancel={() => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                role: 'assistant',
                                content: 'Action cancelled by user.',
                              },
                            ]);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs italic">
                  <Bot className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Processing task with controlled tool registry...</span>
                </div>
              )}
            </div>

            {/* Input Bar & Controls */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <VoiceInput
                  onCommandResolved={(cmd) => {
                    if (cmd.rawTranscript) {
                      setInput(cmd.rawTranscript);
                      handleSend(cmd.rawTranscript);
                    }
                  }}
                />
                <input
                  type="text"
                  value={input}
                  maxLength={2000}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask AI Task Agent... (e.g. Onion prices, weather)"
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                <span>Phase 11 Voice + Controlled Tool Layer</span>
                <span>{input.length}/2000 chars</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
