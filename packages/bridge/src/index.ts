import 'dotenv/config';
import { startServer } from './server.js';
import { EventMonitorWorker } from './workers/event-monitor.js';
import { MarketMaturityMonitor } from './workers/market-maturity-monitor.js';
import { loadAppConfig } from './config/env.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('main');

async function bootstrap() {
  try {
    // Load configuration
    const appConfig = loadAppConfig();
    log.info('Configuration loaded successfully');

    // Create event monitor worker (for detecting StrategyPurchased events)
    const eventMonitor = new EventMonitorWorker(appConfig);

    // Create market maturity monitor (for automatic settlement)
    const pollIntervalMs = Number(process.env.MARKET_POLL_INTERVAL_MS) || 5000;
    const maturityMonitor = new MarketMaturityMonitor(appConfig, pollIntervalMs);

    // Check if test mode is enabled
    const testMode = process.env.TEST_MODE === 'true';
    if (testMode) {
      eventMonitor.enableTestMode();
      log.info('🧪 TEST MODE ENABLED');
    }

    // Start API server with monitor references
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    const server = await startServer(port, host, eventMonitor, maturityMonitor);

    // Start event monitor worker (for strategy purchases)
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

    // Start market maturity monitor (for automatic settlement)
    if (!testMode) {
      maturityMonitor.start().catch((error) => {
        log.error('Market maturity monitor crashed', error);
        process.exit(1);
      });
      log.info('Market maturity monitor started', {
        pollIntervalMs,
      });
    } else {
      log.info('Market maturity monitor disabled in test mode');
    }

    // Graceful shutdown handling
    const shutdown = async () => {
      log.info('Shutting down gracefully...');

      // Stop both monitors
      eventMonitor.stop();
      maturityMonitor.stop();

      // Close server
      await server.close();

      log.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    log.info('Bridge service started successfully', {
      apiPort: port,
      eventMonitoringEnabled: true,
      maturityMonitoringEnabled: !testMode,
      testMode,
    });
  } catch (error) {
    log.error('Failed to start bridge service', error);
    process.exit(1);
  }
}

bootstrap();
