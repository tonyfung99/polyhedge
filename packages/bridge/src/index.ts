import 'dotenv/config';
import { Decoder, HypersyncClient } from '@envio-dev/hypersync-client';
import { createMonitoringConfig } from './monitoring/config.js';
import { decodeStrategyPurchasedLog } from './monitoring/decoder.js';
import { createLogger } from './utils/logger.js';
import { StrategyPurchaseExecutor } from './services/executor.js';
import { loadAppConfig } from './config/env.js';

const log = createLogger('bridge-main');

async function bootstrap() {
  const appConfig = loadAppConfig();
  const monitoringConfig = createMonitoringConfig(appConfig);

  const client = HypersyncClient.new(monitoringConfig.clientConfig);

  const decoder = Decoder.fromSignatures([
    'StrategyPurchased(uint256 indexed strategyId, address indexed user, uint256 grossAmount, uint256 netAmount)',
  ]);

  const executor = new StrategyPurchaseExecutor(appConfig);

  log.info('Starting HyperSync monitoring loop', {
    strategyManager: monitoringConfig.strategyManagerAddress,
    fromBlock: monitoringConfig.startBlock,
  });

  let nextBlock = monitoringConfig.startBlock;

  while (true) {
    const query = {
      fromBlock: nextBlock,
      toBlock: nextBlock + monitoringConfig.batchSize,
      logs: [
        {
          address: [monitoringConfig.strategyManagerAddress],
          topics: [
            [monitoringConfig.topicStrategyPurchased],
            [],
            [],
          ],
        },
      ],
      fieldSelection: {
        log: monitoringConfig.fields,
      },
    } as const;

    const response = await client.get(query);
    const decodedLogs = await decoder.decodeLogs(response.data.logs);

    for (let i = 0; i < response.data.logs.length; i++) {
      const logEntry = response.data.logs[i];
      const decoded = decodedLogs[i];
      const event = decodeStrategyPurchasedLog(logEntry, decoded);
      if (!event) continue;

      log.info('StrategyPurchased event detected', {
        strategyId: event.strategyId.toString(),
        user: event.user,
        netAmount: event.netAmount.toString(),
        blockNumber: event.blockNumber,
      });

      try {
        await executor.handleStrategyPurchase(event);
      } catch (error) {
        log.error('Failed to execute strategy orders', {
          error: (error as Error).message,
          strategyId: event.strategyId.toString(),
          user: event.user,
        });
      }
    }

    nextBlock = response.nextBlock;

    await new Promise((resolve) => setTimeout(resolve, monitoringConfig.pollIntervalMs));
  }
}

bootstrap().catch((error) => {
  log.error('Fatal error in bridge executor', error);
  process.exitCode = 1;
});


