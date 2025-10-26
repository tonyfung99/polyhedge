import { useState, useEffect, useCallback } from 'react';
import { useJwtContext, useVincentWebAuthClient } from '@lit-protocol/vincent-app-sdk/react';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import './VincentLogin.css';

const VINCENT_APP_ID = parseInt(import.meta.env.VITE_VINCENT_APP_ID || '0');
const BRIDGE_API_URL = import.meta.env.VITE_BRIDGE_API_URL || 'http://localhost:3001';
const LIT_NETWORK = (import.meta.env.VITE_LIT_NETWORK || 'datil-dev') as 'datil' | 'datil-dev' | 'datil-test';
const REDIRECT_URI = window.location.origin;

interface PKPInfo {
  publicKey: string;
  ethAddress: string;
}

export default function VincentLogin() {
  const { authInfo } = useJwtContext();
  const vincentWebAuthClient = useVincentWebAuthClient(VINCENT_APP_ID);
  
  const [pkpInfo, setPkpInfo] = useState<PKPInfo | null>(null);
  const [sessionSigs, setSessionSigs] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 4. Generate session signatures for PKP
  const generateSessionSigs = useCallback(async (
    litClient: LitNodeClient,
    pkpEthAddress: string,
    jwtToken: string
  ) => {
    try {
      setStatus('Generating session signatures...');

      // Generate session signatures with 24-hour expiry
      const sessionSigs = await litClient.getSessionSigs({
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'),
            ability: LitAbility.LitActionExecution,
          },
        ],
        authNeededCallback: async ({ uri }) => {
          // Use the JWT for authentication
          const authSig = {
            sig: jwtToken,
            derivedVia: 'vincent.jwt',
            signedMessage: uri || '',
            address: pkpEthAddress,
          };
          return authSig;
        },
      });

      setSessionSigs(sessionSigs);
      setStatus('✅ Session signatures generated! Ready to send to backend.');
      
    } catch (err) {
      console.error('Error generating session signatures:', err);
      setError(`Failed to generate session sigs: ${(err as Error).message}`);
      setStatus('❌ Error generating session signatures');
    }
  }, []);

  // 3. Extract PKP information from JWT
  const extractPKPInfo = useCallback(async (jwtToken: string) => {
    try {
      setIsLoading(true);
      setStatus('Connecting to Lit Protocol network...');

      // Initialize Lit Protocol client
      const litClient = new LitNodeClient({
        litNetwork: LIT_NETWORK,
        debug: false,
      });

      await litClient.connect();
      setStatus('Connected to Lit Protocol. Extracting PKP info...');

      // Decode JWT to get PKP information
      const jwtPayload = JSON.parse(atob(jwtToken.split('.')[1]));
      
      // Get PKP public key and address from the JWT
      const pkpPublicKey = jwtPayload.pkpPublicKey || jwtPayload.sub;
      const pkpEthAddress = jwtPayload.pkpEthAddress || jwtPayload.address;
      
      if (!pkpPublicKey) {
        throw new Error('PKP public key not found in JWT');
      }

      if (!pkpEthAddress) {
        throw new Error('PKP ETH address not found in JWT');
      }

      setPkpInfo({
        publicKey: pkpPublicKey,
        ethAddress: pkpEthAddress,
      });

      setStatus('✅ PKP info extracted! Now generating session signatures...');

      // 4. Generate session signatures
      await generateSessionSigs(litClient, pkpEthAddress, jwtToken);

    } catch (err) {
      console.error('Error extracting PKP info:', err);
      setError(`Failed to extract PKP info: ${(err as Error).message}`);
      setStatus('❌ Error extracting PKP info');
    } finally {
      setIsLoading(false);
    }
  }, [generateSessionSigs]);

  // 2. Auto-process JWT when available
  useEffect(() => {
    if (authInfo?.jwt && !pkpInfo) {
      setStatus('✅ Vincent JWT acquired! Now extracting PKP info...');
      extractPKPInfo(authInfo.jwt);
    }
  }, [authInfo?.jwt, pkpInfo, extractPKPInfo]);

  // 1. User initiates Vincent login
  const loginWithVincent = useCallback(() => {
    setStatus('Redirecting to Vincent Connect...');
    setError('');
    vincentWebAuthClient.redirectToConnectPage({
      redirectUri: REDIRECT_URI,
    });
  }, [vincentWebAuthClient]);

  // 5. Send delegation to bridge service
  const sendToBridge = async () => {
    if (!pkpInfo || !sessionSigs || !authInfo?.jwt) {
      setError('Missing PKP info, session signatures, or JWT');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Sending delegation to bridge service...');

      // Calculate expiry (24 hours from now)
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

      const response = await fetch(`${BRIDGE_API_URL}/api/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pkpPublicKey: pkpInfo.publicKey,
          pkpEthAddress: pkpInfo.ethAddress,
          sessionSigs: sessionSigs,
          expiresAt: expiresAt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setStatus('✅ Successfully authenticated with bridge service!');
      console.log('Bridge service response:', result);

    } catch (err) {
      console.error('Error sending to bridge:', err);
      setError(`Failed to send to bridge: ${(err as Error).message}`);
      setStatus('❌ Error sending to bridge service');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Check bridge service status
  const checkBridgeStatus = async () => {
    try {
      setIsLoading(true);
      setStatus('Checking bridge service status...');

      const response = await fetch(`${BRIDGE_API_URL}/api/vincent/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const status = await response.json();
      
      if (status.delegated) {
        setStatus(`✅ Bridge is delegated! PKP: ${status.pkpEthAddress?.substring(0, 10)}...`);
      } else {
        setStatus('⚠️ Bridge service is not yet delegated');
      }
      
      console.log('Bridge status:', status);

    } catch (err) {
      console.error('Error checking bridge status:', err);
      setError(`Failed to check bridge status: ${(err as Error).message}`);
      setStatus('❌ Error checking bridge service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vincent-login">
      <div className="login-card">
        <h1>🔐 Polyhedge Admin Portal</h1>
        <p className="subtitle">Delegate your wallet to the bridge service using Vincent Protocol</p>

        {error && (
          <div className="error-box">
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {status && (
          <div className="status-box">
            {status}
          </div>
        )}

        {!authInfo?.jwt && (
          <div className="login-section">
            <button 
              className="login-button"
              onClick={loginWithVincent}
              disabled={isLoading}
            >
              🚀 Login with Vincent
            </button>
            <p className="info-text">
              You'll be redirected to Vincent Connect to authenticate
            </p>
          </div>
        )}

        {authInfo?.jwt && pkpInfo && (
          <div className="info-section">
            <h3>✅ PKP Information</h3>
            <div className="info-item">
              <label>Public Key:</label>
              <code>{pkpInfo.publicKey}</code>
            </div>
            <div className="info-item">
              <label>ETH Address:</label>
              <code>{pkpInfo.ethAddress}</code>
            </div>
            <div className="info-item">
              <label>Session Signatures:</label>
              <code>{sessionSigs ? '✅ Generated' : '⏳ Pending...'}</code>
            </div>
          </div>
        )}

        {authInfo?.jwt && sessionSigs && (
          <div className="actions-section">
            <button 
              className="action-button primary"
              onClick={sendToBridge}
              disabled={isLoading}
            >
              📤 Send to Bridge Service
            </button>
            
            <button 
              className="action-button secondary"
              onClick={checkBridgeStatus}
              disabled={isLoading}
            >
              🔍 Check Bridge Status
            </button>
          </div>
        )}

        {isLoading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Processing...</p>
          </div>
        )}

        <div className="footer-info">
          <p>
            <strong>App ID:</strong> {VINCENT_APP_ID || 'Not configured'}
          </p>
          <p>
            <strong>Bridge URL:</strong> {BRIDGE_API_URL}
          </p>
          <p>
            <strong>Network:</strong> {LIT_NETWORK}
          </p>
          <p>
            <strong>JWT:</strong> {authInfo?.jwt ? '✅ Present' : '❌ Not logged in'}
          </p>
        </div>
      </div>
    </div>
  );
}
