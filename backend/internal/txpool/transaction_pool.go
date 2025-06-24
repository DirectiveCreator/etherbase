package txpool

import (
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/msquared-io/etherbase/backend/internal/config"
	"github.com/msquared-io/etherbase/backend/internal/integration/go/etherbasesource"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
)

type TxRequest struct {
    ContractAddress common.Address
    PrivateKey      string // hex
    Payload         TxPayload
    Abi             *abi.ABI
}

type TxPayload struct {
    FunctionName string
    GetArgs      func() ([]interface{}, error)
}

// Add new type for tracking transaction results
type TxResult struct {
    Hash     common.Hash
    Request  TxRequest
    SentTime time.Time
}

// Add new type for prepared transaction
type PreparedTx struct {
    txHex     string
    txHash    common.Hash
    txRequest TxRequest
}

// NonceManager tracks nonces for addresses
type NonceManager struct {
    currentNonce uint64
    lastUpdate   time.Time
    mutex        sync.Mutex
}

// TransactionPool is a naive queue that processes transaction requests in batches
type TransactionPool struct {
    pool           []TxRequest
    processingLock sync.Mutex
    addingLock     sync.Mutex
    sendingLock    sync.Mutex
    stopCh         chan struct{}
    sourceABI     abi.ABI
    keyCache       sync.Map    // Changed from map to sync.Map
    nonceCache     sync.Map    // address -> *NonceManager
    signer         types.Signer
}

var txPoolInstance *TransactionPool
var txPoolOnce sync.Once
var client *RPCClient

func MakeTransactionPool(config *config.Config) {
    txPoolOnce.Do(func() {
		var err error
		client, err = NewRPCClient(config.RpcURL)
		if err != nil {
			log.Fatalf("Failed to connect to Ethereum client: %v", err)
		}

        // Parse the ABI once during initialization
        sourceABI, err := abi.JSON(strings.NewReader(etherbasesource.EtherbaseSourceABI))
        if err != nil {
            log.Fatalf("failed to parse source ABI: %v", err)
        }

        txPoolInstance = &TransactionPool{
            pool:       make([]TxRequest, 0, 100),
            stopCh:     make(chan struct{}),
            sourceABI: sourceABI,
            signer:     types.LatestSignerForChainID(big.NewInt(int64(config.ChainID))),
        }
        go txPoolInstance.loop()
    })
}

func GetTransactionPool() *TransactionPool {
    return txPoolInstance
}

func (tp *TransactionPool) AddTransaction(req TxRequest) {
    tp.addingLock.Lock()
    defer tp.addingLock.Unlock()
    tp.pool = append(tp.pool, req)
}

func (tp *TransactionPool) loop() {
    ticker := time.NewTicker(50 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            tp.checkAndProcess()
        case <-tp.stopCh:
            return
        }
    }
}

func (tp *TransactionPool) checkAndProcess() {
    tp.processingLock.Lock()
    defer tp.processingLock.Unlock()

    tp.addingLock.Lock()
    if len(tp.pool) == 0 {
        tp.addingLock.Unlock()
        return
    }

    // Example batch logic
    batchSize := 100
    if len(tp.pool) < batchSize {
        batchSize = len(tp.pool)
    }

    batch := tp.pool[:batchSize]
    tp.pool = tp.pool[batchSize:]

    tp.addingLock.Unlock()
    tp.processBatch(batch)
}

// getOrCreatePrivateKey safely retrieves or creates an ECDSA private key
func (tp *TransactionPool) getOrCreatePrivateKey(hexKey string) (*ecdsa.PrivateKey, error) {
    // Check if key exists
    if privKey, exists := tp.keyCache.Load(hexKey); exists {
        return privKey.(*ecdsa.PrivateKey), nil
    }

    // Create new key
    privKey, err := crypto.HexToECDSA(hexKey[2:])
    if err != nil {
        return nil, fmt.Errorf("failed to parse private key: %v", err)
    }

    // Store using LoadOrStore to handle race conditions
    actual, _ := tp.keyCache.LoadOrStore(hexKey, privKey)
    return actual.(*ecdsa.PrivateKey), nil
}

// debug mode slows all transactions but checks all errors and receipts
const debug = false

type TimingStats struct {
    GetArgsTime        time.Duration
    GetPrivKeyTime     time.Duration
    PackDataTime       time.Duration
    SigningTime        time.Duration
    MarshalTime        time.Duration
    SendTransactionTime time.Duration
}

