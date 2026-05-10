const gameOne = {
  id: 'ee000001-0000-0000-0000-000000000001',
  name: 'Balance Beam Game',
  description: 'A balance training game',
};

const gameTwo = {
  id: 'ee000002-0000-0000-0000-000000000002',
  name: 'Bubble Popper',
  description: null as string | null,
};

const insertGames = async (games: Array<{ id: string; name: string; description: string | null }>) => {
  const { prisma } = await import('../utils/setupTestDB');
  for (const game of games) {
    await prisma.game.create({ data: game });
  }
};

export { gameOne, gameTwo, insertGames };
