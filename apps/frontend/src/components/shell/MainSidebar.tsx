import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import type React from 'react';
import { Input } from '@/components/ui/input';
import type { ComponentData } from '@/constants/componentTypes';
import { categoryIcons, componentIcons } from '@/constants/iconMappings';
import { HaberLogo } from './HaberLogo';

interface MainSidebarProps {
  onBack: () => void;
  components: ComponentData[];
  onComponentClick: (componentName: string) => void;
  currentComponent: string;
  sidebarSearchTerm: string;
  setSidebarSearchTerm: (term: string) => void;
  collapsedCategories: Set<string>;
  setCollapsedCategories: (categories: Set<string>) => void;
  sidebarInputRef: React.RefObject<HTMLInputElement>;
  handleSidebarKeyDown: (e: React.KeyboardEvent) => void;
}

export const MainSidebar: React.FC<MainSidebarProps> = ({
  onBack,
  components,
  onComponentClick,
  currentComponent,
  sidebarSearchTerm,
  setSidebarSearchTerm,
  collapsedCategories,
  setCollapsedCategories,
  sidebarInputRef,
  handleSidebarKeyDown,
}) => {
  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Group components by category
  const componentsByCategory = components.reduce(
    (acc, component) => {
      if (component?.category && component.name) {
        if (!acc[component.category]) {
          acc[component.category] = [];
        }
        acc[component.category].push(component);
      }
      return acc;
    },
    {} as Record<string, typeof components>
  );

  // Filter components based on search
  const filteredComponentsByCategory = Object.entries(componentsByCategory).reduce(
    (acc, [category, categoryComponents]) => {
      const filtered = categoryComponents.filter(
        (component) => component?.name?.toLowerCase()?.includes(sidebarSearchTerm.toLowerCase()) ?? false
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, typeof components>
  );

  return (
    <div className="w-72 bg-white border-r border-brown-200 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-6 border-b border-brown-100">
        <div
          className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-brown-50 rounded-lg p-2 -m-2 transition-colors"
          onClick={onBack}
        >
          <HaberLogo onClick={onBack} animated={false} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400 w-4 h-4" />
          <Input
            ref={sidebarInputRef}
            type="text"
            placeholder="Search..."
            className="pl-10 pr-16 bg-brown-50 border-brown-200 text-sm"
            value={sidebarSearchTerm}
            onChange={(e) => setSidebarSearchTerm(e.target.value)}
            onKeyDown={handleSidebarKeyDown}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <kbd className="pointer-events-none hidden md:inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground opacity-50">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {Object.entries(filteredComponentsByCategory).map(([category, categoryComponents]) => {
            const IconComponent = categoryIcons[category] || categoryIcons['Base components'];
            const isExpanded = !collapsedCategories.has(category);

            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between text-sm font-medium hover:text-brown-700 py-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
                    <span>{category}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 transition-transform" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {categoryComponents.map((component) => {
                      const ComponentIcon = componentIcons[component.name] || componentIcons.Default;

                      return (
                        <button
                          key={component.name}
                          onClick={() => onComponentClick(component.name)}
                          className={`w-full text-left text-sm py-2 px-3 rounded-md transition-colors flex items-center gap-2 ${
                            component.name === currentComponent ? 'bg-brown-50 font-medium' : 'hover:bg-brown-50'
                          }`}
                          style={{
                            color:
                              component.name === currentComponent
                                ? 'var(--color-fg-brand-primary)'
                                : 'var(--color-text-tertiary)',
                          }}
                        >
                          <ComponentIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{component.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
