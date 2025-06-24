"use client";

import { useState, useEffect } from "react";
import { useEtherbase, useWebThree, EtherbaseProvider } from "@msquared/etherbase-client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

export default function TestWallet() {
  // Use the etherbase hook to access sources and creation function
  const { sources, createSource, fetchSources } = useEtherbase();
  
  // Use webThree for wallet connection
  const { publicClient, getWalletClient } = useWebThree();
  
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isCreatingSource, setIsCreatingSource] = useState(false);
  const [error, setError] = useState("");

  // Prevent hydration errors by only rendering client-side
  useEffect(() => {
    setMounted(true);
    
    // Check if wallet is connected
    const checkConnection = async () => {
      try {
        const walletClient = await getWalletClient();
        if (walletClient) {
          setIsConnected(true);
          setWalletAddress(walletClient.account.address);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };
    
    checkConnection();
    fetchSources();
  }, [getWalletClient, fetchSources]);

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }
      
      // Request accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Check if connected
      const walletClient = await getWalletClient();
      if (walletClient) {
        setIsConnected(true);
        setWalletAddress(walletClient.account.address);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError(error instanceof Error ? error.message : "Failed to connect wallet");
    }
  };

  // Create source function
  const handleCreateSource = async () => {
    try {
      setError("");
      setIsCreatingSource(true);
      
      if (!isConnected) {
        throw new Error("Please connect your wallet first");
      }
      
      const result = await createSource();
      console.log("Source created:", result);
      
      // Refresh sources
      await fetchSources();
    } catch (error) {
      console.error("Error creating source:", error);
      setError(error instanceof Error ? error.message : "Failed to create source");
    } finally {
      setIsCreatingSource(false);
    }
  };

  // Debug function
  const debugState = () => {
    console.log("Debug Info:");
    console.log("Sources:", sources);
    console.log("Is Connected:", isConnected);
    console.log("Wallet Address:", walletAddress);
    console.log("Public Client:", publicClient);
    
    // Check if window.ethereum is available
    if (typeof window !== "undefined") {
      console.log("Window Ethereum Available:", !!window.ethereum);
      if (window.ethereum) {
        console.log("Selected Address:", window.ethereum.selectedAddress);
        console.log("Chain ID:", window.ethereum.chainId);
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-md mx-auto mb-8">
        <CardHeader>
          <CardTitle>Etherbase Test</CardTitle>
          <CardDescription>
            Test Etherbase source creation and listing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Connection Status:</p>
              <p className={`font-mono ${isConnected ? "text-green-500" : "text-red-500"}`}>
                {isConnected ? "Connected" : "Disconnected"}
              </p>
            </div>
            
            {isConnected && (
              <div>
                <p className="text-sm font-medium">Wallet Address:</p>
                <p className="font-mono text-xs break-all">{walletAddress}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {!isConnected ? (
            <Button 
              onClick={connectWallet} 
              className="w-full"
            >
              Connect Wallet
            </Button>
          ) : (
            <Button 
              onClick={handleCreateSource} 
              className="w-full"
              disabled={isCreatingSource}
            >
              {isCreatingSource ? "Creating..." : "Create Source"}
            </Button>
          )}
          
          <Button 
            onClick={debugState} 
            variant="secondary" 
            className="w-full"
          >
            Debug State
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Sources ({sources.length})</CardTitle>
          <CardDescription>
            List of available sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No sources found</p>
          ) : (
            <ul className="space-y-2">
              {sources.map((source, index) => (
                <li key={index} className="border rounded-md p-2">
                  <p className="text-xs font-mono break-all">{source.sourceAddress}</p>
                  <p className="text-xs text-gray-500">Owner: {source.owner}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={fetchSources} 
            variant="outline" 
            className="w-full"
          >
            Refresh Sources
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Export a provider-wrapped version for easy testing
export function TestWalletWithProvider() {
  return (
    <EtherbaseProvider>
      <TestWallet />
    </EtherbaseProvider>
  );
}
