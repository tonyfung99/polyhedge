import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/env.js';
import { executePolymarketBet, PolymarketBetParams } from '../abilities/polymarket-bet-ability.js';

const log = createLogger('vincent-service');

/**
 * Admin delegation state stored in memory (PoC - no database)
 * In production, this should be persisted to a database
 */
interface AdminDelegationState {
    pkpPublicKey: string;
    pkpEthAddress: string;
    sessionSigs: any; // Session signatures for PKP operations
    delegatedAt: Date;
    expiresAt: Date;
}

/**
 * VincentService manages the admin's PKP delegation
 * 
 * Flow:
 * 1. Admin authenticates via /api/admin/auth endpoint (provides JWT/session)
 * 2. Service stores delegation credentials in memory
 * 3. When trades need to be executed, service uses stored PKP to sign
 * 
 * For hackathon: Single admin user model
 * For production: Could extend to multi-admin or per-strategy admins
 */
export class VincentService {
    private config: AppConfig;
    private litNodeClient: LitNodeClient | null = null;
    private adminState: AdminDelegationState | null = null;

    constructor(config: AppConfig) {
        this.config = config;
    }

    /**
     * Initialize Lit Protocol connection (called on service startup)
     */
    async initialize(): Promise<void> {
        if (!this.config.useVincent) {
            log.info('Vincent mode disabled, skipping initialization');
            return;
        }

        log.info('Initializing Vincent service with Lit Protocol', {
            network: this.config.litNetwork,
        });

        this.litNodeClient = new LitNodeClient({
            litNetwork: this.config.litNetwork,
            debug: this.config.logLevel === 'debug',
        });

        await this.litNodeClient.connect();
        log.info('Connected to Lit Protocol network');
    }

    /**
     * Store admin delegation credentials (called from API endpoint)
     * 
     * @param pkpPublicKey - The admin's PKP public key (from Vincent App connection)
     * @param sessionSigs - Session signatures for signing operations
     * @param expiresAt - When the delegation expires
     */
    setAdminDelegation(pkpPublicKey: string, pkpEthAddress: string, sessionSigs: any, expiresAt: Date): void {
        log.info('Storing admin delegation', {
            pkpEthAddress,
            expiresAt: expiresAt.toISOString(),
        });

        this.adminState = {
            pkpPublicKey,
            pkpEthAddress,
            sessionSigs,
            delegatedAt: new Date(),
            expiresAt,
        };
    }

    /**
     * Check if admin delegation is active and valid
     */
    isDelegated(): boolean {
        if (!this.adminState) {
            return false;
        }

        const now = new Date();
        if (now > this.adminState.expiresAt) {
            log.warn('Admin delegation expired', {
                expiresAt: this.adminState.expiresAt.toISOString(),
            });
            return false;
        }

        return true;
    }

    /**
     * Get admin PKP Ethereum address for signing transactions
     */
    getAdminAddress(): string {
        if (!this.isDelegated()) {
            throw new Error('Admin not delegated or delegation expired');
        }
        return this.adminState!.pkpEthAddress;
    }

    /**
     * Execute a Lit Action to sign a transaction
     * 
     * @param litActionCode - JavaScript code to execute in Lit Action
     * @param jsParams - Parameters to pass to the Lit Action
     */
    async executeLitAction(litActionCode: string, jsParams: Record<string, any>): Promise<any> {
        if (!this.litNodeClient) {
            throw new Error('Lit Protocol client not initialized');
        }

        if (!this.isDelegated()) {
            throw new Error('Admin not delegated or delegation expired');
        }

        log.debug('Executing Lit Action', {
            pkpAddress: this.adminState!.pkpEthAddress,
        });

        const response = await this.litNodeClient.executeJs({
            code: litActionCode,
            sessionSigs: this.adminState!.sessionSigs,
            jsParams: {
                ...jsParams,
                publicKey: this.adminState!.pkpPublicKey,
            },
        });

        return response;
    }

    /**
     * Execute a Polymarket trade using custom Vincent Ability
     * 
     * This uses our custom-built @polyhedge/vincent-ability-polymarket-bet
     * which executes trades using PKP signing without exposing private keys.
     * 
     * @param params - Trade parameters
     */
    async executePolymarketTrade(params: {
        tokenId: string;
        side: 'BUY' | 'SELL';
        amount: number;
        price?: number;
    }): Promise<any> {
        if (!this.isDelegated()) {
            throw new Error('Admin not delegated or delegation expired. Please authenticate via /api/admin/auth');
        }

        if (!this.litNodeClient) {
            throw new Error('Lit Protocol client not initialized');
        }

        log.info('Executing Polymarket trade via custom Vincent Ability with PKP', {
            tokenId: params.tokenId,
            side: params.side,
            amount: params.amount,
            pkpAddress: this.adminState!.pkpEthAddress,
        });

        try {
            // Import PKPSigner for ability execution
            const { PKPSigner } = await import('./pkp-signer.js');
            
            // Create PKP signer
            const provider = new ethers.JsonRpcProvider(this.config.polygonRpcUrl);
            const pkpSigner = new PKPSigner(
                this.litNodeClient,
                this.adminState!.pkpPublicKey,
                this.adminState!.pkpEthAddress,
                this.adminState!.sessionSigs,
                provider,
            );

            // Prepare ability parameters
            const abilityParams: PolymarketBetParams = {
                tokenId: params.tokenId,
                side: params.side,
                amount: params.amount,
                price: params.price,
                clobHost: this.config.polymarketHost,
                chainId: this.config.polymarketChainId,
                polygonRpcUrl: this.config.polygonRpcUrl,
                signatureType: this.config.polymarketSignatureType,
                funderAddress: this.config.polymarketFunderAddress,
            };

            // Execute the ability
            const result = await executePolymarketBet(abilityParams, pkpSigner);

            log.info('Polymarket trade executed successfully via Vincent Ability', {
                tokenId: params.tokenId,
                orderId: result.orderId,
                status: result.status,
            });

            return result;
        } catch (error) {
            log.error('Failed to execute Polymarket trade via Vincent Ability', {
                error: (error as Error).message,
                tokenId: params.tokenId,
            });
            throw error;
        }
    }

    /**
     * Disconnect from Lit Protocol (called on service shutdown)
     */
    async disconnect(): Promise<void> {
        if (this.litNodeClient) {
            log.info('Disconnecting from Lit Protocol');
            await this.litNodeClient.disconnect();
            this.litNodeClient = null;
        }
        this.adminState = null;
    }

    /**
     * Get current delegation status (for debugging/monitoring)
     */
    getStatus(): {
        vincentEnabled: boolean;
        connected: boolean;
        delegated: boolean;
        adminAddress: string | null;
        expiresAt: string | null;
    } {
        return {
            vincentEnabled: this.config.useVincent,
            connected: this.litNodeClient !== null,
            delegated: this.isDelegated(),
            adminAddress: this.adminState?.pkpEthAddress ?? null,
            expiresAt: this.adminState?.expiresAt.toISOString() ?? null,
        };
    }
}

