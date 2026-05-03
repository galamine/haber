import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CODE_BLOCK_ANIMATIONS } from '@/constants/animations';

interface CodeBlockProps {
  code: string;
  language: string;
  id: string;
  title?: string;
  copiedCode: string | null;
  onCopy: (code: string, id: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language: _language, id, title, copiedCode, onCopy }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const { lines, shouldTruncate, displayCode } = useMemo(() => {
    const codeLines = code.trim().split('\n');
    const shouldTruncate = codeLines.length > 8;
    const truncatedLines = shouldTruncate ? codeLines.slice(0, 8) : codeLines;
    const truncatedCode = truncatedLines.join('\n');
    const displayCode = isExpanded ? code.trim() : truncatedCode;

    return {
      lines: codeLines,
      shouldTruncate,
      displayCode,
    };
  }, [code, isExpanded]);

  const handleCopy = () => {
    const fullCodeToCopy = code.trim();
    onCopy(fullCodeToCopy, id);
  };

  const toggleExpanded = () => {
    if (!shouldTruncate) return;

    setIsAnimating(true);
    setIsExpanded(!isExpanded);

    // Reset animation state after transition
    setTimeout(() => {
      setIsAnimating(false);
    }, CODE_BLOCK_ANIMATIONS.EXPAND_DURATION);
  };

  // Calculate content height for smooth transitions (displayCode changes on expand/collapse)
  // biome-ignore lint/correctness/useExhaustiveDependencies: displayCode must rerun when truncated vs full content swaps
  useEffect(() => {
    if (contentRef.current && shouldTruncate) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [displayCode, shouldTruncate]);

  return (
    <div className="relative group">
      {title && (
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {title}
        </div>
      )}
      <div className="bg-brown-100 border border-brown-300 rounded-lg p-1 shadow-md">
        <div className="relative bg-white border border-brown-200 rounded-md overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute top-3 right-3 z-20 h-8 px-3 bg-white hover:bg-brown-50 border border-brown-200 rounded transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {copiedCode === id ? (
              <>
                <Check className="h-3 w-3 mr-1.5" />
                <span className="text-xs font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1.5" />
                <span className="text-xs font-medium">Copy</span>
              </>
            )}
          </Button>

          <div className="relative">
            <div
              ref={contentRef}
              className={`transition-all ease-out ${shouldTruncate && !isExpanded ? 'overflow-hidden' : ''}`}
              style={{
                maxHeight: shouldTruncate
                  ? isExpanded
                    ? contentHeight
                      ? `${contentHeight}px`
                      : 'none'
                    : CODE_BLOCK_ANIMATIONS.TRUNCATED_HEIGHT
                  : 'none',
                transitionDuration: `${CODE_BLOCK_ANIMATIONS.EXPAND_DURATION}ms`,
              }}
            >
              <pre
                className="bg-white p-4 rounded-md overflow-x-auto font-mono"
                style={{
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.6,
                  color: 'var(--color-text-primary)',
                  paddingBottom: shouldTruncate ? '3rem' : '1rem',
                  margin: 0,
                }}
              >
                <code
                  style={{
                    color: 'var(--color-text-primary)',
                    transitionDuration: `${CODE_BLOCK_ANIMATIONS.CONTENT_OPACITY_ANIMATION}ms`,
                  }}
                  className={`transition-opacity ${isAnimating ? 'opacity-70' : 'opacity-100'}`}
                >
                  {displayCode}
                </code>
              </pre>
            </div>

            {/* Animated fade overlay when truncated */}
            {shouldTruncate && !isExpanded && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-16 pointer-events-none rounded-b-md transition-opacity ${
                  isAnimating ? 'opacity-50' : 'opacity-100'
                }`}
                style={{
                  background:
                    'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
                  transitionDuration: `${CODE_BLOCK_ANIMATIONS.FADE_OVERLAY_DURATION}ms`,
                }}
              />
            )}

            {/* Animated show more/less button */}
            {shouldTruncate && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleExpanded}
                  disabled={isAnimating}
                  className={`h-7 px-3 bg-white hover:bg-brown-50 border border-brown-200 rounded-full shadow-sm transition-all ${
                    isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100 hover:shadow-md'
                  }`}
                  style={{
                    color: 'var(--color-text-tertiary)',
                    transitionDuration: `${CODE_BLOCK_ANIMATIONS.EXPAND_DURATION}ms`,
                    transform: isAnimating ? `scale(${CODE_BLOCK_ANIMATIONS.BUTTON_SCALE_ACTIVE})` : `scale(1)`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isAnimating) {
                      e.currentTarget.style.transform = `scale(${CODE_BLOCK_ANIMATIONS.BUTTON_SCALE_HOVER})`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAnimating) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <div
                    className={`flex items-center transition-transform ${isAnimating ? 'scale-90' : 'scale-100'}`}
                    style={{
                      transitionDuration: `${CODE_BLOCK_ANIMATIONS.CONTENT_OPACITY_ANIMATION}ms`,
                    }}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp
                          className={`h-3 w-3 mr-1.5 transition-transform ${isAnimating ? '-rotate-12' : 'rotate-0'}`}
                          style={{
                            transitionDuration: `${CODE_BLOCK_ANIMATIONS.ICON_ROTATION_DURATION}ms`,
                          }}
                        />
                        <span className="text-xs font-medium">Show less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown
                          className={`h-3 w-3 mr-1.5 transition-transform ${isAnimating ? 'rotate-12' : 'rotate-0'}`}
                          style={{
                            transitionDuration: `${CODE_BLOCK_ANIMATIONS.ICON_ROTATION_DURATION}ms`,
                          }}
                        />
                        <span className="text-xs font-medium">Show more ({lines.length - 8} more lines)</span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