func (tp *TransactionPool) processBatch(batch []TxRequest) {
    startTime := time.Now()
    
    stats := TimingStats{}
    preparedTxs := make([]PreparedTx, 0, len(batch))

    fmt.Printf("Processing batch of %d transactions\n", len(batch))

    // First prepare all transactions without locking
    for i, txReq := range batch {
        // Time GetArgs
        argsStart := time.Now()
        args, err := txReq.Payload.GetArgs()
        if err != nil {
            fmt.Printf("Error building args: %v\n", err)
            continue
        }
        stats.GetArgsTime += time.Since(argsStart)

        // Time getting private key
        keyStart := time.Now()
        privKey, err := tp.getOrCreatePrivateKey(txReq.PrivateKey)
        if err != nil {
            log.Printf("Failed to get private key for transaction %d: %v", i, err)
            continue
        }
        stats.GetPrivKeyTime += time.Since(keyStart)

        // Time packing data
        packStart := time.Now()
        abi := txReq.Abi
        if abi == nil {
            abi = &tp.sourceABI
        }
        log.Printf("function name: %s, args: %v", txReq.Payload.FunctionName, args)
        data, err := abi.Pack(txReq.Payload.FunctionName, args...)
        if err != nil {
            log.Printf("Failed to pack data for transaction %d: %v", i, err)
            continue
        }
        stats.PackDataTime += time.Since(packStart)

        // Get proper nonce (optimized for batch processing)
        fromAddress := crypto.PubkeyToAddress(privKey.PublicKey)
        nonceVal, err := tp.getNextNonce(fromAddress)
        if err != nil {
            log.Printf("Failed to get nonce for transaction %d: %v", i, err)
            continue
        }
        tx := types.NewTx(&types.DynamicFeeTx{
            ChainID:   tp.signer.ChainID(),
            Nonce:     nonceVal,
            GasTipCap: big.NewInt(0),
            GasFeeCap: big.NewInt(36000000000),
            Gas:       uint64(20000000),
            To:        &txReq.ContractAddress,
            Value:     big.NewInt(0),
            Data:      data,
        })

        // Time signing
        signStart := time.Now()
        signedTx, err := types.SignTx(tx, tp.signer, privKey)
        if err != nil {
            log.Printf("Failed to sign transaction %d: %v", i, err)
            continue
        }
        stats.SigningTime += time.Since(signStart)

        // Time marshaling
        marshalStart := time.Now()
        rawTx, err := signedTx.MarshalBinary()
        if err != nil {
            log.Printf("Failed to marshal transaction %d: %v", i, err)
            continue
        }
        txHex := "0x" + hex.EncodeToString(rawTx)
        stats.MarshalTime += time.Since(marshalStart)

        preparedTxs = append(preparedTxs, PreparedTx{
            txHex:     txHex,
            txHash:    signedTx.Hash(),
            txRequest: txReq,
        })
    }

    txResults := make([]TxResult, 0, len(preparedTxs))
    
    // Send all prepared transactions
    for _, prepared := range preparedTxs {
        sendStart := time.Now()

        if debug {
            // In debug mode, use Call to get response and verify hash
            result, err := client.Call("eth_sendRawTransaction", []interface{}{prepared.txHex})
            if err != nil {
                log.Printf("Failed to send transaction with hash %s: %v", prepared.txHash.Hex(), err)
                continue
            }
            var respHash common.Hash
            if err := json.Unmarshal(result, &respHash); err != nil {
                log.Printf("Failed to parse transaction hash for %s: %v", prepared.txHash.Hex(), err)
                continue
            }
            // Verify the hash matches what we calculated
            if respHash != prepared.txHash {
                log.Printf("Warning: Calculated hash %s doesn't match response hash %s", prepared.txHash.Hex(), respHash.Hex())
            }
        } else {
            // In non-debug mode, just send without waiting for response
            if err := client.Send("eth_sendRawTransaction", []interface{}{prepared.txHex}); err != nil {
                log.Printf("Failed to send transaction with hash %s: %v", prepared.txHash.Hex(), err)
                continue
            }
        }
        stats.SendTransactionTime += time.Since(sendStart)

        // Track transaction result
        txResults = append(txResults, TxResult{
            Hash:     prepared.txHash,
            Request:  prepared.txRequest,
            SentTime: time.Now(),
        })
    }

    duration := time.Since(startTime)
    fmt.Printf("Sent %d transactions in %v\n", len(preparedTxs), duration)

    // Start goroutine to monitor transaction receipts only in debug mode
    if debug {
        go tp.monitorTransactionReceipts(txResults)
    }
}

