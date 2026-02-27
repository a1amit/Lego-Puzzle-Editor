/**
 * Chat Panel Component
 *
 * Dark-themed chat interface with draggable positioning.
 */

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { sendChatMessage, isApiKeyConfigured, ChatMessage } from '../../services/ChatService';
import { usePuzzleStore } from '../../store/puzzleStore';
import { ArrowUp, Square, X, Plus, Lightbulb, ClipboardCheck, BarChart3, Zap } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const defaultY = Math.max(20, window.innerHeight - 680);
      setPosition({ x: 20, y: defaultY });
    }
  }, [isOpen]);

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
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
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

  const sendMessage = async (content?: string) => {
    const text = content || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const history = getConversationHistory();
    const context = getPuzzleContext();

    const response = await sendChatMessage(text, history, context);
    setIsLoading(false);

    if (response.success) {
      setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
    } else {
      setError(response.error || "Failed to get response");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setError(null);
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    const maxH = 120;
    const newHeight = Math.min(ta.scrollHeight, maxH);
    ta.style.height = newHeight + 'px';
    ta.style.overflowY = ta.scrollHeight > maxH ? 'auto' : 'hidden';
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus textarea
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const apiConfigured = isApiKeyConfigured();
  const isInputRTL = isRTL(inputValue);

  if (!isOpen || !position) return null;

  // Suggestion blocks for empty state
  const suggestions = [
    {
      icon: <Lightbulb className="w-5 h-5 text-purple-400" />,
      title: "Hints",
      content: "Give me a hint for solving this puzzle",
    },
    {
      icon: <ClipboardCheck className="w-5 h-5 text-blue-400" />,
      title: "Rules",
      content: "Explain the rules of this puzzle",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-pink-400" />,
      title: "Progress",
      content: "How am I doing so far?",
    },
    {
      icon: <Zap className="w-5 h-5 text-orange-400" />,
      title: "Strategy",
      content: "What strategy should I use?",
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] font-sans pointer-events-none">
      {/* Chat Window */}
      <div
        className="pointer-events-auto absolute w-full md:w-[420px] h-[600px] md:h-[620px] md:max-h-[80vh] bg-card/95 backdrop-blur-xl border border-border/50 md:rounded-xl flex flex-col overflow-hidden shadow-2xl animate-chat-open"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          margin: 0,
        }}
      >
        {/* Title bar - dark, draggable */}
        <div
          onMouseDown={handleMouseDown}
          className="h-11 w-full flex items-center justify-between px-4 bg-background/90 backdrop-blur-md border-b border-border/50 cursor-move select-none shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/20">
              <LegoHelperIcon className="w-4.5 h-4.5" />
            </div>
            <span className="text-foreground/90 text-sm font-medium tracking-tight">
              Puzzle Assistant
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNewConversation(); }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Suggestion cards (empty state) */}
        {messages.length === 0 && (
          <div className="px-4 py-5 grid grid-cols-2 gap-2.5 overflow-y-auto">
            {!apiConfigured && (
              <div className="col-span-2 px-3 py-2 bg-warning/10 rounded-lg border border-warning/30 text-xs text-warning mb-1">
                API key not configured in .env file
              </div>
            )}
            {suggestions.map((block, index) => (
              <button
                key={block.title}
                onClick={() => sendMessage(block.content)}
                disabled={!apiConfigured}
                className="p-3.5 flex flex-col text-left gap-3 rounded-xl w-full bg-secondary/50 hover:bg-secondary/80 border border-border/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-suggestion-in"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
              >
                {block.icon}
                <div>
                  <div className="text-sm font-semibold text-foreground">{block.title}</div>
                  <div className="text-xs text-muted-foreground leading-snug mt-0.5">{block.content}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Messages area */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto p-3" role="log" aria-live="polite">
            <div className="flex flex-col gap-1">
              {messages.map((message, index) => {
                const isMsgRTL = isRTL(message.content);
                return message.role === "user" ? (
                  <UserBubble key={index} content={message.content} rtl={isMsgRTL} />
                ) : (
                  <AIBubble key={index} content={message.content} rtl={isMsgRTL} />
                );
              })}

              {/* Loading dots */}
              {isLoading && (
                <div className="p-2 flex gap-2 items-start animate-message-in">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/60 to-primary">
                    <LegoHelperIcon className="w-5 h-5" />
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-secondary border border-border/50">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex justify-center py-2 animate-message-in">
                  <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-2 text-xs border border-destructive/30">
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="pb-2" />
            </div>
          </div>
        )}

        {/* Spacer when empty */}
        {messages.length === 0 && <div className="flex-1" />}

        {/* Input area */}
        <div className="py-2 px-4 shrink-0">
          <div className="flex items-end gap-2 bg-secondary/80 rounded-xl border border-border/50 focus-within:border-primary/50 transition-colors duration-150">
            <textarea
              ref={textareaRef}
              value={inputValue}
              dir={isInputRTL ? 'rtl' : 'ltr'}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={apiConfigured ? "Type a message..." : "Setup API key in .env..."}
              disabled={!apiConfigured || isLoading}
              rows={1}
              className="flex-1 min-w-0 px-4 py-3 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none overflow-hidden disabled:opacity-50"
              style={{ resize: 'none' }}
            />
            {/* Send / Stop button */}
            <div className="shrink-0 pb-2 pr-2">
              {isLoading ? (
                <button
                  onClick={() => {/* stop not implemented for non-streaming */}}
                  className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground transition-colors hover:bg-destructive/80 cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!inputValue.trim() || !apiConfigured}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    inputValue.trim() && apiConfigured
                      ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** User message bubble */
function UserBubble({ content, rtl }: { content: string; rtl: boolean }) {
  return (
    <div className="p-2 flex gap-2 items-start justify-end animate-message-in">
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className="text-sm px-4 py-2.5 rounded-xl w-fit max-w-[80%] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground leading-relaxed break-words whitespace-pre-wrap shadow-lg"
      >
        {content}
      </div>
    </div>
  );
}

/** AI message bubble */
function AIBubble({ content, rtl }: { content: string; rtl: boolean }) {
  return (
    <div className="p-2 flex gap-2 items-start animate-message-in">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/60 to-primary">
        <LegoHelperIcon className="w-5 h-5" />
      </div>
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className="text-sm px-4 py-2.5 rounded-xl w-fit max-w-[80%] bg-secondary text-foreground break-words border border-border/50"
      >
        <div className="chat-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              a: ({ href, children, ...props }) => {
                const isSafe = href && !href.match(/^(javascript|data|vbscript):/i);
                return (
                  <a
                    href={isSafe ? href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
