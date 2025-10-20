import type { DecodedEvent, Log } from '@envio-dev/hypersync-client';
import type { StrategyPurchasedEvent } from '../types.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function decodeStrategyPurchasedLog(log: Log, decoded: DecodedEvent | null | undefined): StrategyPurchasedEvent | null {
    if (!decoded || decoded.indexed.length < 2 || decoded.body.length < 2) {
        return null;
    }

    const strategyId = decoded.indexed[0].val as bigint;
    const user = (decoded.indexed[1].val as string | undefined) ?? ZERO_ADDRESS;
    const grossAmount = decoded.body[0].val as bigint;
    const netAmount = decoded.body[1].val as bigint;

    return {
        strategyId,
        user,
        grossAmount,
        netAmount,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash ?? undefined,
        logIndex: log.logIndex ?? undefined,
    };
}
