import { keccak256, toUtf8Bytes } from 'ethers';
import { ClientConfig, LogField } from '@envio-dev/hypersync-client';
import { AppConfig } from '../config/env.js';

export interface MonitoringConfig {
    clientConfig: ClientConfig;
    strategyManagerAddress: string;
    topicStrategyPurchased: string;
    startBlock: number;
    pollIntervalMs: number;
    batchSize: number;
    fields: LogField[];
}

export function createMonitoringConfig(config: AppConfig): MonitoringConfig {
    const clientConfig: ClientConfig = {
        url: config.hypersyncEndpoint,
        enableChecksumAddresses: true,
    };

    return {
        clientConfig,
        strategyManagerAddress: config.strategyManagerAddress,
        topicStrategyPurchased: computeTopicHash('StrategyPurchased(uint256,address,uint256,uint256)'),
        startBlock: config.hypersyncFromBlock,
        pollIntervalMs: config.hypersyncPollIntervalMs,
        batchSize: config.hypersyncBatchSize ?? 500,
        fields: [
            LogField.Address,
            LogField.Topic0,
            LogField.Topic1,
            LogField.Topic2,
            LogField.Data,
            LogField.BlockNumber,
            LogField.TransactionHash,
            LogField.LogIndex,
        ],
    };
}

function computeTopicHash(signature: string): string {
    return keccak256(toUtf8Bytes(signature));
}


