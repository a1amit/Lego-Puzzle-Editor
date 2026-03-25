/**
 * Chat Panel Component
 *
 * Dark-themed chat interface with draggable positioning (desktop)
 * and bottom-sheet pattern (mobile).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { sendChatMessage, isApiKeyConfigured, ChatMessage } from '../../services/ChatService';
import { isDesignIntent, getDesignContext } from '../../services/puzzleContext';
import { usePuzzleStore } from '../../store/puzzleStore';
import { ArrowUp, X, Plus, Lightbulb, ClipboardCheck, ChartBar, Zap, WandSparkles, GripHorizontal } from 'lucide-react';
import { Button } from '../ui/shadcn/button';
import { LegoHelperIcon } from './LegoHelperIcon';

// Re-export for backward compatibility
export { LegoHelperIcon };

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

/** Hook to detect mobile viewport (<768px) */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 620;

/** Clamp position to keep panel visible within the viewport */
function clampPosition(pos: { x: number; y: number }) {
  const pad = 20;
  const maxX = window.innerWidth - PANEL_WIDTH + pad;
  const maxY = window.innerHeight - PANEL_HEIGHT + pad;
  return {
    x: Math.max(-pad, Math.min(pos.x, maxX)),
    y: Math.max(-pad, Math.min(pos.y, maxY)),
  };
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useIsMobile();

  // Desktop draggable state (pointer-based)
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Mobile bottom-sheet state
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  const sheetDragStartY = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mobile bottom-sheet ref
  const sheetRef = useRef<HTMLDivElement>(null);

  // Initialize position from storage or default, clamped to viewport
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      const saved = localStorage.getItem('chat_panel_position');
      if (saved) {
        try {
          setPosition(clampPosition(JSON.parse(saved)));
          return;
        } catch (e) {
          console.error("Failed to parse chat position", e);
        }
      }
      const defaultY = Math.max(20, window.innerHeight - 680);
      setPosition(clampPosition({ x: 20, y: defaultY }));
    }
  }, [isOpen, isMobile]);

  // Re-clamp position when window is resized (prevents off-screen)
  useEffect(() => {
    if (isMobile) return;
    const handleResize = () => {
      setPosition(prev => prev ? clampPosition(prev) : prev);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Reset bottom-sheet translate when opened
  useEffect(() => {
    if (isOpen && isMobile) setSheetTranslateY(0);
  }, [isOpen, isMobile]);

  // Connect to puzzle store for context
  const { puzzle, isComplete, moveCount, boardState, validationResults, inventoryState } = usePuzzleStore();

  // Desktop Drag Handlers (pointer events)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMobile || !position) return;
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPosition(clampPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    }));
  }, []);

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setPosition(prev => {
        if (prev) {
          const clamped = clampPosition(prev);
          localStorage.setItem('chat_panel_position', JSON.stringify(clamped));
          return clamped;
        }
        return prev;
      });
    }
  }, []);

  // Mobile bottom-sheet swipe handlers
  const handleSheetPointerDown = (e: React.PointerEvent) => {
    sheetDragStartY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSheetPointerMove = (e: React.PointerEvent) => {
    if (sheetDragStartY.current === null) return;
    const dy = e.clientY - sheetDragStartY.current;
    // Only allow dragging downward
    setSheetTranslateY(Math.max(0, dy));
  };

  const handleSheetPointerUp = () => {
    // Close if dragged more than 30% of sheet height
    const sheetH = sheetRef.current?.offsetHeight ?? 400;
    if (sheetTranslateY > sheetH * 0.3) {
      onClose();
    }
    setSheetTranslateY(0);
    sheetDragStartY.current = null;
  };

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
    const { width, height } = boardState.dimensions;

    // Compact placed bricks: "T-tetromino at (2,1) rot=90"
    const placedLines = boardState.placedBricks.map(b =>
      `- ${b.shape} at (${b.position.x},${b.position.y})${b.rotation ? ` rot=${b.rotation}` : ''}`
    );

    // Remaining inventory from store state
    const remainingLines = puzzle.inventory
      .map(b => {
        const remaining = inventoryState.get(b.id) ?? b.quantity;
        return remaining > 0 ? `- ${remaining}x ${b.shape}` : null;
      })
      .filter(Boolean);

    // Validation status: "✓ NO_BRICK_OVERLAP" or "✗ ALL_BOARD_SQUARES_MUST_BE_COVERED: 5 cells uncovered"
    const validationLines = validationResults.map(r =>
      `- ${r.isValid ? 'PASS' : 'FAIL'} ${r.rule}${!r.isValid && r.message ? `: ${r.message}` : ''}`
    );

    return `
PUZZLE: ${puzzle.title}
DESCRIPTION: ${puzzle.description}
BOARD: ${width}×${height}, TYPE: ${puzzle.viewMode === '3D' ? '3D Construction' : '2D Grid/Slider'}
STATUS: ${isComplete ? 'SOLVED' : 'IN PROGRESS'}
MOVES: ${moveCount}
PROGRESS: ${placedCount}/${totalInventory} bricks placed

BOARD STATE (placed bricks):
${placedLines.length > 0 ? placedLines.join('\n') : '(empty board)'}

REMAINING INVENTORY:
${remainingLines.length > 0 ? remainingLines.join('\n') : '(all placed)'}

VALIDATION:
${validationLines.length > 0 ? validationLines.join('\n') : '(no rules checked yet)'}
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
    let context = getPuzzleContext();

    // Inject design context when the user (or conversation) is about designing puzzles
    const conversationHasDesignIntent = history.some(m => isDesignIntent(m.content));
    if (isDesignIntent(text) || conversationHasDesignIntent) {
      context += '\n\n' + getDesignContext();
    }

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

  if (!isOpen) return null;
  // Desktop needs position loaded
  if (!isMobile && !position) return null;

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
      icon: <ChartBar className="w-5 h-5 text-pink-400" />,
      title: "Progress",
      content: "How am I doing so far?",
    },
    {
      icon: <Zap className="w-5 h-5 text-orange-400" />,
      title: "Strategy",
      content: "What strategy should I use?",
    },
    {
      icon: <WandSparkles className="w-5 h-5 text-emerald-400" />,
      title: "Design",
      content: "Help me design a new puzzle",
    },
  ];

  /** Shared chat content (used in both desktop and mobile layouts) */
  const chatContent = (
    <>
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
              className={`p-3.5 flex flex-col text-left gap-3 rounded-xl w-full bg-secondary hover:bg-[var(--surface-panel)] border border-[var(--border-subtle)] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-suggestion-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${index === suggestions.length - 1 && suggestions.length % 2 !== 0 ? 'col-span-2' : ''}`}
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
        <div className="flex-1 overflow-y-auto p-3" role="log" aria-live="polite" aria-label="Chat messages">
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
                <div className="px-4 py-3 rounded-xl bg-secondary border border-[var(--border-subtle)]">
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
        <div className="flex items-end gap-2 bg-secondary rounded-xl border border-[var(--border-subtle)] focus-within:border-primary/40 transition-colors duration-150">
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
          {/* Send button */}
          <div className="shrink-0 pb-2 pr-2">
            <Button
              size="icon"
              className={`w-8 h-8 rounded-full ${
                !(inputValue.trim() && apiConfigured && !isLoading) ? 'bg-secondary text-muted-foreground hover:bg-secondary' : ''
              }`}
              onClick={() => sendMessage()}
              disabled={!inputValue.trim() || !apiConfigured || isLoading}
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  // ── Mobile bottom-sheet layout ──
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 font-sans" style={{ isolation: 'isolate' }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* Bottom sheet */}
        <div
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 bg-[var(--surface-raised)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] rounded-t-2xl flex flex-col overflow-hidden shadow-2xl animate-chat-open"
          style={{
            maxHeight: '85vh',
            transform: `translateY(${sheetTranslateY}px)`,
            transition: sheetDragStartY.current !== null ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {/* Drag handle */}
          <div
            className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
          >
            <GripHorizontal className="w-8 h-1.5 text-muted-foreground/50" />
          </div>

          {/* Title bar */}
          <div className="h-10 w-full flex items-center justify-between px-4 border-b border-[var(--border-subtle)] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/20">
                <LegoHelperIcon className="w-4 h-4" />
              </div>
              <span className="text-foreground/90 text-sm font-medium tracking-tight">
                Puzzle Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleNewConversation(); }}
                  title="New conversation"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClose(); }}
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {chatContent}
        </div>
      </div>
    );
  }

  // ── Desktop floating window layout ──
  return (
    <div className="fixed inset-0 z-50 font-sans pointer-events-none" style={{ isolation: 'isolate' }}>
      {/* Chat Window */}
      <div
        className="pointer-events-auto absolute w-[420px] h-[620px] max-h-[80vh] bg-[var(--surface-raised)]/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-xl flex flex-col overflow-hidden shadow-2xl animate-chat-open"
        style={{
          left: `${position!.x}px`,
          top: `${position!.y}px`,
          margin: 0,
        }}
      >
        {/* Title bar - dark, draggable */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="h-11 w-full flex items-center justify-between px-4 bg-background/90 backdrop-blur-md border-b border-[var(--border-subtle)] cursor-move select-none shrink-0 touch-none"
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

        {chatContent}
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
        className="text-sm px-4 py-2.5 rounded-xl w-fit max-w-[80%] bg-secondary text-foreground break-words border border-[var(--border-subtle)]"
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
              },
              code: ({ className, children, ...props }) => {
                const isBlock = className?.includes('language-');
                const lang = className?.replace('language-', '') ?? '';
                const codeStr = String(children).replace(/\n$/, '');

                if (isBlock && (lang === 'json' || lang === 'jsonc')) {
                  return (
                    <pre className="bg-[var(--surface-sunken)] rounded-lg p-3 text-xs overflow-x-auto my-2 border border-[var(--border-subtle)]">
                      <code className="font-mono">
                        <JsonHighlighted code={codeStr} />
                      </code>
                    </pre>
                  );
                }

                if (isBlock) {
                  return (
                    <pre className="bg-[var(--surface-sunken)] rounded-lg p-3 text-xs overflow-x-auto my-2 border border-[var(--border-subtle)]">
                      <code className="font-mono" {...props}>{children}</code>
                    </pre>
                  );
                }

                return <code className={className} {...props}>{children}</code>;
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

/** Simple JSON syntax highlighter */
function JsonHighlighted({ code }: { code: string }) {
  const tokens = tokenizeJson(code);
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={t.className}>{t.text}</span>
      ))}
    </>
  );
}

interface JsonToken { text: string; className: string; }

function tokenizeJson(code: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  const regex = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\]:,])|(\s+)|([^\s"{}[\]:,]+)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    if (match[1] !== undefined) {
      tokens.push({ text: match[1], className: 'text-cyan-400' });
      const rest = match[0].slice(match[1].length);
      if (rest) tokens.push({ text: rest, className: 'text-muted-foreground' });
    } else if (match[2] !== undefined) {
      tokens.push({ text: match[2], className: 'text-emerald-400' });
    } else if (match[3] !== undefined) {
      tokens.push({ text: match[3], className: 'text-orange-400' });
    } else if (match[4] !== undefined) {
      tokens.push({ text: match[4], className: 'text-purple-400' });
    } else if (match[5] !== undefined) {
      tokens.push({ text: match[5], className: 'text-red-400' });
    } else if (match[6] !== undefined) {
      tokens.push({ text: match[6], className: 'text-muted-foreground' });
    } else {
      tokens.push({ text: match[0], className: '' });
    }
  }
  return tokens;
}
