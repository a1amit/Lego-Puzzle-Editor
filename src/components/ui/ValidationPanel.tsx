import { usePuzzleStore } from '../../store/puzzleStore';

interface ValidationPanelProps {
  className?: string;
}

export function ValidationPanel({ className = '' }: ValidationPanelProps) {
  const { puzzle, validationResults, isComplete, resetPuzzle } = usePuzzleStore();
  
  if (!puzzle) {
    return null;
  }
  
  const passedCount = validationResults.filter(r => r.isValid).length;
  const totalCount = validationResults.length;
  
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-editor-sidebar/50 border-b border-editor-border flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          VALIDATION
        </h3>
        <button
          onClick={resetPuzzle}
          className="px-2 py-1 text-xs bg-editor-border hover:bg-editor-accent/20 text-gray-300 hover:text-white rounded transition-colors"
        >
          Reset
        </button>
      </div>
      
      {/* Status */}
      <div className={`
        px-4 py-3 text-center
        ${isComplete 
          ? 'bg-editor-success/20 text-editor-success' 
          : 'bg-editor-sidebar'
        }
      `}>
        {isComplete ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-display font-bold">PUZZLE COMPLETE!</span>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            {passedCount} / {totalCount} rules passing
          </div>
        )}
      </div>
      
      {/* Rules list */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {validationResults.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">
            Place bricks to see validation
          </p>
        ) : (
          validationResults.map((result, index) => (
            <div
              key={index}
              className={`
                p-3 rounded-lg border transition-all duration-200
                ${result.isValid 
                  ? 'bg-editor-success/10 border-editor-success/30' 
                  : 'bg-editor-error/10 border-editor-error/30'
                }
              `}
            >
              <div className="flex items-start gap-2">
                {result.isValid ? (
                  <svg className="w-4 h-4 text-editor-success flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-editor-error flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`
                    text-xs font-display font-medium
                    ${result.isValid ? 'text-editor-success' : 'text-editor-error'}
                  `}>
                    {result.rule.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {result.message}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Puzzle info */}
      <div className="px-4 py-3 bg-editor-sidebar/50 border-t border-editor-border">
        <div className="text-xs text-gray-400">
          <div className="font-display font-medium text-white mb-1">{puzzle.title}</div>
          <p className="line-clamp-2">{puzzle.description}</p>
        </div>
      </div>
    </div>
  );
}

