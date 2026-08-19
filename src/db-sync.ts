import { AppDataSource } from './database';
import { LoggerService } from './common/logger/logger.service';

async function syncDatabase() {
  const logger = new LoggerService();

  try {
    logger.log('Starting database synchronization...');

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.log('Database connection established');
    }

    // Run migrations
    logger.log('Running pending migrations...');
    await AppDataSource.runMigrations();
    logger.log('Migrations completed successfully');

    logger.log('Database synchronization completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database synchronization failed', error);
    process.exit(1);
  }
}

syncDatabase();
