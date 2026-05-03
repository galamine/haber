import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SimpleDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

interface SimpleDropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
}

interface SimpleDropdownSeparatorProps {
  className?: string;
}

export function SimpleDropdown({ trigger, children, align = 'start', className }: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (!isOpen) {
      return undefined;
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (!isOpen) {
      return undefined;
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔥 Simple dropdown trigger clicked, opening:', !isOpen);
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <div ref={triggerRef} onClick={handleTriggerClick} className="cursor-pointer">
        {trigger}
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full mt-1 min-w-[160px] bg-white border border-brown-200 rounded-lg shadow-lg z-[99999] py-1',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
          style={{
            position: 'absolute',
            zIndex: 99999,
          }}
        >
          <div onClick={() => setIsOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

export function SimpleDropdownItem({ children, onClick, className, destructive }: SimpleDropdownItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔥 Simple dropdown item clicked:', children);
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-3 py-2 text-sm cursor-pointer hover:bg-brown-50 transition-colors flex items-center gap-2',
        destructive && 'text-red-600 hover:bg-red-50',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SimpleDropdownSeparator({ className }: SimpleDropdownSeparatorProps) {
  return <div className={cn('h-px bg-brown-200 my-1 mx-1', className)} />;
}
