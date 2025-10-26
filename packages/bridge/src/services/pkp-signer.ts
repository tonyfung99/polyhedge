import { ethers } from 'ethers';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { createLogger } from '../utils/logger.js';

const log = createLogger('pkp-signer');

/**
 * PKPSigner - Ethereum Signer that uses Lit Protocol PKP for signing
 * 
 * This class implements the ethers.Signer interface and routes all
 * signing operations through Lit Protocol's PKP infrastructure.
 * 
 * This allows us to use PKPs with any ethers-compatible library
 * (including Polymarket's CLOB client) without exposing private keys.
 */
export class PKPSigner extends ethers.AbstractSigner {
    private litNodeClient: LitNodeClient;
    private pkpPublicKey: string;
    private pkpEthAddress: string;
    private sessionSigs: any;

    constructor(
        litNodeClient: LitNodeClient,
        pkpPublicKey: string,
        pkpEthAddress: string,
        sessionSigs: any,
        provider?: ethers.Provider,
    ) {
        super(provider);
        this.litNodeClient = litNodeClient;
        this.pkpPublicKey = pkpPublicKey;
        this.pkpEthAddress = pkpEthAddress;
        this.sessionSigs = sessionSigs;
    }

    /**
     * Connect to a provider
     */
    connect(provider: ethers.Provider): PKPSigner {
        return new PKPSigner(
            this.litNodeClient,
            this.pkpPublicKey,
            this.pkpEthAddress,
            this.sessionSigs,
            provider,
        );
    }

    /**
     * Get the PKP's Ethereum address
     */
    async getAddress(): Promise<string> {
        return this.pkpEthAddress;
    }

    /**
     * Sign a message using PKP
     */
    async signMessage(message: string | Uint8Array): Promise<string> {
        try {
            log.debug('Signing message with PKP', {
                pkpAddress: this.pkpEthAddress,
                messageLength: typeof message === 'string' ? message.length : message.length,
            });

            // Convert message to hash
            const messageHash = ethers.hashMessage(message);
            
            // Execute Lit Action to sign
            const litActionCode = `(async () => {
                const sigShare = await LitActions.signEcdsa({
                    toSign: dataToSign,
                    publicKey,
                    sigName: "sig",
                });
            })();`;

            const response = await this.litNodeClient.executeJs({
                code: litActionCode,
                sessionSigs: this.sessionSigs,
                jsParams: {
                    dataToSign: ethers.getBytes(messageHash),
                    publicKey: this.pkpPublicKey,
                },
            });

            const signature = response.signatures.sig;
            
            // Format signature
            const formattedSig = ethers.Signature.from({
                r: '0x' + signature.r,
                s: '0x' + signature.s,
                v: signature.recid,
            });

            log.debug('Message signed successfully with PKP');
            return formattedSig.serialized;
        } catch (error) {
            log.error('Failed to sign message with PKP', error);
            throw new Error(`PKP signing failed: ${(error as Error).message}`);
        }
    }

    /**
     * Sign a transaction using PKP
     */
    async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
        try {
            log.debug('Signing transaction with PKP', {
                pkpAddress: this.pkpEthAddress,
                to: transaction.to,
            });

            // Resolve transaction properties
            const tx = await ethers.resolveProperties(transaction);
            
            // Serialize transaction for signing
            const unsignedTx = ethers.Transaction.from(tx);
            const txHash = unsignedTx.unsignedHash;

            // Execute Lit Action to sign
            const litActionCode = `(async () => {
                const sigShare = await LitActions.signEcdsa({
                    toSign: dataToSign,
                    publicKey,
                    sigName: "sig",
                });
            })();`;

            const response = await this.litNodeClient.executeJs({
                code: litActionCode,
                sessionSigs: this.sessionSigs,
                jsParams: {
                    dataToSign: ethers.getBytes(txHash),
                    publicKey: this.pkpPublicKey,
                },
            });

            const signature = response.signatures.sig;
            
            // Set signature on transaction
            unsignedTx.signature = ethers.Signature.from({
                r: '0x' + signature.r,
                s: '0x' + signature.s,
                v: signature.recid,
            });

            log.debug('Transaction signed successfully with PKP');
            return unsignedTx.serialized;
        } catch (error) {
            log.error('Failed to sign transaction with PKP', error);
            throw new Error(`PKP transaction signing failed: ${(error as Error).message}`);
        }
    }

    /**
     * Sign typed data (EIP-712) using PKP
     */
    async signTypedData(
        domain: ethers.TypedDataDomain,
        types: Record<string, ethers.TypedDataField[]>,
        value: Record<string, any>,
    ): Promise<string> {
        try {
            log.debug('Signing typed data with PKP', {
                pkpAddress: this.pkpEthAddress,
                domain,
            });

            // Hash the typed data
            const hash = ethers.TypedDataEncoder.hash(domain, types, value);

            // Execute Lit Action to sign
            const litActionCode = `(async () => {
                const sigShare = await LitActions.signEcdsa({
                    toSign: dataToSign,
                    publicKey,
                    sigName: "sig",
                });
            })();`;

            const response = await this.litNodeClient.executeJs({
                code: litActionCode,
                sessionSigs: this.sessionSigs,
                jsParams: {
                    dataToSign: ethers.getBytes(hash),
                    publicKey: this.pkpPublicKey,
                },
            });

            const signature = response.signatures.sig;
            
            // Format signature
            const formattedSig = ethers.Signature.from({
                r: '0x' + signature.r,
                s: '0x' + signature.s,
                v: signature.recid,
            });

            log.debug('Typed data signed successfully with PKP');
            return formattedSig.serialized;
        } catch (error) {
            log.error('Failed to sign typed data with PKP', error);
            throw new Error(`PKP typed data signing failed: ${(error as Error).message}`);
        }
    }
}

