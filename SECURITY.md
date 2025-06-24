# Security Guidelines

## Private Key Management

**⚠️ CRITICAL: Never commit private keys to version control!**

### Environment Variables

All private keys should be set via environment variables:

```bash
# For backend services
export PRIVATE_KEY=0x...

# For frontend applications
export NEXT_PUBLIC_PRIVATE_KEY=0x...

# For contract deployment
export PRIVATE_KEY=0x...
```

### Safe Files for Testing

The following files contain private keys and are excluded from git:
- `simple-client.js` - Fast event emission client
- `enhanced-client.js` - Advanced testing client with metrics
- `test.html` - Browser-based testing interface
- `verify-transactions.js` - Transaction verification script

### Example Usage

1. Copy the example file:
```bash
cp client-example.js my-client.js
```

2. Set your private key:
```bash
export PRIVATE_KEY=0x1234567890abcdef...
```

3. Run your script:
```bash
node my-client.js
```

### Configuration Files

- `hardhat.config.ts` - Uses environment variable with test fallback
- `etherbaseConfig.ts` - Uses environment variable with placeholder fallback
- All Docker services use environment variables from `.env` files

### Test Keys

The following are safe test keys used in automated tests (NOT for production):
- `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` (Hardhat Account #0)
- `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` (Hardhat Account #1)

### What's Safe to Commit

✅ Configuration files that use environment variables
✅ Test files that use standard Hardhat test accounts
✅ Example files with placeholder values
✅ Documentation and README files

### What's NOT Safe to Commit

❌ Any file with actual private keys
❌ `.env` files with real values
❌ Client scripts with hardcoded keys
❌ Configuration files with production credentials

### .gitignore Protection

The following patterns are excluded from git:
```
.env
.env.*
simple-client.js
enhanced-client.js
test.html
verify-transactions.js
*.local.js
*.test.js
```

## Deployment Security

### Development
- Use test networks (localhost, testnets)
- Use test private keys with no real value
- Never use production keys in development

### Production
- Use secure key management systems
- Rotate keys regularly
- Monitor for unauthorized access
- Use minimal permissions

### Docker Security
- Never build private keys into images
- Use Docker secrets or environment variables
- Scan images for security vulnerabilities
- Use specific version tags, not `latest`

## Incident Response

If a private key is accidentally committed:
1. **Immediately** revoke/rotate the compromised key
2. Remove the key from git history using `git filter-branch` or BFG
3. Check if any funds were moved
4. Update all systems using the old key
5. Review access logs for unauthorized usage

## Contact

For security issues, please contact the development team immediately.