func (tp *TransactionPool) monitorTransactionReceipts(txResults []TxResult) {
    // Wait a bit before starting to check receipts
    time.Sleep(2 * time.Second)

    maxAttempts := 5
    for attempt := 0; attempt < maxAttempts; attempt++ {
        pendingTxs := make([]TxResult, 0)

        for _, txResult := range txResults {
            var receipt map[string]interface{}
            result, err := client.Call("eth_getTransactionReceipt", []interface{}{txResult.Hash.Hex()})
            if err != nil {
                log.Printf("Error checking receipt for tx %s: %v", txResult.Hash.Hex(), err)
                pendingTxs = append(pendingTxs, txResult)
                continue
            }

            if err := json.Unmarshal(result, &receipt); err != nil {
                log.Printf("Failed to parse receipt for tx %s: %v", txResult.Hash.Hex(), err)
                continue
            }

            if receipt == nil {
                // Transaction still pending
                pendingTxs = append(pendingTxs, txResult)
                continue
            }

            // Check transaction status
            status, ok := receipt["status"].(string)
            if !ok {
                log.Printf("Invalid status format for tx %s", txResult.Hash.Hex())
                continue
            }

            // status "0x1" means success, "0x0" means failure
            if status == "0x0" {
                log.Printf("Transaction failed - Hash: %s, Function: %s", 
                    txResult.Hash.Hex(), txResult.Request.Payload.FunctionName)
            } else {
                log.Printf("Transaction succeeded - Hash: %s, Function: %s", 
                    txResult.Hash.Hex(), txResult.Request.Payload.FunctionName)
            }
        }

        // If no pending transactions left, we're done
        if len(pendingTxs) == 0 {
            break
        }

        // Update txResults for next iteration
        txResults = pendingTxs

        // Wait before next check
        time.Sleep(3 * time.Second)
    }
}

// hexToUint64 converts a hex string to uint64
func hexToUint64(hexStr string) (uint64, error) {
    // Remove 0x prefix if present
    if strings.HasPrefix(hexStr, "0x") {
        hexStr = hexStr[2:]
    }
    // Parse as base 16
    val := big.NewInt(0)
    val, ok := val.SetString(hexStr, 16)
    if !ok {
        return 0, fmt.Errorf("invalid hex string: %s", hexStr)
    }
    return val.Uint64(), nil
}

// getNextNonce efficiently manages nonces for addresses using caching
func (tp *TransactionPool) getNextNonce(address common.Address) (uint64, error) {
    addressStr := address.Hex()
    
    // Get or create nonce manager for this address
    var nonceManager *NonceManager
    if nm, exists := tp.nonceCache.Load(addressStr); exists {
        nonceManager = nm.(*NonceManager)
    } else {
        // Create new nonce manager and fetch initial nonce
        result, err := client.Call("eth_getTransactionCount", []interface{}{addressStr, "pending"})
        if err != nil {
            return 0, fmt.Errorf("failed to get initial nonce: %v", err)
        }
        
        var nonceHex string
        if err := json.Unmarshal(result, &nonceHex); err != nil {
            return 0, fmt.Errorf("failed to parse initial nonce: %v", err)
        }
        
        initialNonce, err := hexToUint64(nonceHex)
        if err != nil {
            return 0, fmt.Errorf("failed to convert initial nonce: %v", err)
        }
        
        nonceManager = &NonceManager{
            currentNonce: initialNonce,
            lastUpdate:  time.Now(),
        }
        
        // Use LoadOrStore to handle race conditions
        if actual, loaded := tp.nonceCache.LoadOrStore(addressStr, nonceManager); loaded {
            nonceManager = actual.(*NonceManager)
        }
    }
    
    // Thread-safe nonce increment
    nonceManager.mutex.Lock()
    defer nonceManager.mutex.Unlock()
    
    // Check if nonce cache is stale (older than 30 seconds)
    if time.Since(nonceManager.lastUpdate) > 30*time.Second {
        // Refresh nonce from blockchain
        result, err := client.Call("eth_getTransactionCount", []interface{}{addressStr, "pending"})
        if err != nil {
            // If refresh fails, just continue with cached nonce
            log.Printf("Warning: Failed to refresh nonce for %s, using cached value: %v", addressStr, err)
        } else {
            var nonceHex string
            if err := json.Unmarshal(result, &nonceHex); err == nil {
                if refreshedNonce, err := hexToUint64(nonceHex); err == nil {
                    // Only update if blockchain nonce is higher (handles external transactions)
                    if refreshedNonce > nonceManager.currentNonce {
                        nonceManager.currentNonce = refreshedNonce
                    }
                    nonceManager.lastUpdate = time.Now()
                }
            }
        }
    }
    
    currentNonce := nonceManager.currentNonce
    nonceManager.currentNonce++
    
    return currentNonce, nil
}

func (tp *TransactionPool) Stop() {
    close(tp.stopCh)
    if client != nil {
        client.Close()
    }
}
