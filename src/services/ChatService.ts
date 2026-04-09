/**
 * Chat Service for Puzzle Assistant
 *
 * Uses the server-side /api/chat proxy when available (production).
 * Falls back to direct OpenRouter API calls for local development.
 */

import { CHATBOT_SYSTEM_PROMPT } from './puzzleContext';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatResponse {
    success: boolean;
    message: string;
    error?: string;
}

// Client-side rate limiting (still useful even with server proxy)
const COOLDOWN_MS = 2000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
let lastRequestTime = 0;
let requestTimestamps: number[] = [];

/**
 * Try the server-side /api/chat proxy first.
 * If it's not available (local dev without API), fall back to direct calls.
 */
async function callViaProxy(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });

        if (res.status === 503) {
            // Server proxy not configured — fall through to direct mode
            return { success: false, message: '', error: '__FALLBACK__' };
        }

        const data = await res.json();

        if (!res.ok) {
            return { success: false, message: '', error: data.error || `API error: ${res.status}` };
        }

        if (data.success && data.message) {
            return { success: true, message: data.message };
        }

        return { success: false, message: '', error: data.error || 'Empty response from chat service' };
    } catch {
        return { success: false, message: '', error: '__FALLBACK__' };
    }
}

/**
 * Direct OpenRouter call (fallback for local dev or if server proxy is down).
 */
async function callDirect(messages: ChatMessage[]): Promise<ChatResponse> {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
        return {
            success: false,
            message: '',
            error: 'Chat service not configured. Set up Clerk & deploy, or add VITE_OPENROUTER_API_KEY for local dev.',
        };
    }

    const url = import.meta.env.VITE_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    const primaryModel = import.meta.env.VITE_CHAT_MODEL || 'qwen/qwen3.6-plus:free';
    const fallbackModel = 'nvidia/nemotron-3-super-120b-a12b:free';
    const lastResortModel = 'openrouter/free';
    const maxTokens = Number(import.meta.env.VITE_CHAT_MAX_TOKENS) || 1000;
    const temperature = Number(import.meta.env.VITE_CHAT_TEMPERATURE) || 0.7;

    async function callModel(modelId: string): Promise<ChatResponse> {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Virtual Lego Puzzle Editor',
                },
                body: JSON.stringify({ model: modelId, messages, max_tokens: maxTokens, temperature }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, message: '', error: (errorData as { error?: { message?: string } }).error?.message || `API error: ${response.status}` };
            }

            const data = await response.json();
            const content = (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content;
            if (!content) return { success: false, message: '', error: 'Empty response from model.' };
            return { success: true, message: content };
        } catch (error) {
            return { success: false, message: '', error: error instanceof Error ? error.message : 'Chat service error' };
        }
    }

    const models = [primaryModel, fallbackModel, lastResortModel].filter(
        (m, i, arr) => arr.indexOf(m) === i,
    );

    for (const modelId of models) {
        const result = await callModel(modelId);
        if (result.success) return result;
    }
    return { success: false, message: '', error: 'All models unavailable. Please try again later.' };
}

/**
 * Sends a message to the chatbot and returns the response.
 * Tries server proxy first, falls back to direct OpenRouter calls.
 */
export async function sendChatMessage(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    puzzleContext?: string
): Promise<ChatResponse> {
    // Client-side rate limiting
    const now = Date.now();
    if (now - lastRequestTime < COOLDOWN_MS) {
        return { success: false, message: '', error: 'Please wait a moment before sending another message.' };
    }
    requestTimestamps = requestTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (requestTimestamps.length >= RATE_LIMIT_MAX) {
        return { success: false, message: '', error: 'Rate limit reached. Please wait a few minutes.' };
    }
    lastRequestTime = now;
    requestTimestamps.push(now);

    const systemPrompt = puzzleContext
        ? `${CHATBOT_SYSTEM_PROMPT}\n\n${puzzleContext}`
        : CHATBOT_SYSTEM_PROMPT;

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
    ];

    // Try server proxy first
    const proxyResult = await callViaProxy(messages);
    if (proxyResult.error !== '__FALLBACK__') return proxyResult;

    // Fall back to direct API call
    return callDirect(messages);
}

/**
 * Validates that chat is available (either via proxy or direct API key).
 */
export function isApiKeyConfigured(): boolean {
    // Always return true — the proxy will be tried first
    return true;
}
