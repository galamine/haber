import { useCallback, useEffect, useRef } from 'react';

interface UseInputKeyboardShortcutsProps {
  value: string;
  onChange: (value: string) => void;
  enableGlobalShortcuts?: boolean;
  onFocus?: () => void;
}

export function useInputKeyboardShortcuts({
  value: _value,
  onChange,
  enableGlobalShortcuts = false,
  onFocus,
}: UseInputKeyboardShortcutsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Aggressive keyboard shortcut handler that bypasses all browser limitations
  const handleGlobalShortcuts = useCallback(
    (e: KeyboardEvent) => {
      if (!enableGlobalShortcuts) return;

      console.log('🚀 FORCE SHORTCUTS - Event captured:', {
        key: e.key,
        code: e.code,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        target: e.target?.constructor.name,
        tagName: (e.target as HTMLElement)?.tagName,
        activeElement: document.activeElement?.tagName,
        enableGlobalShortcuts,
      });

      // Skip if already in form inputs (but log it)
      const target = e.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;
      const isInInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.contentEditable === 'true' ||
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.contentEditable === 'true';

      if (isInInput) {
        console.log('🚀 FORCE SHORTCUTS - Skipped: already in input field');
        return;
      }

      // Handle Cmd/Ctrl + K with maximum aggression
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
        console.log('🚀 FORCE SHORTCUTS - Cmd+K DETECTED! Forcing focus...');

        // FORCE prevent all default behaviors
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Multiple attempts to focus the input
        if (inputRef.current) {
          console.log('🚀 FORCE SHORTCUTS - Attempting input focus...');

          // Method 1: Direct focus
          inputRef.current.focus();
          inputRef.current.select();

          // Method 2: Delayed focus (in case of timing issues)
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.select();
              console.log('🚀 FORCE SHORTCUTS - Delayed focus applied');
            }
          }, 10);

          // Method 3: Force focus with click simulation
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.click();
              inputRef.current.focus();
              inputRef.current.select();
              console.log('🚀 FORCE SHORTCUTS - Click simulation applied');
            }
          }, 20);

          // Trigger callback
          if (onFocus) {
            onFocus();
          }

          console.log('🚀 FORCE SHORTCUTS - Cmd+K shortcut triggered successfully!');
        } else {
          console.error('🚀 FORCE SHORTCUTS - ERROR: Input ref is null!');
        }
        return false; // Completely block the event
      }

      // Handle "/" key with maximum aggression
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        console.log('🚀 FORCE SHORTCUTS - "/" DETECTED! Forcing focus...');

        // FORCE prevent all default behaviors
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Multiple attempts to focus the input
        if (inputRef.current) {
          console.log('🚀 FORCE SHORTCUTS - Attempting input focus via /...');

          // Method 1: Direct focus
          inputRef.current.focus();
          inputRef.current.select();

          // Method 2: Delayed focus
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.select();
              console.log('🚀 FORCE SHORTCUTS - Delayed focus via / applied');
            }
          }, 10);

          // Trigger callback
          if (onFocus) {
            onFocus();
          }

          console.log('🚀 FORCE SHORTCUTS - "/" shortcut triggered successfully!');
        } else {
          console.error('🚀 FORCE SHORTCUTS - ERROR: Input ref is null for /!');
        }
        return false; // Completely block the event
      }
      return undefined;
    },
    [enableGlobalShortcuts, onFocus]
  );

  // Local input key handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      console.log('🚀 FORCE SHORTCUTS - Local keydown:', e.key);

      // Ctrl+A or Cmd+A to select all
      if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.select();
          console.log('🚀 FORCE SHORTCUTS - Select all triggered');
        }
        return;
      }

      // Escape to clear and blur
      if (e.key === 'Escape') {
        onChange('');
        if (inputRef.current) {
          inputRef.current.blur();
          console.log('🚀 FORCE SHORTCUTS - Escape triggered, cleared input');
        }
        return;
      }
    },
    [onChange]
  );

  // AGGRESSIVE event listener setup with multiple event types
  useEffect(() => {
    if (!enableGlobalShortcuts) {
      console.log('🚀 FORCE SHORTCUTS - Global shortcuts disabled');
      return;
    }

    console.log('🚀 FORCE SHORTCUTS - Setting up AGGRESSIVE global shortcut listeners');

    // Method 1: Capture phase event listener (highest priority)
    document.addEventListener('keydown', handleGlobalShortcuts, true);

    // Method 2: Bubble phase event listener (backup)
    document.addEventListener('keydown', handleGlobalShortcuts, false);

    // Method 3: Window event listener (additional backup)
    window.addEventListener('keydown', handleGlobalShortcuts, true);

    // Method 4: Body event listener (final backup)
    document.body.addEventListener('keydown', handleGlobalShortcuts, true);

    // Method 5: Direct document keyup listener (catch if keydown fails)
    const keyupHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        console.log('🚀 FORCE SHORTCUTS - Keyup Cmd+K detected as backup');
        handleGlobalShortcuts(e);
      }
      if (e.key === '/') {
        console.log('🚀 FORCE SHORTCUTS - Keyup / detected as backup');
        handleGlobalShortcuts(e);
      }
    };
    document.addEventListener('keyup', keyupHandler, true);

    return () => {
      console.log('🚀 FORCE SHORTCUTS - Removing ALL global shortcut listeners');
      document.removeEventListener('keydown', handleGlobalShortcuts, true);
      document.removeEventListener('keydown', handleGlobalShortcuts, false);
      window.removeEventListener('keydown', handleGlobalShortcuts, true);
      document.body.removeEventListener('keydown', handleGlobalShortcuts, true);
      document.removeEventListener('keyup', keyupHandler, true);
    };
  }, [handleGlobalShortcuts, enableGlobalShortcuts]);

  // Additional effect to ensure input is focusable
  useEffect(() => {
    if (inputRef.current && enableGlobalShortcuts) {
      // Ensure the input is focusable
      inputRef.current.setAttribute('tabindex', '0');
      console.log('🚀 FORCE SHORTCUTS - Input configured for focus');
    }
  }, [enableGlobalShortcuts]);

  // Manual test function for debugging
  const testFocus = useCallback(() => {
    console.log('🚀 FORCE SHORTCUTS - Manual test focus triggered');
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (onFocus) {
        onFocus();
      }
      console.log('🚀 FORCE SHORTCUTS - Manual focus successful');
    } else {
      console.error('🚀 FORCE SHORTCUTS - Manual focus failed: no input ref');
    }
  }, [onFocus]);

  return {
    inputRef,
    handleKeyDown,
    testFocus,
  };
}
