import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGameToggles, useUpsertGameToggle } from '@/hooks/useGameToggles';

export function GameLibraryTab() {
  const { data: toggles, isLoading } = useGameToggles();
  const upsert = useUpsertGameToggle();

  const handleToggle = (gameId: string, enabled: boolean) => {
    upsert.mutate({ gameId, enabled }, { onError: () => toast.error('Failed to update game toggle') });
  };

  if (isLoading) return <p className="text-muted-foreground py-4">Loading game library…</p>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="px-4 py-3">Game</TableHead>
            <TableHead className="px-4 py-3">Description</TableHead>
            <TableHead className="px-4 py-3 text-right">Enabled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {toggles?.map(({ game, enabled }) => (
            <TableRow key={game.id}>
              <TableCell className="px-4 py-3 font-medium">{game.name}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">{game.description ?? '—'}</TableCell>
              <TableCell className="px-4 py-3 text-right">
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggle(game.id, checked)}
                  disabled={upsert.isPending}
                />
              </TableCell>
            </TableRow>
          ))}
          {(!toggles || toggles.length === 0) && (
            <TableRow>
              <TableCell colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                No games in library
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
