import 'dotenv/config';
import { startServer } from './server.js';
import { EventMonitorWorker } from './workers/event-monitor.js';
import { loadAppConfig } from './config/env.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('main');

async function bootstrap() {
  try {
    // Load configuration
    const appConfig = loadAppConfig();
    log.info('Configuration loaded successfully');

    // Create event monitor worker
    const eventMonitor = new EventMonitorWorker(appConfig);

    // Check if test mode is enabled
    const testMode = process.env.TEST_MODE === 'true';
    if (testMode) {
      eventMonitor.enableTestMode();
      log.info('🧪 TEST MODE ENABLED');
    }

    // Start API server with monitor reference
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    const server = await startServer(port, host, eventMonitor);

    // Start event monitor worker
    if (testMode) {
      eventMonitor.startTestMode().catch((error) => {
        log.error('Event monitor crashed', error);
        process.exit(1);
      });
    } else {
      eventMonitor.start().catch((error) => {
        log.error('Event monitor crashed', error);
        process.exit(1);
      });
    }

    // Graceful shutdown handling
    const shutdown = async () => {
      log.info('Shutting down gracefully...');

      // Stop event monitor
      eventMonitor.stop();

      // Close server
      await server.close();

      log.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    log.info('Bridge service started successfully', {
      apiPort: port,
      monitoringEnabled: true,
      testMode,
    });
  } catch (error) {
    log.error('Failed to start bridge service', error);
    process.exit(1);
  }
}

bootstrap();
