import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DepartmentsTab } from './DepartmentsTab';
import { GameLibraryTab } from './GameLibraryTab';
import { SensoryRoomsTab } from './SensoryRoomsTab';

export function ClinicSetupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clinic Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage departments, sensory rooms, and game library</p>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="rooms">Sensory Rooms</TabsTrigger>
          <TabsTrigger value="games">Game Library</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-4">
          <DepartmentsTab />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <SensoryRoomsTab />
        </TabsContent>

        <TabsContent value="games" className="mt-4">
          <GameLibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
