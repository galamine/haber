import type { ReactNode } from 'react';

/** Shape used by MainSidebar for each nav item (`thumbnail` / `blockCount` unused by sidebar UI). */
export interface ComponentData {
  name: string;
  category: string;
  blockCount?: number;
  thumbnail?: ReactNode;
}
