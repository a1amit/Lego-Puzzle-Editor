/**
 * Chat Panel Component
 * 
 * A premium chat interface adapted from user's reference design.
 * Now features draggable positioning with persistence.
 */

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { sendChatMessage, isApiKeyConfigured, ChatMessage } from '../../services/ChatService';
import { usePuzzleStore } from '../../store/puzzleStore';
import legoAvatarImg from '../../assets/lego-avatar.png';

// Lego Minifigure Helper Icon
export const LegoHelperIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <div className={`relative ${className} flex items-center justify-center`}>
        <img
            src={legoAvatarImg}
            alt="Lego Helper"
            className="w-full h-full object-contain filter drop-shadow-sm rounded-full"
        />
    </div>
);

// Send Icon
const SendIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
);

// Close Icon
const CloseIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Check for RTL characters
function isRTL(text: string) {
    const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    return rtlRegex.test(text);
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Draggable state
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize position from storage or default
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chat_panel_position');
            if (saved) {
                try {
                    setPosition(JSON.parse(saved));
                    return;
                } catch (e) {
                    console.error("Failed to parse chat position", e);
                }
            }
            // Default: Bottom Left (20px margin)
            // Window height approx check to avoid off-screen
            const defaultY = Math.max(20, window.innerHeight - 680);
            setPosition({ x: 20, y: defaultY });
        }
    }, [isOpen]); // Re-check on open to ensure it fits? or just once mount. 
    // Actually, if window resizes while closed, we might want to clamp. 
    // For now, simple load once is fine, or on open.

    // Connect to puzzle store for context
    const { puzzle, isComplete, moveCount, boardState } = usePuzzleStore();

    // Drag Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!position) return;
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;

            // Calculate new position
            const newX = e.clientX - dragOffset.current.x;
            const newY = e.clientY - dragOffset.current.y;

            // Set position (no clamping for now, free drag)
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                // Save to storage
                if (position) {
                    localStorage.setItem('chat_panel_position', JSON.stringify(position));
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [position]);


    const getConversationHistory = (): ChatMessage[] => {
        return messages.map(m => ({
            role: m.role,
            content: m.content,
        }));
    };

    const getPuzzleContext = (): string => {
        if (!puzzle) return "No puzzle currently loaded.";
        const placedCount = boardState.placedBricks.length;
        const totalInventory = puzzle.inventory.reduce((sum, b) => sum + b.quantity, 0);
        const progress = `${placedCount} bricks placed out of approx ${totalInventory} available.`;

        return `
PUZZLE: ${puzzle.title} (ID: ${puzzle.puzzle_id})
DESCRIPTION: ${puzzle.description}
TYPE: ${puzzle.viewMode === '3D' ? '3D Construction' : '2D Grid/Slider'}
STATUS: ${isComplete ? 'SOLVED' : 'IN PROGRESS'}
MOVES: ${moveCount}
PROGRESS: ${progress}
VALIDATION RULES:
${puzzle.validation_rules.map(r => `- ${r.rule}`).join('\n')}

INVENTORY ITEMS:
${puzzle.inventory.map(b => `- ${b.quantity}x ${b.shape} (${b.color})`).join('\n')}
    `.trim();
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: inputValue.trim() };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);
        setError(null);

        const history = getConversationHistory();
        const context = getPuzzleContext();

        const response = await sendChatMessage(userMessage.content, history, context);
        setIsLoading(false);

        if (response.success) {
            setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
        } else {
            setError(response.error || "Failed to get response");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Focus input
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const apiConfigured = isApiKeyConfigured();
    const isInputRTL = isRTL(inputValue);

    if (!isOpen) return null;

    // Wait for client-side hydration/mount to have position
    if (!position) return null;

    return (
        <div className="fixed inset-0 z-[9999] font-sans pointer-events-none">
            {/* Backdrop (invisible but catches clicks outside) */}
            <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

            {/* Chat Window - Absolute positioned based on state */}
            <div
                className="pointer-events-auto absolute w-full h-[600px] md:w-[380px] md:h-[650px] md:max-h-[80vh] bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up-chat border border-gray-200"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    margin: 0 // Override any margin
                }}
            >

                {/* Header - Draggable handle */}
                <div
                    onMouseDown={handleMouseDown}
                    className="bg-gradient-to-r from-[#1a3a2f] to-[#2d5a47] p-4 flex items-center justify-between shadow-md z-10 cursor-move"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                            <LegoHelperIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight select-none">Puzzle Assistant</h3>
                            <p className="text-white/70 text-xs font-medium select-none">
                                {puzzle ? puzzle.title : 'Ready to help'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }} // Stop propagation so click doesn't start drag? No, click is distinct. But good habit.
                            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label="Close chat"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f2f5] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {/* Welcome message */}
                    {messages.length === 0 && (
                        <div className="bg-white rounded-2xl rounded-tr-sm p-4 shadow-sm max-w-[90%] border border-gray-100">
                            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-50">
                                <div className="w-8 h-8 bg-[#1a3a2f]/10 rounded-full flex items-center justify-center">
                                    <LegoHelperIcon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-[#1a3a2f] text-sm">Assistant</span>
                            </div>
                            <p className="text-[#1a3a2f] text-sm leading-relaxed">
                                Hello! 👋 I'm your Puzzle Assistant.
                                <br /><br />
                                I can help you solve <strong>{puzzle?.title || 'this puzzle'}</strong> by explaining rules, checking your progress, or giving hints.
                                <br /><br />
                                How can I help you today?
                            </p>
                            {!apiConfigured && (
                                <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800">
                                    ⚠️ API key missing in .env
                                </div>
                            )}
                        </div>
                    )}

                    {messages.map((message, index) => {
                        const isMsgRTL = isRTL(message.content);
                        return (
                            <div
                                key={index}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    dir={isMsgRTL ? 'rtl' : 'ltr'}
                                    className={`w-fit max-w-[85%] rounded-2xl px-5 py-3 shadow-sm break-words leading-relaxed ${message.role === "user"
                                        ? "bg-[#3b82f6] text-white rounded-tl-sm shadow-md" // Blue (User) - Rounded Top Left Small
                                        : "bg-white text-[#1f2937] rounded-tr-sm border border-gray-100 shadow-sm" // White (Assistant) - Rounded Top Right Small
                                        } ${isMsgRTL ? 'text-right' : 'text-left'}`}
                                >
                                    {message.role === "assistant" ? (
                                        <div className="markdown-content">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                                components={{
                                                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-6">{children}</p>,
                                                    strong: ({ children }) => <span className="font-bold">{children}</span>,
                                                    ul: ({ children }) => <ul className="list-disc pr-4 mb-2 space-y-1 mr-4">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal pr-4 mb-2 space-y-1 mr-4">{children}</ol>,
                                                    code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600">{children}</code>,
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm border border-gray-100">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="flex justify-center">
                            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 text-xs border border-red-100 shadow-sm">
                                {error}
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100 relative z-20">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            dir={isInputRTL ? 'rtl' : 'ltr'}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={apiConfigured ? "Type your message..." : "Setup API key..."}
                            className="flex-1 bg-[#f8f9fa] rounded-xl px-4 py-3 text-sm text-[#1f2937] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a2f]/10 focus:bg-white transition-all border border-transparent focus:border-[#1a3a2f]/10"
                            disabled={!apiConfigured || isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputValue.trim() || isLoading || !apiConfigured}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all shadow-md active:scale-95 ${!inputValue.trim() || isLoading
                                ? 'bg-gray-200 cursor-not-allowed shadow-none'
                                : 'bg-[#1a3a2f] hover:bg-[#2d5a47] shadow-[#1a3a2f]/20'
                                }`}
                        >
                            <SendIcon />
                        </button>
                    </div>
                    <div className="mt-2 text-center">
                        <p className="text-[9px] uppercase tracking-widest text-gray-300 font-medium">
                            Puzzle Assistant
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
