import { type EtherbaseConfig, somnia } from "@msquared/etherbase-client"
import { hardhat } from "viem/chains"

// Always run against a local backend
const localUrl = "http://localhost"

export const etherbaseConfig: EtherbaseConfig = {
  // Keep chain selection dynamic in case it is needed elsewhere
  chain: process.env.NEXT_PUBLIC_ENV === "local" ? hardhat : somnia,

  // Point the frontend to the locally running backend services
  httpReaderUrl: `${localUrl}:8082`,
  wsReaderUrl: `${localUrl}:8082`,
  wsWriterUrl: `${localUrl}:8081`,

  // Ensure the hooks use the backend instead of reading directly from the chain
  useBackend: true,

}
