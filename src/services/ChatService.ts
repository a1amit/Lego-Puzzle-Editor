/**
 * Chat Service for Puzzle Assistant
 *
 * Uses the server-side /api/chat proxy which calls Google Gemma 4 via Gemini API.
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

// Client-side rate limiting
const COOLDOWN_MS = 2000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
let lastRequestTime = 0;
let requestTimestamps: number[] = [];

/**
 * Sends a message to the chatbot and returns the response.
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

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });

        const data = await res.json();

        if (!res.ok) {
            return { success: false, message: '', error: data.error || `API error: ${res.status}` };
        }

        if (data.success && data.message) {
            return { success: true, message: data.message };
        }

        return { success: false, message: '', error: data.error || 'Empty response from chat service' };
    } catch (error) {
        return { success: false, message: '', error: error instanceof Error ? error.message : 'Chat service error' };
    }
}

/**
 * Chat is available when the server proxy is configured.
 */
export function isApiKeyConfigured(): boolean {
    return true;
}
