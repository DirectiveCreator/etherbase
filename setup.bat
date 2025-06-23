@echo off
setlocal enabledelayedexpansion

echo =======================================
echo        Etherbase Setup Script
echo =======================================
echo.

REM Check for required tools
echo Checking for required tools...

REM Check for Docker
where docker >nul 2>&1
if %ERRORLEVEL% == 0 (
    for /f "tokens=3" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo [92m✓ Docker is installed (version %DOCKER_VERSION%^)[0m
) else (
    echo [91m✗ Docker is not installed. Please install Docker first:[0m
    echo    https://docs.docker.com/get-docker/
    exit /b 1
)

REM Check for Docker Compose
where docker-compose >nul 2>&1
if %ERRORLEVEL% == 0 (
    for /f "tokens=3" %%i in ('docker-compose --version') do set COMPOSE_VERSION=%%i
    echo [92m✓ Docker Compose is installed (version %COMPOSE_VERSION%^)[0m
) else (
    docker compose version >nul 2>&1
    if %ERRORLEVEL% == 0 (
        for /f "tokens=4" %%i in ('docker compose version') do set COMPOSE_VERSION=%%i
        echo [92m✓ Docker Compose V2 is installed (version %COMPOSE_VERSION%^)[0m
    ) else (
        echo [91m✗ Docker Compose is not installed. Please install Docker Compose:[0m
        echo    https://docs.docker.com/compose/install/
        exit /b 1
    )
)

REM Check for Node.js (optional for local development)
where node >nul 2>&1
if %ERRORLEVEL% == 0 (
    for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [92m✓ Node.js is installed (version %NODE_VERSION%^)[0m
) else (
    echo [93m⚠ Node.js is not installed. This is only needed for local development.[0m
)

echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo [93mCreating .env file from template...[0m
    if exist .env.example (
        copy .env.example .env >nul
        echo [92m✓ Created .env file from .env.example[0m
    ) else (
        echo [91m✗ .env.example not found. Creating a basic .env file...[0m
        (
            echo # Etherbase Environment Configuration
            echo.
            echo # Blockchain Connection
            echo RPC_URL=wss://dream-rpc.somnia.network/ws
            echo CHAIN_ID=50312
            echo PRIVATE_KEY=your_private_key_here
            echo.
            echo # Backend Service Configuration
            echo READER_PORT=8082
            echo WRITER_PORT=8081
            echo ENV=production
            echo POLL_INTERVAL_MS=1000
            echo.
            echo # Contract Addresses
            echo ETHERBASE_ADDRESS=0x62F1B07877faC4E758794Dea44939CdCef5281a1
            echo MULTICALL_ADDRESS=0x3fD7C31D0d2128aD2b83db6327CA73c1186f9EA1
            echo.
            echo # Frontend Configuration
            echo NEXT_PUBLIC_ENV=somnia
            echo NEXT_PUBLIC_USE_LOCAL_BACKEND=false
        ) > .env
        echo [92m✓ Created basic .env file[0m
    )
    
    REM Prompt for important configuration values
    echo [93mPlease configure the following important values:[0m
    
    REM RPC URL
    set /p RPC_URL="RPC URL (default: wss://dream-rpc.somnia.network/ws): "
    if not "!RPC_URL!"=="" (
        powershell -Command "(Get-Content .env) -replace 'RPC_URL=.*', 'RPC_URL=!RPC_URL!' | Set-Content .env"
    )
    
    REM Chain ID
    set /p CHAIN_ID="Chain ID (default: 50312 for Somnia): "
    if not "!CHAIN_ID!"=="" (
        powershell -Command "(Get-Content .env) -replace 'CHAIN_ID=.*', 'CHAIN_ID=!CHAIN_ID!' | Set-Content .env"
    )
    
    REM Private Key
    set /p PRIVATE_KEY="Private Key (for transaction signing): "
    if not "!PRIVATE_KEY!"=="" (
        powershell -Command "(Get-Content .env) -replace 'PRIVATE_KEY=.*', 'PRIVATE_KEY=!PRIVATE_KEY!' | Set-Content .env"
    ) else (
        echo [91m⚠ Warning: No private key provided. The writer service will not be able to sign transactions.[0m
    )
    
    REM Etherbase Contract Address
    set /p ETHERBASE_ADDRESS="Etherbase Contract Address (default: 0x62F1B07877faC4E758794Dea44939CdCef5281a1): "
    if not "!ETHERBASE_ADDRESS!"=="" (
        powershell -Command "(Get-Content .env) -replace 'ETHERBASE_ADDRESS=.*', 'ETHERBASE_ADDRESS=!ETHERBASE_ADDRESS!' | Set-Content .env"
    )
    
    REM Multicall Contract Address
    set /p MULTICALL_ADDRESS="Multicall Contract Address (default: 0x3fD7C31D0d2128aD2b83db6327CA73c1186f9EA1): "
    if not "!MULTICALL_ADDRESS!"=="" (
        powershell -Command "(Get-Content .env) -replace 'MULTICALL_ADDRESS=.*', 'MULTICALL_ADDRESS=!MULTICALL_ADDRESS!' | Set-Content .env"
    )
    
    echo [92m✓ Environment configuration complete[0m
) else (
    echo [92m✓ .env file already exists[0m
)

echo.

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo [91m✗ docker-compose.yml not found. Please create it first.[0m
    echo    You can use the template provided in the deployment guide.
)

echo.
echo =======================================
echo        Deployment Options
echo =======================================
echo.
echo [93m1. Build and run containers locally[0m
echo    Command: docker compose up --build
echo.
echo [93m2. Build containers for production[0m
echo    Command: docker compose build
echo.
echo [93m3. Push containers to registry[0m
echo    Update the registry path in the deployment guide
echo.
echo =======================================
echo [92mSetup complete! Follow the DEPLOYMENT.md guide for next steps.[0m
echo.

REM Ask if the user wants to build and run containers locally
set /p RUN_LOCAL="Would you like to build and run the containers locally now? (y/n): "
if /i "%RUN_LOCAL%"=="y" (
    echo [93mBuilding and running containers...[0m
    docker compose up --build
) else (
    echo [92mYou can build and run the containers later using 'docker compose up --build'[0m
)

endlocal
