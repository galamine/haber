import app from './app';
import config from './config/config';
import logger from './config/logger';
import prisma from './config/prisma';

let server: ReturnType<typeof app.listen>;

prisma.$connect().then(() => {
  logger.info('Connected to PostgreSQL');
  server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });
});

const exitHandler = () => {
  if (server) {
    prisma.$disconnect().then(() => {
      server.close(() => {
        logger.info('Server closed');
        process.exit(1);
      });
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
