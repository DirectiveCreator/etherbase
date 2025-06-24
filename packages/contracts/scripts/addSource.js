require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
    // Connect to Somnia network
    const provider = new ethers.WebSocketProvider(process.env.RPC_URL);

    // Use private key from .env to sign transactions
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Etherbase contract address and ABI
    const etherbaseAddress = process.env.ETHERBASE_ADDRESS;
    const etherbaseAbi = [
        "function createSource() public returns (address)",
        "event SourceCreated(address indexed sourceAddress, address indexed owner)"
    ];

    // Create contract instance
    const contract = new ethers.Contract(etherbaseAddress, etherbaseAbi, signer);

    console.log(`Signer address: ${signer.address}`);
    console.log(`Creating new source with owner ${signer.address}`);
    
    try {
        const tx = await contract.createSource();
        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        
        // Find the SourceCreated event to get the new source address
        const sourceCreatedEvent = receipt.logs.find(log => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed && parsed.name === 'SourceCreated';
            } catch {
                return false;
            }
        });
        
        if (sourceCreatedEvent) {
            const parsedEvent = contract.interface.parseLog(sourceCreatedEvent);
            console.log(`Source created successfully!`);
            console.log(`New source address: ${parsedEvent.args.sourceAddress}`);
            console.log(`Owner: ${parsedEvent.args.owner}`);
        } else {
            console.log("Source created successfully, but event not found in logs");
        }
    } catch (error) {
        console.error("Error creating source:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
