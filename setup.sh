#!/bin/bash

# Etherbase Setup Script
# This script helps with the initial setup for deploying Etherbase

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       Etherbase Setup Script         ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo -e "${YELLOW}Checking for required tools...${NC}"

# Check for Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    echo -e "${GREEN}✓ Docker is installed (version $DOCKER_VERSION)${NC}"
else
    echo -e "${RED}✗ Docker is not installed. Please install Docker first:${NC}"
    echo -e "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check for Docker Compose
if command_exists docker-compose || command_exists "docker compose"; then
    if command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
        echo -e "${GREEN}✓ Docker Compose is installed (version $COMPOSE_VERSION)${NC}"
    else
        COMPOSE_VERSION=$(docker compose version | awk '{print $4}')
        echo -e "${GREEN}✓ Docker Compose V2 is installed (version $COMPOSE_VERSION)${NC}"
    fi
else
    echo -e "${RED}✗ Docker Compose is not installed. Please install Docker Compose:${NC}"
    echo -e "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Check for Node.js (optional for local development)
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js is installed (version $NODE_VERSION)${NC}"
else
    echo -e "${YELLOW}⚠ Node.js is not installed. This is only needed for local development.${NC}"
fi

echo

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
    else
        echo -e "${RED}✗ .env.example not found. Creating a basic .env file...${NC}"
        cat > .env << EOF
# Etherbase Environment Configuration

# Blockchain Connection
RPC_URL=wss://dream-rpc.somnia.network/ws
CHAIN_ID=50312
PRIVATE_KEY=your_private_key_here

# Backend Service Configuration
READER_PORT=8082
WRITER_PORT=8081
ENV=production
POLL_INTERVAL_MS=1000

# Contract Addresses
ETHERBASE_ADDRESS=0x62F1B07877faC4E758794Dea44939CdCef5281a1
MULTICALL_ADDRESS=0x3fD7C31D0d2128aD2b83db6327CA73c1186f9EA1

# Frontend Configuration
NEXT_PUBLIC_ENV=somnia
NEXT_PUBLIC_USE_LOCAL_BACKEND=false
EOF
        echo -e "${GREEN}✓ Created basic .env file${NC}"
    fi
    
    # Prompt for important configuration values
    echo -e "${YELLOW}Please configure the following important values:${NC}"
    
    # RPC URL
    read -p "RPC URL (default: wss://dream-rpc.somnia.network/ws): " RPC_URL
    if [ ! -z "$RPC_URL" ]; then
        sed -i.bak "s|RPC_URL=.*|RPC_URL=$RPC_URL|g" .env
    fi
    
    # Chain ID
    read -p "Chain ID (default: 50312 for Somnia): " CHAIN_ID
    if [ ! -z "$CHAIN_ID" ]; then
        sed -i.bak "s|CHAIN_ID=.*|CHAIN_ID=$CHAIN_ID|g" .env
    fi
    
    # Private Key
    read -p "Private Key (for transaction signing): " PRIVATE_KEY
    if [ ! -z "$PRIVATE_KEY" ]; then
        sed -i.bak "s|PRIVATE_KEY=.*|PRIVATE_KEY=$PRIVATE_KEY|g" .env
    else
        echo -e "${RED}⚠ Warning: No private key provided. The writer service will not be able to sign transactions.${NC}"
    fi
    
    # Etherbase Contract Address
    read -p "Etherbase Contract Address (default: 0x62F1B07877faC4E758794Dea44939CdCef5281a1): " ETHERBASE_ADDRESS
    if [ ! -z "$ETHERBASE_ADDRESS" ]; then
        sed -i.bak "s|ETHERBASE_ADDRESS=.*|ETHERBASE_ADDRESS=$ETHERBASE_ADDRESS|g" .env
    fi
    
    # Multicall Contract Address
    read -p "Multicall Contract Address (default: 0x3fD7C31D0d2128aD2b83db6327CA73c1186f9EA1): " MULTICALL_ADDRESS
    if [ ! -z "$MULTICALL_ADDRESS" ]; then
        sed -i.bak "s|MULTICALL_ADDRESS=.*|MULTICALL_ADDRESS=$MULTICALL_ADDRESS|g" .env
    fi
    
    # Clean up backup file
    rm -f .env.bak
    
    echo -e "${GREEN}✓ Environment configuration complete${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo

# Check if docker-compose.yml exists
if [ ! -f docker-compose.yml ]; then
    echo -e "${RED}✗ docker-compose.yml not found. Please create it first.${NC}"
    echo -e "   You can use the template provided in the deployment guide."
fi

echo
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       Deployment Options              ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo
echo -e "${YELLOW}1. Build and run containers locally${NC}"
echo -e "   Command: docker compose up --build"
echo
echo -e "${YELLOW}2. Build containers for production${NC}"
echo -e "   Command: docker compose build"
echo
echo -e "${YELLOW}3. Push containers to registry${NC}"
echo -e "   Update the registry path in the deployment guide"
echo
echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Setup complete! Follow the DEPLOYMENT.md guide for next steps.${NC}"
echo

# Ask if the user wants to build and run containers locally
read -p "Would you like to build and run the containers locally now? (y/n): " RUN_LOCAL
if [[ $RUN_LOCAL == "y" || $RUN_LOCAL == "Y" ]]; then
    echo -e "${YELLOW}Building and running containers...${NC}"
    docker compose up --build
else
    echo -e "${GREEN}You can build and run the containers later using 'docker compose up --build'${NC}"
fi
