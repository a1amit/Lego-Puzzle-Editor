import { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useRuleBuilderStore } from './useRuleBuilderStore';
import { ConditionEditor } from './ConditionEditor';
import { Button } from '../../ui/shadcn/button';
import { Badge } from '../../ui/shadcn/badge';
import { ScrollArea } from '../../ui/shadcn/scroll-area';
import { Plus, Trash2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';

export function RuleBuilderPanel({ className = '' }: { className?: string }) {
  const customRules = useRuleBuilderStore(s => s.customRules);
  const activeRuleId = useRuleBuilderStore(s => s.activeRuleId);
  const addRule = useRuleBuilderStore(s => s.addRule);
  const removeRule = useRuleBuilderStore(s => s.removeRule);
  const updateRuleLabel = useRuleBuilderStore(s => s.updateRuleLabel);
  const updateRuleDescription = useRuleBuilderStore(s => s.updateRuleDescription);
  const setActiveRule = useRuleBuilderStore(s => s.setActiveRule);
  const loadFromJSON = useRuleBuilderStore(s => s.loadFromJSON);

  // Load existing custom rules from puzzle JSON on mount
  useEffect(() => {
    loadFromJSON();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[var(--surface-raised)] to-[var(--surface-base)] border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          CUSTOM RULES
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono">
            {customRules.length} rule{customRules.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            size="xs"
            className="h-7 text-[10px] gap-1"
            onClick={addRule}
          >
            <Plus className="w-3 h-3" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Rules list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {customRules.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <div className="text-sm text-muted-foreground">No custom rules yet</div>
              <div className="text-xs text-muted-foreground/70">
                Add rules to define custom win conditions for your puzzle
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-1.5"
                onClick={addRule}
              >
                <Plus className="w-3.5 h-3.5" />
                Create your first rule
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {customRules.map(rule => {
                const isActive = rule.id === activeRuleId;
                return (
                  <m.div
                    key={rule.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-xl border border-[var(--border-subtle)] overflow-hidden"
                  >
                    {/* Rule header */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-raised)] cursor-pointer hover:bg-[var(--surface-panel)] transition-colors"
                      onClick={() => setActiveRule(isActive ? null : rule.id)}
                    >
                      {isActive
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      }
                      <input
                        type="text"
                        value={rule.label}
                        onChange={e => updateRuleLabel(rule.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="Rule name..."
                        className="flex-1 bg-transparent text-xs font-semibold text-foreground placeholder-muted-foreground focus:outline-none"
                      />
                      <button
                        onClick={e => { e.stopPropagation(); removeRule(rule.id); }}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Description (hint shown to the player) */}
                    {isActive && (
                      <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                        <input
                          type="text"
                          value={rule.description}
                          onChange={e => updateRuleDescription(rule.id, e.target.value)}
                          placeholder="Hint for the player (e.g. &quot;Place blue bricks on all corners&quot;)..."
                          className="w-full bg-transparent text-[11px] text-muted-foreground placeholder-muted-foreground/50 focus:outline-none focus:text-foreground"
                        />
                      </div>
                    )}

                    {/* Rule body (condition tree) */}
                    {isActive && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]"
                      >
                        <ConditionEditor
                          ruleId={rule.id}
                          path={[]}
                          node={rule.condition}
                          depth={0}
                        />
                      </m.div>
                    )}
                  </m.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
