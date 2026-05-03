import type React from 'react';

interface PinterestLayoutProps {
  children: React.ReactElement[];
  columns?: number;
  gap?: number;
}

export const PinterestLayout: React.FC<PinterestLayoutProps> = ({ children, gap = 24 }) => {
  return (
    <div
      className="relative"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: `${gap}px`,
        alignItems: 'start',
      }}
    >
      {children.map((child, index) => (
        <div key={index} className="break-inside-avoid">
          {child}
        </div>
      ))}
    </div>
  );
};
