import { type EtherbaseConfig, somnia } from "@msquared/etherbase-client"
import { hardhat } from "viem/chains"

// Determine if we should use local backend services
const useLocalBackend = process.env.NEXT_PUBLIC_USE_LOCAL_BACKEND === "true"
const localUrl = "http://localhost"

// Get contract addresses from environment variables or use defaults
const etherbaseAddress = process.env.NEXT_PUBLIC_ETHERBASE_ADDRESS || "0x07F53212efb8068d76D87B6A4B843622E37861BD"
const multicallAddress = process.env.NEXT_PUBLIC_MULTICALL_ADDRESS || "0x3fD7C31D0d2128aD2b83db6327CA73c1186f9EA1"

export const etherbaseConfig: EtherbaseConfig = {
  // Keep chain selection dynamic in case it is needed elsewhere
  chain: process.env.NEXT_PUBLIC_ENV === "local" ? hardhat : somnia,

  // Use either local or remote backend services based on configuration
  httpReaderUrl: useLocalBackend 
    ? `${localUrl}:8082` 
    : "https://etherbase-reader-496683047294.europe-west2.run.app",
  wsReaderUrl: useLocalBackend 
    ? `${localUrl}:8082` 
    : "wss://etherbase-reader-496683047294.europe-west2.run.app",
  wsWriterUrl: useLocalBackend 
    ? `${localUrl}:8081` 
    : "wss://etherbase-writer-496683047294.europe-west2.run.app",

  // Ensure the hooks use the backend instead of reading directly from the chain
  useBackend: true,
  
  // Add contract addresses from environment variables
  etherbaseAddress,
  multicallAddress,
}
