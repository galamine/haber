import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary';
    className?: string;
  };
  onBack: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, badge, onBack }) => {
  return (
    <div className="bg-white border-b border-brown-200 sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2 hover:bg-brown-50">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{title}</h1>
              {badge && (
                <Badge
                  variant={badge.variant || 'secondary'}
                  className={badge.className || 'bg-orange-100 text-orange-700 border-orange-200'}
                >
                  {badge.text}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
