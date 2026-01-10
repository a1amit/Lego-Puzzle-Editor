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

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-3-27b-it:free';

/**
 * Gets the OpenRouter API key from environment variables
 */
function getApiKey(): string | null {
    return import.meta.env.VITE_OPENROUTER_API_KEY || null;
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

    try {
        const systemPromptWithContext = puzzleContext
            ? `${CHATBOT_SYSTEM_PROMPT}\n\nCURRENT PUZZLE CONTEXT:\n${puzzleContext}`
            : CHATBOT_SYSTEM_PROMPT;

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPromptWithContext },
            ...conversationHistory,
            { role: 'user', content: userMessage },
        ];

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Virtual Lego Puzzle Editor',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `API error: ${response.status}`;
            return {
                success: false,
                message: '',
                error: errorMessage,
            };
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

        return {
            success: true,
            message: assistantMessage,
        };
    } catch (error) {
        console.error('Chat API error:', error);
        return {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : 'Failed to connect to the chat service.',
        };
    }
}

/**
 * Validates that the API key is configured
 */
export function isApiKeyConfigured(): boolean {
    const apiKey = getApiKey();
    return !!apiKey && apiKey !== 'your_openrouter_api_key_here';
}
