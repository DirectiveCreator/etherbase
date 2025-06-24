'use client';

import { useState } from 'react';
import { useEtherbase } from '@msquared/etherbase-client';
import { etherbaseConfig } from './etherbaseConfig';

export default function TestWallet() {
  // State variables
  const [eventName, setEventName] = useState('TestEvent');
  const [eventData, setEventData] = useState('{"message": "Hello from test wallet!"}');
  const [statePath, setStatePath] = useState('test.wallet.value');
  const [stateValue, setStateValue] = useState('42');
  const [txStatus, setTxStatus] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Etherbase integration
  const etherbase = useEtherbase(etherbaseConfig);

  // Helper function to add results
  const addResult = (result: string) => {
    setResults(prev => [
      { id: Date.now(), message: result },
      ...prev.slice(0, 9) // Keep only the last 10 results
    ]);
  };

  // Simplified function to show contract info
  const handleCheckState = async () => {
    try {
      setTxStatus('Checking state...');
      addResult(`Attempting to read state at path: ${statePath}`);
      setTxStatus('Please connect a wallet to interact with the contract');
    } catch (error: any) {
      setTxStatus(`Error: ${error.message || 'Unknown error'}`);
      addResult(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Etherbase Test Wallet</h1>
      
      {/* Wallet Connection Placeholder */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
        <p>To interact with Etherbase contracts, you need to connect your wallet.</p>
        <p>This simplified version doesn't include wallet connection functionality.</p>
        <p>Please use the full version with proper wallet integration.</p>
      </div>
      
      {/* Etherbase Contract Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Contract Information</h2>
        <p><strong>Etherbase Address:</strong> {etherbaseConfig.etherbaseAddress}</p>
        <p><strong>Multicall Address:</strong> {etherbaseConfig.multicallAddress}</p>
        <p><strong>Chain:</strong> {etherbaseConfig.chain.name} (ID: {etherbaseConfig.chain.id})</p>
        <p><strong>Backend Connection:</strong> {etherbaseConfig.useBackend ? 'Enabled' : 'Disabled'}</p>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">State Management</h3>
          <div className="flex flex-col space-y-2 mb-2">
            <input
              type="text"
              value={statePath}
              onChange={(e) => setStatePath(e.target.value)}
              placeholder="State Path"
              className="border rounded p-2"
            />
            <input
              type="text"
              value={stateValue}
              onChange={(e) => setStateValue(e.target.value)}
              placeholder="State Value"
              className="border rounded p-2"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCheckState}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
            >
              Check State
            </button>
          </div>
        </div>
      </div>
      
      {/* Status and Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        {txStatus && <p className="mb-4">{txStatus}</p>}
        
        <h3 className="text-lg font-medium mb-2">Results</h3>
        <div className="border rounded p-4 bg-gray-50 max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <ul className="space-y-2">
              {results.map((result) => (
                <li key={result.id} className="border-b pb-2">
                  {result.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No results yet. Try checking state.</p>
          )}
        </div>
      </div>
    </div>
  );
}
