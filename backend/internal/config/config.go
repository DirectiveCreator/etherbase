package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/ethereum/go-ethereum/common"
)

// Config holds the runtime configuration
type Config struct {
	ReaderPort string
	WriterPort string
	RpcURL      string
	Environment          string
	Port                 int
	EtherbaseAddress       common.Address
	MulticallAddress     common.Address
	LocalPrivateKey      string // For local usage
	PrivateKey          string
	PollingIntervalMS    int
	ChainID              int
}

func LoadConfig() (*Config, error) {
	readerPort := os.Getenv("READER_PORT")
	if readerPort == "" {
		readerPort = "8082"
	}

	writerPort := os.Getenv("WRITER_PORT")
	if writerPort == "" {
		writerPort = "8081"
	}

	rpcURL := os.Getenv("RPC_URL")
	if rpcURL == "" {
		// Alternative high-performance RPC
		rpcURL = "wss://enterprise.onerpc.com/somnia_testnet?apikey=e97af24c8759a6cad0acd837d853aac43bb0903dcdab411d08b77aaf5c4c38a7"
		// Fallback RPC
		// rpcURL = "wss://dream-rpc.somnia.network/ws"
		// rpcURL = "ws://localhost:8545"
	}

	chainIDStr := os.Getenv("CHAIN_ID")
	if chainIDStr == "" {
		chainIDStr = "50312"
		// chainIDStr = "31337"
	}
	chainID, _ := strconv.Atoi(chainIDStr)

	intervalStr := os.Getenv("POLL_INTERVAL_MS")
	if intervalStr == "" {
		intervalStr = "1000"
	}
	interval, _ := strconv.Atoi(intervalStr)

	defaultEtherbase := "0x62F1B07877faC4E758794Dea44939CdCef5281a1"
	etherbaseAddrStr := os.Getenv("ETHERBASE_ADDRESS")
	if etherbaseAddrStr == "" {
		etherbaseAddrStr = defaultEtherbase
	}

	return &Config{
		ReaderPort:         readerPort,
		WriterPort:         writerPort,
		RpcURL:             rpcURL,
		Environment:       os.Getenv("ENV"),
		LocalPrivateKey:   os.Getenv("LOCAL_PRIVATE_KEY"),
		PrivateKey:        os.Getenv("PRIVATE_KEY"),
		PollingIntervalMS: interval,
		EtherbaseAddress:    common.HexToAddress(etherbaseAddrStr),
		MulticallAddress:    common.HexToAddress("0x3fD7C31D0d2128aD2b83db6327CA73c1186f9EA1"),
		ChainID:            chainID,
	}, nil
}

func (c *Config) String() string {
	return fmt.Sprintf("Env=%s Port=%d Etherbase=%s Multicall=%s RPC=%s", 
		c.Environment, c.Port, c.EtherbaseAddress.Hex(), c.MulticallAddress.Hex(), c.RpcURL)
}
