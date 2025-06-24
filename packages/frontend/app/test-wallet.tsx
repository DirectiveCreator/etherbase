'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useNetwork, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { formatEther } from 'viem';
import { useEtherbase } from '@msquared/etherbase-client';
import { etherbaseConfig } from '../etherbaseConfig';

export default function TestWallet() {
  // Wallet connection states
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { data: balance } = useBalance({
    address,
    watch: true,
  });

  // Etherbase integration
  const etherbase = useEtherbase(etherbaseConfig);
  const [eventName, setEventName] = useState('TestEvent');
  const [eventData, setEventData] = useState('{"message": "Hello from test wallet!"}');
  const [statePath, setStatePath] = useState('test.wallet.value');
  const [stateValue, setStateValue] = useState('42');
  const [txStatus, setTxStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Handle emitting an event
  const handleEmitEvent = async () => {
    if (!etherbase || !isConnected) return;
    
    try {
      setTxStatus('Sending transaction...');
      const parsedData = JSON.parse(eventData);
      const tx = await etherbase.emitEvent(eventName, parsedData);
      setTxHash(tx.hash);
      setTxStatus('Transaction sent! Waiting for confirmation...');
      
      const receipt = await tx.wait();
      setTxStatus('Transaction confirmed!');
      addResult(`Emitted event "${eventName}" with data: ${eventData}`);
    } catch (error: any) {
      setTxStatus(`Error: ${error.message || 'Unknown error'}`);
      addResult(`Error emitting event: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle setting state
  const handleSetState = async () => {
    if (!etherbase || !isConnected) return;
    
    try {
      setTxStatus('Sending transaction...');
      const tx = await etherbase.setState(statePath, stateValue);
      setTxHash(tx.hash);
      setTxStatus('Transaction sent! Waiting for confirmation...');
      
      const receipt = await tx.wait();
      setTxStatus('Transaction confirmed!');
      addResult(`Set state at path "${statePath}" to value: ${stateValue}`);
    } catch (error: any) {
      setTxStatus(`Error: ${error.message || 'Unknown error'}`);
      addResult(`Error setting state: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle getting state
  const handleGetState = async () => {
    if (!etherbase || !isConnected) return;
    
    try {
      setTxStatus('Reading state...');
      const value = await etherbase.getState(statePath);
      setTxStatus('State retrieved!');
      addResult(`State at path "${statePath}": ${JSON.stringify(value)}`);
    } catch (error: any) {
      setTxStatus(`Error: ${error.message || 'Unknown error'}`);
      addResult(`Error getting state: ${error.message || 'Unknown error'}`);
    }
  };

  // Helper function to add results
  const addResult = (result: string) => {
    setResults(prev => [
      { id: Date.now(), message: result },
      ...prev.slice(0, 9) // Keep only the last 10 results
    ]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Etherbase Test Wallet</h1>
      
      {/* Wallet Connection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
        
        {isConnected ? (
          <div>
            <div className="mb-4">
              <p><strong>Address:</strong> {address}</p>
              <p><strong>Balance:</strong> {balance ? `${formatEther(balance.value)} ${balance.symbol}` : 'Loading...'}</p>
              <p><strong>Network:</strong> {chain ? `${chain.name} (${chain.id})` : 'Unknown'}</p>
            </div>
            <button
              onClick={() => disconnect()}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Connect Wallet
          </button>
        )}
      </div>
      
      {/* Etherbase Contract Interaction */}
      {isConnected && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Etherbase Contract Interaction</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Emit Event</h3>
            <div className="flex flex-col space-y-2 mb-2">
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Event Name"
                className="border rounded p-2"
              />
              <textarea
                value={eventData}
                onChange={(e) => setEventData(e.target.value)}
                placeholder="Event Data (JSON)"
                rows={3}
                className="border rounded p-2"
              />
            </div>
            <button
              onClick={handleEmitEvent}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              Emit Event
            </button>
          </div>
          
          <div className="mb-6">
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
                onClick={handleSetState}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
              >
                Set State
              </button>
              <button
                onClick={handleGetState}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
              >
                Get State
              </button>
            </div>
          </div>
          
          {/* Transaction Status */}
          {txStatus && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Transaction Status</h3>
              <p>{txStatus}</p>
              {txHash && (
                <p className="mt-2">
                  <strong>Transaction Hash:</strong>{" "}
                  <a
                    href={`https://explorer.somnia.network/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline break-all"
                  >
                    {txHash}
                  </a>
                </p>
              )}
            </div>
          )}
          
          {/* Results */}
          <div>
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
                <p className="text-gray-500">No results yet. Try interacting with the contract.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Contract Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Contract Information</h2>
        <p><strong>Etherbase Address:</strong> {etherbaseConfig.chain.id === 50312 ? etherbaseConfig.etherbaseAddress : 'Not connected to Somnia'}</p>
        <p><strong>Multicall Address:</strong> {etherbaseConfig.multicallAddress}</p>
        <p><strong>Chain:</strong> {etherbaseConfig.chain.name} (ID: {etherbaseConfig.chain.id})</p>
        <p><strong>Backend Connection:</strong> {etherbaseConfig.useBackend ? 'Enabled' : 'Disabled'}</p>
      </div>
    </div>
  );
}
