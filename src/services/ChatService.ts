/**
 * Chat Service for Puzzle Assistant
 * 
 * Integrates with OpenRouter API to provide AI-powered puzzle assistance.
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

const OPENROUTER_API_URL = import.meta.env.VITE_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = import.meta.env.VITE_CHAT_MODEL || 'stepfun/step-3.5-flash:free';
const FALLBACK_MODEL = 'google/gemma-3-27b-it:free';
const MAX_TOKENS = Number(import.meta.env.VITE_CHAT_MAX_TOKENS) || 1000;
const TEMPERATURE = Number(import.meta.env.VITE_CHAT_TEMPERATURE) || 0.7;

// Rate limiting
const COOLDOWN_MS = 2000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
let lastRequestTime = 0;
let requestTimestamps: number[] = [];

/**
 * Gets the OpenRouter API key from environment variables
 */
function getApiKey(): string | null {
    return import.meta.env.VITE_OPENROUTER_API_KEY || null;
}

/**
 * Calls OpenRouter with a specific model and returns the result
 */
async function callModel(apiKey: string, messages: ChatMessage[], model: string): Promise<ChatResponse> {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Virtual Lego Puzzle Editor',
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: MAX_TOKENS,
                temperature: TEMPERATURE,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `API error: ${response.status}`;
            return { success: false, message: '', error: errorMessage };
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content;
        if (!assistantMessage) {
            console.warn(`Empty response from ${model}:`, JSON.stringify(data));
            return { success: false, message: '', error: `Model returned an empty response. It may be temporarily unavailable.` };
        }
        return { success: true, message: assistantMessage };
    } catch (error) {
        console.error(`Chat API error (${model}):`, error);
        return {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : 'Failed to connect to the chat service.',
        };
    }
}

/**
 * Sends a message to the chatbot and returns the response
 */
export async function sendChatMessage(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    puzzleContext?: string
): Promise<ChatResponse> {
    const apiKey = getApiKey();

    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
        return {
            success: false,
            message: '',
            error: 'OpenRouter API key not configured. Please add your API key to the .env file.',
        };
    }

    const systemPromptWithContext = puzzleContext
        ? `${CHATBOT_SYSTEM_PROMPT}\n\nCURRENT PUZZLE CONTEXT:\n${puzzleContext}`
        : CHATBOT_SYSTEM_PROMPT;

    // Rate limiting checks
    const now = Date.now();
    if (now - lastRequestTime < COOLDOWN_MS) {
        return {
            success: false,
            message: '',
            error: 'Please wait a moment before sending another message.',
        };
    }
    requestTimestamps = requestTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (requestTimestamps.length >= RATE_LIMIT_MAX) {
        return {
            success: false,
            message: '',
            error: 'Rate limit reached. Please wait a few minutes before sending more messages.',
        };
    }
    lastRequestTime = now;
    requestTimestamps.push(now);

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPromptWithContext },
        ...conversationHistory,
        { role: 'user', content: userMessage },
    ];

    const result = await callModel(apiKey, messages, MODEL);

    if (result.success) return result;

    // Primary model failed — retry with fallback
    if (MODEL !== FALLBACK_MODEL) {
        console.warn(`Primary model "${MODEL}" failed, falling back to "${FALLBACK_MODEL}"`);
        return callModel(apiKey, messages, FALLBACK_MODEL);
    }

    return result;
}

/**
 * Validates that the API key is configured
 */
export function isApiKeyConfigured(): boolean {
    const apiKey = getApiKey();
    return !!apiKey && apiKey !== 'your_openrouter_api_key_here';
}
