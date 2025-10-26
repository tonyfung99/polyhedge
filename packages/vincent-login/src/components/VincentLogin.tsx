import React, { useState, useEffect } from 'react';
import { getVincentWebAppClient } from '@lit-protocol/vincent-app-sdk';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import './VincentLogin.css';

const VINCENT_APP_ID = import.meta.env.VITE_VINCENT_APP_ID || '';
const BRIDGE_API_URL = import.meta.env.VITE_BRIDGE_API_URL || 'http://localhost:3001';
const LIT_NETWORK = (import.meta.env.VITE_LIT_NETWORK || 'datil-dev') as 'datil' | 'datil-dev' | 'datil-test';

interface PKPInfo {
  publicKey: string;
  ethAddress: string;
}

export default function VincentLogin() {
  const [jwt, setJwt] = useState('');
  const [pkpInfo, setPkpInfo] = useState<PKPInfo | null>(null);
  const [sessionSigs, setSessionSigs] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const vincent = getVincentWebAppClient({ appId: VINCENT_APP_ID });

  // 1. Extract JWT from URL after Vincent redirect
  useEffect(() => {
    const extractJWT = () => {
      if (vincent.isLogin()) {
        try {
          const result = vincent.decodeVincentLoginJWT(window.location.origin);
          if (result) {
            const { jwtStr } = result;
            setJwt(jwtStr);
            setStatus('✅ Vincent JWT acquired! Now extracting PKP info...');
            
            // Clean up URL
            vincent.removeLoginJWTFromURI();
            
            // Automatically extract PKP info
            extractPKPInfo(jwtStr);
          }
        } catch (err) {
          console.error('Error decoding JWT:', err);
          setError(`Failed to decode JWT: ${(err as Error).message}`);
          setStatus('❌ Error decoding JWT');
        }
      }
    };

    extractJWT();
  }, []);

  // 2. User initiates Vincent login
  const loginWithVincent = () => {
    setStatus('Redirecting to Vincent Connect...');
    setError('');
    vincent.redirectToConsentPage({ redirectUri: window.location.href });
  };

  // 3. Extract PKP information from JWT
  const extractPKPInfo = async (jwtToken: string) => {
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
      // The JWT contains the user's authentication info
      const jwtPayload = JSON.parse(atob(jwtToken.split('.')[1]));
      
      // Get PKP public key and address from the JWT
      // Note: The exact structure depends on Vincent SDK implementation
      // You may need to adjust this based on actual JWT structure
      const pkpPublicKey = jwtPayload.sub || jwtPayload.pkp_public_key;
      
      if (!pkpPublicKey) {
        throw new Error('PKP public key not found in JWT');
      }

      // Derive Ethereum address from public key
      const pkpEthAddress = await litClient.computeAddress(pkpPublicKey);

      setPkpInfo({
        publicKey: pkpPublicKey,
        ethAddress: pkpEthAddress,
      });

      setStatus('PKP info extracted. Generating session signatures...');

      // Generate session signatures for 24 hours
      const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const generatedSessionSigs = await litClient.getSessionSigs({
        pkpPublicKey: pkpPublicKey,
        chain: 'polygon',
        expiration: expirationTime.toISOString(),
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'),
            ability: LitAbility.PKPSigning,
          },
        ],
        // Use the JWT as authentication
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
          return {
            sig: jwtToken,
            derivedVia: 'vincent-jwt',
            signedMessage: uri,
            address: pkpEthAddress,
          };
        },
      });

      setSessionSigs(generatedSessionSigs);
      setStatus('✅ Session signatures generated! Ready to send to backend.');

      // Disconnect Lit client
      await litClient.disconnect();
      setIsLoading(false);
    } catch (err) {
      console.error('Error extracting PKP info:', err);
      setError(`Failed to extract PKP info: ${(err as Error).message}`);
      setStatus('❌ Error extracting PKP info');
      setIsLoading(false);
    }
  };

  // 4. Send credentials to bridge service
  const sendToBackend = async () => {
    if (!jwt || !pkpInfo || !sessionSigs) {
      setError('Missing required credentials');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Sending credentials to bridge service...');
      setError('');

      const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await fetch(`${BRIDGE_API_URL}/api/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pkpPublicKey: pkpInfo.publicKey,
          pkpEthAddress: pkpInfo.ethAddress,
          sessionSigs: sessionSigs,
          expiresAt: expirationTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with backend');
      }

      const data = await response.json();
      console.log('Backend response:', data);

      setStatus('✅ Successfully authenticated with bridge service!');
      setIsLoading(false);

      // Show success message for 3 seconds, then offer to reset
      setTimeout(() => {
        setStatus('✅ Admin delegation active. You can close this window or re-authenticate.');
      }, 3000);
    } catch (err) {
      console.error('Error sending to backend:', err);
      setError(`Failed to authenticate: ${(err as Error).message}`);
      setStatus('❌ Error sending to backend');
      setIsLoading(false);
    }
  };

  // 5. Check bridge service status
  const checkBridgeStatus = async () => {
    try {
      setIsLoading(true);
      setStatus('Checking bridge service status...');
      setError('');

      const response = await fetch(`${BRIDGE_API_URL}/api/vincent/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bridge status');
      }

      const data = await response.json();
      console.log('Bridge status:', data);

      if (data.vincentEnabled && data.delegated) {
        setStatus(`✅ Bridge is configured and delegated to: ${data.adminAddress}`);
      } else if (data.vincentEnabled && !data.delegated) {
        setStatus('⚠️ Bridge is configured but not delegated. Please authenticate.');
      } else {
        setStatus('❌ Bridge service does not have Vincent enabled');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error checking bridge status:', err);
      setError(`Failed to check status: ${(err as Error).message}`);
      setStatus('❌ Error checking bridge status');
      setIsLoading(false);
    }
  };

  // 6. Reset state
  const reset = () => {
    setJwt('');
    setPkpInfo(null);
    setSessionSigs(null);
    setStatus('');
    setError('');
  };

  return (
    <div className="vincent-login-container">
      <h1>🔐 Polyhedge Admin Portal</h1>
      <p className="subtitle">Authenticate with Vincent to manage the bridge service</p>

      <div className="config-info">
        <div className="config-item">
          <strong>Vincent App ID:</strong> {VINCENT_APP_ID}
        </div>
        <div className="config-item">
          <strong>Bridge Service:</strong> {BRIDGE_API_URL}
        </div>
        <div className="config-item">
          <strong>Lit Network:</strong> {LIT_NETWORK}
        </div>
      </div>

      <div className="button-group">
        <button
          onClick={loginWithVincent}
          disabled={isLoading || !!jwt}
          className="primary-button"
        >
          {jwt ? '✓ Logged In' : '🚀 Login with Vincent'}
        </button>

        <button
          onClick={sendToBackend}
          disabled={!jwt || !pkpInfo || !sessionSigs || isLoading}
          className="success-button"
        >
          📤 Send to Bridge Service
        </button>

        <button
          onClick={checkBridgeStatus}
          disabled={isLoading}
          className="info-button"
        >
          🔍 Check Bridge Status
        </button>

        <button
          onClick={reset}
          disabled={isLoading || (!jwt && !pkpInfo)}
          className="secondary-button"
        >
          🔄 Reset
        </button>
      </div>

      {status && (
        <div className={`status-box ${error ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      {error && (
        <div className="error-box">
          ❌ {error}
        </div>
      )}

      {isLoading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      {pkpInfo && (
        <div className="info-panel">
          <h3>PKP Information</h3>
          <div className="info-item">
            <strong>PKP Address:</strong>
            <code>{pkpInfo.ethAddress}</code>
          </div>
          <div className="info-item">
            <strong>Public Key:</strong>
            <code className="truncate">{pkpInfo.publicKey}</code>
          </div>
          <div className="info-item">
            <strong>Session Valid Until:</strong>
            <code>{new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}</code>
          </div>
        </div>
      )}

      {jwt && (
        <details className="jwt-details">
          <summary>View JWT Token</summary>
          <textarea value={jwt} readOnly rows={6} />
        </details>
      )}

      <div className="instructions">
        <h3>📋 Instructions</h3>
        <ol>
          <li>Click "Login with Vincent" to authenticate</li>
          <li>You'll be redirected to Vincent Connect</li>
          <li>Create or unlock your admin wallet</li>
          <li>You'll be redirected back with credentials</li>
          <li>Click "Send to Bridge Service" to complete setup</li>
          <li>Use "Check Bridge Status" to verify delegation</li>
        </ol>
      </div>
    </div>
  );
}

