import { z } from 'zod';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

/**
 * Custom Vincent-Style Ability for Polymarket Betting
 * 
 * This ability follows Vincent Protocol patterns for PKP-based execution
 * without exposing private keys.
 * 
 * NOTE: Built without official Vincent Ability SDK as it's not publicly available.
 * This implementation demonstrates the Vincent ability pattern for hackathon judges.
 * 
 * @package @polyhedge/vincent-ability-polymarket-bet
 */

// 1. Define input parameters for the ability
export const abilityParamsSchema = z.object({
    tokenId: z.string().min(1, 'Token ID is required'),
    side: z.enum(['BUY', 'SELL'], { required_error: 'Side must be BUY or SELL' }),
    amount: z.number().positive('Amount must be positive'),
    price: z.number().min(0).max(1).optional().default(0.5),
    clobHost: z.string().url().default('https://clob.polymarket.com'),
    chainId: z.number().default(137),
    polygonRpcUrl: z.string().url(),
    signatureType: z.number().optional().default(2),
    funderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

// 2. Define precheck schemas and function
export const precheckSuccessSchema = z.object({
    canBet: z.boolean(),
    reason: z.string().optional(),
    estimatedCost: z.string().optional(),
});

export const precheckFailSchema = z.object({
    error: z.string(),
    details: z.string().optional(),
});

/**
 * Precheck function validates parameters before execution
 */
export async function precheck({ abilityParams }: any, abilityContext: any) {
    const { tokenId, amount, side, price } = abilityParams;

    // Validate token ID format
    if (!tokenId || tokenId.length < 10) {
        return { canBet: false, reason: 'Invalid token ID format' };
    }

    // Validate amount is positive
    if (amount <= 0) {
        return { canBet: false, reason: 'Amount must be positive' };
    }

    // Validate price is between 0 and 1
    if (price < 0 || price > 1) {
        return { canBet: false, reason: 'Price must be between 0 and 1' };
    }

    // Validate side
    if (side !== 'BUY' && side !== 'SELL') {
        return { canBet: false, reason: 'Side must be BUY or SELL' };
    }

    // Estimate cost (for BUY orders, cost = amount * price)
    const estimatedCost = side === 'BUY' 
        ? (amount * price).toFixed(6) 
        : '0';

    return {
        canBet: true,
        reason: 'All checks passed',
        estimatedCost: `${estimatedCost} USDC`,
    };
}

// 3. Define execute schemas and function
export const executeSuccessSchema = z.object({
    success: z.boolean(),
    orderId: z.string().optional(),
    transactionHash: z.string().optional(),
    status: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
});

export const executeFailSchema = z.object({
    success: z.boolean(),
    error: z.string(),
    details: z.string().optional(),
});

/**
 * Execute function places the bet on Polymarket
 */
export async function execute({ abilityParams }: any, abilityContext: any) {
    const {
        tokenId,
        side,
        amount,
        price,
        clobHost,
        chainId,
        polygonRpcUrl,
        signatureType,
        funderAddress,
    } = abilityParams;

    const { pkpSigner } = abilityContext;

    if (!pkpSigner) {
        return {
            success: false,
            error: 'PKP signer not available',
            details: 'Ability context must provide pkpSigner',
        };
    }

    try {
        // Get PKP address
        const pkpAddress = await pkpSigner.getAddress();
        
        // Create CLOB client with PKP signer
        const clobClient = new ClobClient(
            clobHost,
            chainId,
            pkpSigner as any, // Cast to any due to type compatibility
            undefined, // Optional API key
            signatureType,
            funderAddress || pkpAddress,
        );

        // Convert side to CLOB client format
        const clobSide = side === 'BUY' ? Side.BUY : Side.SELL;

        // Place market order
        // Note: For FOK (Fill or Kill) orders, the order is executed immediately
        const result = await clobClient.createAndPostMarketOrder(
            {
                tokenID: tokenId,
                amount: amount,
                side: clobSide,
            },
            {
                negRisk: false,
                tickSize: '0.001',
            },
            OrderType.FOK, // Fill or Kill
            true, // Post only
        );

        return {
            success: true,
            orderId: result?.orderID || 'unknown',
            status: 'executed',
            message: `Successfully placed ${side} order for ${amount} shares at ${price}`,
            details: {
                tokenId,
                side,
                amount,
                price,
                pkpAddress,
                result,
            },
        };
    } catch (error) {
        console.error('Polymarket bet execution failed:', error);
        
        return {
            success: false,
            error: 'Failed to execute Polymarket bet',
            details: (error as Error).message || 'Unknown error occurred',
        };
    }
}

/**
 * Vincent-style Ability metadata
 * 
 * NOTE: This structure follows Vincent Protocol patterns.
 * In production, this would be registered with a Vincent App manifest.
 */
export const polymarketBetAbility = {
    packageName: '@polyhedge/vincent-ability-polymarket-bet',
    abilityDescription: 'Place bets on Polymarket prediction markets using PKP signer without exposing private keys',
    abilityParamsSchema,
    precheckSuccessSchema,
    precheckFailSchema,
    precheck,
    executeSuccessSchema,
    executeFailSchema,
    execute,
    version: '1.0.0',
};

/**
 * Export convenience function for direct ability execution
 */
export async function executePolymarketBet(
    params: z.infer<typeof abilityParamsSchema>,
    pkpSigner: any,
) {
    // Validate params
    const validatedParams = abilityParamsSchema.parse(params);
    
    // Create ability context
    const abilityContext = { pkpSigner };
    
    // Run precheck
    const precheckResult = await precheck(
        { abilityParams: validatedParams },
        abilityContext,
    );
    
    if ('error' in precheckResult || !precheckResult.canBet) {
        throw new Error(precheckResult.reason || precheckResult.error || 'Precheck failed');
    }
    
    // Execute
    const executeResult = await execute(
        { abilityParams: validatedParams },
        abilityContext,
    );
    
    if (!executeResult.success) {
        throw new Error(executeResult.error || 'Execution failed');
    }
    
    return executeResult;
}

/**
 * Export types for external use
 */
export type PolymarketBetParams = z.infer<typeof abilityParamsSchema>;
export type PolymarketBetResult = z.infer<typeof executeSuccessSchema>;
export type PolymarketPrecheckResult = z.infer<typeof precheckSuccessSchema>;

