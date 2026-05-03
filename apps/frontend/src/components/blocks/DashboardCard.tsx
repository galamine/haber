import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DashboardExample } from '@/constants/dashboardData';

interface DashboardCardProps {
  dashboard: DashboardExample;
  onClick: () => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ dashboard, onClick }) => {
  return (
    <Card
      className="border-brown-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-brown-300"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-brown-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <dashboard.icon className="w-6 h-6 text-brown-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2">{dashboard.title}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
              {dashboard.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dashboard.features.slice(0, 4).map((feature, featureIndex) => (
                <div key={featureIndex} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brown-400 rounded-full"></div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
            {dashboard.features.length > 4 && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-quaternary)' }}>
                +{dashboard.features.length - 4} more features
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              {dashboard.features.length} Widgets
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};
