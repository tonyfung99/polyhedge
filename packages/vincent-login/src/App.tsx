import { useEffect, useState } from 'react';
import VincentLogin from './components/VincentLogin';
import './App.css';

function App() {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if environment variables are configured
    const appId = import.meta.env.VITE_VINCENT_APP_ID;
    const bridgeUrl = import.meta.env.VITE_BRIDGE_API_URL;
    
    if (!appId || appId === 'your-vincent-app-id-here') {
      console.error('VITE_VINCENT_APP_ID not configured');
      setIsConfigured(false);
      return;
    }
    
    if (!bridgeUrl) {
      console.error('VITE_BRIDGE_API_URL not configured');
      setIsConfigured(false);
      return;
    }
    
    setIsConfigured(true);
  }, []);

  if (!isConfigured) {
    return (
      <div className="app">
        <div className="error-container">
          <h1>⚠️ Configuration Required</h1>
          <p>Please configure the environment variables:</p>
          <ol style={{ textAlign: 'left', margin: '1rem auto', maxWidth: '500px' }}>
            <li>Copy <code>env.sample</code> to <code>.env</code></li>
            <li>Set <code>VITE_VINCENT_APP_ID</code> to your Vincent App ID</li>
            <li>Set <code>VITE_BRIDGE_API_URL</code> to your bridge service URL</li>
            <li>Set <code>VITE_LIT_NETWORK</code> (datil-dev for testing)</li>
            <li>Restart the dev server</li>
          </ol>
          <pre style={{ 
            background: '#1a1a1a', 
            padding: '1rem', 
            borderRadius: '8px', 
            textAlign: 'left',
            margin: '1rem auto',
            maxWidth: '500px'
          }}>
            {`VITE_VINCENT_APP_ID=your-app-id
VITE_BRIDGE_API_URL=http://localhost:3001
VITE_LIT_NETWORK=datil-dev
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <VincentLogin />
    </div>
  );
}

export default App;

