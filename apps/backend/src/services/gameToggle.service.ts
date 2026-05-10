import type { UpdateGameToggleDto } from '@haber/shared';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface GameToggleEntry {
  game: { id: string; name: string; description: string | null };
  enabled: boolean;
}

const list = async (tenantId: string): Promise<GameToggleEntry[]> => {
  const [games, toggles] = await Promise.all([
    prisma.game.findMany({ select: { id: true, name: true, description: true }, orderBy: { name: 'asc' } }),
    prisma.clinicGameToggle.findMany({ where: { tenantId }, select: { gameId: true, enabled: true } }),
  ]);

  const toggleMap = new Map(toggles.map((t) => [t.gameId, t.enabled]));

  return games.map((game) => ({
    game,
    enabled: toggleMap.get(game.id) ?? true,
  }));
};

const upsert = async (tenantId: string, body: UpdateGameToggleDto): Promise<GameToggleEntry> => {
  const game = await prisma.game.findUnique({
    where: { id: body.gameId },
    select: { id: true, name: true, description: true },
  });

  if (!game) throw new ApiError(httpStatus.BAD_REQUEST, 'Game not found');

  await prisma.clinicGameToggle.upsert({
    where: { tenantId_gameId: { tenantId, gameId: body.gameId } },
    create: { tenantId, gameId: body.gameId, enabled: body.enabled },
    update: { enabled: body.enabled },
  });

  return { game, enabled: body.enabled };
};

export const gameToggleService = { list, upsert };
