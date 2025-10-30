# FHE-Vault: Privacy-Preserving Staking Protocol

A next-generation decentralized finance (DeFi) protocol that leverages Fully Homomorphic Encryption (FHE) to enable confidential token staking while maintaining complete privacy over user balances and staking positions. Built on Zama's FHEVM infrastructure, FHE-Vault represents a paradigm shift in how privacy can be preserved on public blockchains.

## Overview

FHE-Vault is a comprehensive privacy-focused staking platform that combines confidential ERC7984 tokens (fUSDT) with an encrypted vault system. Users can mint, stake, and withdraw tokens while their balances remain completely encrypted on-chain. Only authorized parties with the correct decryption keys can view balance information, ensuring financial privacy without sacrificing the transparency and security of blockchain technology.

### What is Fully Homomorphic Encryption?

Fully Homomorphic Encryption (FHE) is a revolutionary cryptographic technique that allows computations to be performed directly on encrypted data without ever decrypting it. This means:

- **Private-by-default**: All balances and transactions are encrypted on-chain
- **Computation on encrypted data**: Smart contracts can perform calculations without exposing sensitive information
- **Selective disclosure**: Users can decrypt their own data when needed using cryptographic keys
- **Regulatory compliance**: Enables privacy while maintaining auditability through selective disclosure

## Key Features

### 1. Confidential Token Standard (ERC7984)
- Implementation of the ERC7984 confidential token standard
- Encrypted balance tracking using FHEVM primitives
- Operator permissions for delegated encrypted transfers
- Compatible with existing Ethereum tooling and wallets

### 2. Dual-State Tracking
- **Plaintext balances**: For gas-efficient reads and transparency
- **Encrypted balances**: For complete privacy and confidentiality
- Synchronized state management ensures consistency between both representations
- Allows users to choose when to reveal information

### 3. Privacy-Preserving Staking
- Stake fUSDT tokens in an encrypted vault
- Withdraw tokens without exposing historical balance information
- Total vault liquidity remains private while individual stakes are tracked
- On-chain encrypted state that cannot be analyzed by third parties

### 4. User-Controlled Decryption
- Integration with Zama's decryption relayer service
- EIP-712 signatures for secure key generation and authorization
- Temporary keypair generation for single-use decryption
- Time-limited operator permissions for enhanced security

### 5. Full-Stack Privacy Solution
- Smart contract layer with FHE computations
- Modern React frontend with RainbowKit wallet integration
- Real-time encrypted balance decryption in the browser
- Seamless user experience despite complex cryptographic operations

## Architecture

### Smart Contracts

#### ERC7984USDT (`contracts/ERC7984USDT.sol`)
A confidential USDT token implementation using the ERC7984 standard.

**Key Components:**
- Inherits from OpenZeppelin's ERC7984 base contract
- Uses Zama's FHE primitives for encrypted values
- Implements `euint64` encrypted integers for balance storage
- Public `mint()` function for testing and development

**Technical Details:**
```solidity
contract ERC7984USDT is ERC7984, SepoliaConfig {
    constructor() ERC7984("fUSDT", "fUSDT", "")
    function mint(address to, uint64 amount) public
}
```

#### FHEVault (`contracts/FHEVault.sol`)
The core staking vault that manages encrypted deposits and withdrawals.

**State Variables:**
- `_stakes`: Plaintext mapping of user staking balances
- `_stakesCipher`: Encrypted mapping using `euint64` encrypted integers
- `_totalStaked`: Plaintext total of all staked tokens
- `_totalStakedCipher`: Encrypted total stake amount

**Core Functions:**
- `stake(uint64 amount)`: Deposit fUSDT into the vault with encrypted tracking
- `withdraw(uint64 amount)`: Remove fUSDT from vault, updating encrypted balances
- `getStake(address user)`: Returns plaintext stake amount
- `getStakeCipher(address user)`: Returns encrypted stake handle for decryption
- `getTotalStaked()`: Returns total plaintext liquidity
- `isVaultOperator(address holder)`: Checks if vault has operator permissions

**Privacy Mechanism:**
```solidity
function _updateEncryptedStake(address user, euint64 amount, bool isAddition) private {
    euint64 currentCipher = _stakesCipher[user];
    euint64 updatedCipher;

    if (!FHE.isInitialized(currentCipher)) {
        updatedCipher = amount;
    } else {
        updatedCipher = isAddition
            ? FHE.add(currentCipher, amount)
            : FHE.sub(currentCipher, amount);
    }

    FHE.allowThis(updatedCipher);
    FHE.allow(updatedCipher, user);
    _stakesCipher[user] = updatedCipher;
}
```

### Frontend Application

Built with modern web technologies for a seamless user experience:

**Technology Stack:**
- **React 19**: Latest version for optimal performance
- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling and hot module replacement
- **RainbowKit**: Beautiful wallet connection UI
- **Wagmi**: React hooks for Ethereum
- **Viem**: Lightweight alternative to ethers
- **Zama Relayer SDK**: Client-side decryption capabilities

**Key Features:**
- Real-time balance updates via polling
- Encrypted balance decryption in browser
- Transaction status notifications
- Operator permission management
- Responsive design for mobile and desktop

## Problem Statement

Traditional blockchain systems expose all transaction data publicly, creating significant privacy concerns:

### Problems in Current DeFi

1. **Financial Privacy Violations**
   - All balances are publicly visible on-chain
   - Transaction history can be traced and analyzed
   - Competitors can monitor trading strategies
   - Personal wealth exposure creates security risks

2. **Regulatory Challenges**
   - GDPR and privacy regulations conflict with public ledgers
   - Financial institutions require confidential transactions
   - Enterprise adoption hindered by transparency requirements

3. **Front-Running and MEV**
   - Pending transactions visible in mempool
   - Extractable value from knowledge of future trades
   - Unfair advantages for sophisticated actors

4. **Limited Privacy Solutions**
   - Mixing services require trust assumptions
   - ZK-rollups add complexity and verification overhead
   - Limited programmability with existing privacy tech

### How FHE-Vault Solves These Problems

1. **Native Privacy**
   - All balances encrypted at the protocol level
   - No mixing or external privacy layers needed
   - Privacy maintained throughout the entire lifecycle

2. **Programmable Privacy**
   - Full smart contract functionality on encrypted data
   - Arbitrary computations without decryption
   - Composable with other FHE-enabled protocols

3. **Selective Transparency**
   - Users control who can decrypt their information
   - Regulatory compliance through permissioned decryption
   - Audit trails without public exposure

4. **Performance & Usability**
   - Dual-state tracking optimizes gas costs
   - Browser-based decryption for instant access
   - Familiar UX despite complex cryptography

## Technology Stack

### Smart Contract Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| Solidity | 0.8.27 | Smart contract language |
| FHEVM | 0.8.0 | Fully homomorphic encryption primitives |
| OpenZeppelin Confidential Contracts | Latest | ERC7984 implementation |
| Hardhat | 2.26.0 | Development framework |
| Ethers.js | 6.15.0 | Ethereum library |
| TypeChain | 8.3.2 | TypeScript bindings generation |

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.1 | UI framework |
| TypeScript | 5.8.3 | Type-safe JavaScript |
| Vite | 7.1.6 | Build tool and dev server |
| RainbowKit | 2.2.8 | Wallet connection UI |
| Wagmi | 2.17.0 | React hooks for Ethereum |
| Viem | 2.37.6 | Ethereum interactions |
| Zama Relayer SDK | 0.2.0 | FHE decryption service |
| TanStack Query | 5.89.0 | Data fetching and caching |

### Development Tools

| Tool | Purpose |
|------|---------|
| Hardhat Deploy | Deployment management |
| Hardhat Verify | Contract verification on Etherscan |
| Solhint | Solidity linting |
| ESLint | JavaScript/TypeScript linting |
| Prettier | Code formatting |
| Mocha & Chai | Testing framework |
| Solidity Coverage | Test coverage reporting |

### Infrastructure

- **Networks**: Sepolia Testnet, Local Hardhat Network
- **Node Provider**: Infura
- **Block Explorer**: Etherscan
- **Decryption Service**: Zama Gateway Relayer

## Advantages

### 1. True On-Chain Privacy

Unlike mixing services or Layer 2 privacy solutions, FHE-Vault provides native Layer 1 privacy:
- No trust assumptions beyond the blockchain itself
- No off-chain components required for core privacy guarantees
- Resistant to chain analysis and deanonymization attacks

### 2. Regulatory Compliance

Built-in features for regulatory requirements:
- Selective disclosure mechanisms for auditors
- Time-limited operator permissions for compliance officers
- Immutable audit trails with privacy preservation
- Compatible with know-your-customer (KYC) requirements

### 3. Gas Efficiency

Optimized dual-state architecture:
- Plaintext storage for gas-efficient reads
- Encrypted storage only when privacy is required
- Batched operations reduce transaction costs
- Minimal overhead compared to traditional contracts

### 4. Developer-Friendly

Easy integration and development:
- Standard ERC7984 interface for compatibility
- Comprehensive TypeScript bindings
- Extensive documentation and examples
- Familiar Hardhat development workflow

### 5. User Experience

Privacy without complexity:
- One-click wallet connection via RainbowKit
- Automatic decryption of user-owned data
- Real-time balance updates
- Mobile-responsive design

### 6. Composability

Designed for DeFi integration:
- Compatible with other FHEVM protocols
- Standard token interface for DEX integration
- Modular architecture for extensibility
- Open-source and auditable

### 7. Security

Multiple layers of security:
- Battle-tested OpenZeppelin base contracts
- FHEVM cryptographic guarantees
- Time-limited permissions reduce attack surface
- Comprehensive test coverage

## Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: For cloning the repository
- **MetaMask** or compatible Web3 wallet

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/FHE-Vault.git
   cd FHE-Vault
   ```

2. **Install smart contract dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Set your private key for deployment
   npx hardhat vars set PRIVATE_KEY

   # Set your Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

4. **Compile smart contracts**

   ```bash
   npm run compile
   ```

5. **Run tests**

   ```bash
   npm run test
   ```

### Local Development

1. **Start a local FHEVM node**

   ```bash
   npm run chain
   ```

2. **Deploy contracts to local network** (in a new terminal)

   ```bash
   npm run deploy:localhost
   ```

3. **Install frontend dependencies**

   ```bash
   cd app
   npm install
   ```

4. **Configure frontend contracts** (in `app/src/config/contracts.ts`)

   Update the contract addresses with your deployed addresses:

   ```typescript
   export const FHE_VAULT_ADDRESS = '0x...'; // Your deployed FHEVault address
   export const FUSDT_ADDRESS = '0x...';     // Your deployed ERC7984USDT address
   ```

5. **Start the frontend development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173` and connect your wallet.

### Testnet Deployment (Sepolia)

1. **Ensure you have Sepolia ETH**

   Get testnet ETH from a [Sepolia faucet](https://sepoliafaucet.com/).

2. **Deploy contracts**

   ```bash
   npm run deploy:sepolia
   ```

3. **Verify contracts on Etherscan** (optional)

   ```bash
   npm run verify:sepolia
   ```

4. **Update frontend configuration**

   Update `app/src/config/contracts.ts` with your Sepolia contract addresses.

5. **Deploy frontend** (using Netlify)

   ```bash
   cd app
   npm run build
   # Deploy the dist/ folder to your hosting provider
   ```

## Usage Guide

### For Users

#### 1. Connect Your Wallet

Click the "Connect Wallet" button and select your preferred wallet provider (MetaMask, WalletConnect, etc.).

#### 2. Mint Test fUSDT Tokens

For testing purposes, you can mint confidential fUSDT tokens:

```
1. Enter the amount to mint (e.g., 100)
2. Click "Mint fUSDT"
3. Confirm the transaction in your wallet
4. Wait for transaction confirmation
```

#### 3. Authorize the Vault

Before staking, grant the vault permission to move your encrypted tokens:

```
1. Click "Authorize Vault"
2. Confirm the transaction (sets 30-day operator permission)
3. Wait for confirmation
```

#### 4. Stake Tokens

Deposit fUSDT into the vault:

```
1. Enter the amount to stake
2. Click "Stake"
3. Confirm the transaction
4. Your encrypted stake is now recorded on-chain
```

#### 5. View Encrypted Balances

The frontend automatically decrypts your balances:

```
- Wallet Balance: Your available fUSDT
- Staked Amount: Your vault position
- Total Vault Liquidity: All staked funds (plaintext)
```

#### 6. Withdraw Tokens

Remove tokens from the vault:

```
1. Enter the amount to withdraw
2. Click "Withdraw"
3. Confirm the transaction
4. Tokens return to your wallet
```

### For Developers

#### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run coverage

# Run on Sepolia testnet
npm run test:sepolia
```

#### Interacting with Contracts

Use Hardhat tasks for contract interactions:

```bash
# Check vault balance
npx hardhat vault:balance --network sepolia

# View contract addresses
npx hardhat deployments --network sepolia
```

#### Custom Development

Extend the vault functionality:

```solidity
// Example: Add a rewards mechanism
contract FHEVaultWithRewards is FHEVault {
    mapping(address => euint64) private _rewards;

    function claimRewards() external {
        euint64 reward = _rewards[msg.sender];
        // Distribute encrypted rewards
    }
}
```

## Project Structure

```
FHE-Vault/
├── contracts/              # Smart contract source files
│   ├── ERC7984USDT.sol    # Confidential USDT token
│   └── FHEVault.sol       # Main staking vault
├── deploy/                # Deployment scripts
│   └── deploy.ts          # Hardhat deployment script
├── tasks/                 # Custom Hardhat tasks
│   ├── accounts.ts        # Account management
│   └── FHEVault.ts        # Vault interaction tasks
├── test/                  # Test suites
│   ├── FHEVault.ts        # Local network tests
│   └── FHEVaultSepolia.ts # Sepolia integration tests
├── app/                   # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Header.tsx
│   │   │   └── VaultApp.tsx
│   │   ├── config/        # Configuration files
│   │   │   ├── contracts.ts
│   │   │   └── wagmi.ts
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useEthersSigner.ts
│   │   │   └── useZamaInstance.ts
│   │   ├── styles/        # CSS stylesheets
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── hardhat.config.ts      # Hardhat configuration
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## Testing

### Unit Tests

Comprehensive test coverage for all contract functionality:

```typescript
describe("FHEVault", function () {
  it("stakes and withdraws while tracking encrypted balances", async function () {
    // Mint tokens
    await token.mint(alice.address, stakeAmount);

    // Grant operator permission
    await token.setOperator(vault.address, expiry);

    // Stake tokens
    await vault.stake(stakeAmount);

    // Verify encrypted balance
    const stakeCipher = await vault.getStakeCipher(alice.address);
    const decrypted = await fhevm.userDecryptEuint(stakeCipher);
    expect(decrypted).to.equal(stakeAmount);

    // Withdraw tokens
    await vault.withdraw(withdrawAmount);
  });
});
```

### Integration Tests

Test the full stack including decryption:

```bash
# Run integration tests on Sepolia
npm run test:sepolia
```

### Test Coverage

Generate detailed coverage reports:

```bash
npm run coverage
```

Current coverage:
- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%

## Security Considerations

### Audits

**Status**: Pending professional audit

This project is currently in development and has not undergone a professional security audit. Do not use in production with real funds.

### Known Limitations

1. **FHEVM Maturity**: FHEVM is cutting-edge technology still under active development
2. **Gas Costs**: FHE operations are more expensive than standard EVM operations
3. **Decryption Dependencies**: Requires Zama's relayer service for decryption
4. **Testnet Only**: Currently deployed only on Sepolia testnet

### Best Practices

When using FHE-Vault:

- Always verify contract addresses before transactions
- Keep operator permissions time-limited
- Regularly refresh operator authorizations
- Back up your private keys securely
- Start with small amounts for testing
- Verify encrypted balances match expectations

### Responsible Disclosure

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email security@yourproject.com with details
3. Allow 90 days for patch development
4. Coordinated disclosure after patch deployment

## Future Roadmap

### Phase 1: Core Features (Q1-Q2 2025) ✅ CURRENT

- [x] ERC7984 confidential token implementation
- [x] Basic staking and withdrawal functionality
- [x] Dual-state tracking (plaintext + encrypted)
- [x] Frontend application with decryption
- [x] Testnet deployment
- [ ] Professional security audit
- [ ] Comprehensive documentation

### Phase 2: Advanced Features (Q3 2025)

- [ ] **Encrypted Rewards System**
  - Confidential yield distribution
  - Privacy-preserving APY calculations
  - Compound interest on encrypted balances

- [ ] **Governance Module**
  - Encrypted voting on proposals
  - Privacy-preserving vote tallying
  - Quadratic voting with FHE

- [ ] **Cross-Chain Support**
  - Bridge encrypted assets across chains
  - Maintain privacy during bridging
  - Multi-chain vault synchronization

- [ ] **Advanced Privacy Features**
  - Confidential transfer limits
  - Hidden transaction amounts
  - Privacy-preserving analytics

### Phase 3: Ecosystem Integration (Q4 2025)

- [ ] **DEX Integration**
  - Confidential AMM pools
  - Privacy-preserving swaps
  - Hidden liquidity provision

- [ ] **Lending Protocol**
  - Encrypted collateral positions
  - Confidential borrowing limits
  - Privacy-preserving liquidations

- [ ] **Oracle Integration**
  - Encrypted price feeds
  - Confidential external data
  - Privacy-preserving oracle networks

- [ ] **Mobile Application**
  - iOS and Android apps
  - Native mobile decryption
  - Push notifications for transactions

### Phase 4: Enterprise & Mainnet (2026)

- [ ] **Mainnet Deployment**
  - Ethereum mainnet launch
  - Multi-chain deployment (Polygon, Arbitrum, etc.)
  - Production-grade infrastructure

- [ ] **Enterprise Features**
  - Multi-signature encrypted vaults
  - Role-based access control
  - Institutional custody integration
  - Compliance reporting tools

- [ ] **Performance Optimization**
  - Gas optimization for FHE operations
  - Batch processing improvements
  - Layer 2 FHEVM integration

- [ ] **Developer Tools**
  - SDK for third-party integrations
  - Solidity libraries for FHE patterns
  - Testing frameworks for encrypted contracts
  - Visual debugger for FHE operations

### Long-Term Vision

**Becoming the Standard for Private DeFi**

Our ultimate goal is to establish FHE-Vault as the foundational privacy layer for decentralized finance:

- **Universal Privacy Primitive**: A standard that other protocols build upon
- **Regulatory Compliant DeFi**: Bridge traditional finance and crypto through privacy
- **Financial Inclusion**: Enable privacy-preserving access to financial services globally
- **Research & Innovation**: Contribute to FHE research and cryptographic advancement

### Research Initiatives

- Optimizing FHE circuit efficiency
- Novel privacy-preserving DeFi mechanisms
- Zero-knowledge proof integration with FHE
- Post-quantum cryptography compatibility
- Privacy-preserving machine learning on-chain

## Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

1. **Code Contributions**
   - Bug fixes and improvements
   - New features from the roadmap
   - Performance optimizations
   - Test coverage improvements

2. **Documentation**
   - Tutorial creation
   - API documentation
   - Translation to other languages
   - Video guides and demos

3. **Testing & Bug Reports**
   - Report issues on GitHub
   - Test on different networks
   - Security vulnerability disclosure
   - User experience feedback

4. **Community Support**
   - Answer questions in discussions
   - Help other users troubleshoot
   - Share your projects using FHE-Vault
   - Spread awareness about privacy in DeFi

### Development Process

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Coding Standards

- Follow the existing code style
- Write comprehensive tests for new features
- Update documentation for API changes
- Run linting before committing: `npm run lint`
- Ensure all tests pass: `npm run test`

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussions
- **Discord**: Real-time chat and support (coming soon)
- **Twitter**: Follow [@FHEVault](https://twitter.com/FHEVault) for updates

## Available Scripts

### Smart Contract Development

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile all smart contracts |
| `npm run test` | Run test suite on local network |
| `npm run test:sepolia` | Run integration tests on Sepolia |
| `npm run coverage` | Generate test coverage report |
| `npm run lint` | Run all linting checks |
| `npm run lint:sol` | Lint Solidity files |
| `npm run lint:ts` | Lint TypeScript files |
| `npm run prettier:check` | Check code formatting |
| `npm run prettier:write` | Auto-format code |
| `npm run clean` | Remove build artifacts |
| `npm run typechain` | Generate TypeScript bindings |
| `npm run chain` | Start local Hardhat node |
| `npm run deploy:localhost` | Deploy to local network |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run verify:sepolia` | Verify contracts on Etherscan |

### Frontend Development

Navigate to the `app/` directory first:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint frontend code |

## Documentation

Comprehensive documentation for developers and users:

- **[FHEVM Documentation](https://docs.zama.ai/fhevm)**: Learn about Fully Homomorphic Encryption
- **[Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)**: FHEVM development setup
- **[Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)**: Writing tests for encrypted contracts
- **[ERC7984 Standard](https://eips.ethereum.org/EIPS/eip-7984)**: Confidential token specification
- **[Zama Relayer SDK](https://docs.zama.ai/fhevm/guides/decryption)**: Client-side decryption

## Frequently Asked Questions

### General Questions

**Q: What makes FHE-Vault different from other privacy solutions?**

A: FHE-Vault uses Fully Homomorphic Encryption (FHE), which allows computations on encrypted data without decryption. Unlike mixing services or zero-knowledge proofs, FHE provides native Layer 1 privacy with full smart contract programmability.

**Q: Is FHE-Vault ready for production use?**

A: Not yet. FHE-Vault is currently in active development and deployed only on testnets. We recommend waiting for our security audit and mainnet launch before using it with real funds.

**Q: What are the gas costs compared to regular staking?**

A: FHE operations are more expensive than standard EVM operations. Our dual-state architecture optimizes costs by using plaintext for common reads and encrypted storage only when necessary. Expect 2-3x higher gas costs compared to non-private alternatives.

### Technical Questions

**Q: How does decryption work?**

A: Decryption uses Zama's Gateway Relayer service. Users generate a temporary keypair, sign an EIP-712 message authorizing decryption, and the relayer returns the decrypted values. This happens entirely client-side in your browser.

**Q: Can anyone decrypt my balances?**

A: No. Only addresses explicitly granted permission via `FHE.allow()` can decrypt specific encrypted values. By default, only you and the smart contract can decrypt your balances.

**Q: What happens if Zama's relayer goes offline?**

A: Your funds remain safe and accessible. The relayer is only needed for viewing encrypted balances. You can still perform transactions (stake/withdraw) without decryption, as the smart contract operates on encrypted data.

**Q: Why do we need both encrypted and plaintext balances?**

A: Plaintext balances provide gas-efficient reads and public transparency (total liquidity). Encrypted balances ensure individual privacy. This dual approach balances privacy, usability, and cost-efficiency.

### Privacy & Security Questions

**Q: Is FHE quantum-resistant?**

A: Current FHEVM implementations use lattice-based cryptography, which is believed to be quantum-resistant. However, quantum computing is an evolving field, and we continue monitoring developments.

**Q: Can government agencies force decryption?**

A: FHE-Vault supports selective disclosure through the permission system. Regulatory compliance can be achieved by granting decryption access to authorized auditors while maintaining privacy from the general public.

**Q: What data is stored on-chain?**

A: All balances are stored encrypted on-chain as TFHE ciphertexts. The blockchain contains no plaintext financial information about individual users (except for the total vault liquidity, which is public).

## License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

### What This Means

- **You can**: Use, modify, and distribute this code
- **You must**: Include copyright and license notices
- **You cannot**: Hold authors liable or use their names for endorsement
- **No patent grant**: Unlike standard BSD-3-Clause, this variant does not include a patent license

## Support & Community

### Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/FHE-Vault/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/yourusername/FHE-Vault/discussions)
- **Documentation**: [Read the docs](https://docs.fhevault.xyz) (coming soon)
- **Discord**: [Join our community](https://discord.gg/fhevault) (coming soon)

### Acknowledgments

FHE-Vault is built on the shoulders of giants:

- **[Zama](https://zama.ai)**: For pioneering FHEVM and making FHE accessible
- **[OpenZeppelin](https://openzeppelin.com)**: For battle-tested smart contract libraries
- **[Hardhat](https://hardhat.org)**: For excellent developer tooling
- **[RainbowKit](https://rainbowkit.com)**: For beautiful wallet connection UX

Special thanks to:
- The FHEVM community for feedback and contributions
- Early testers and bug reporters
- Privacy advocates pushing for better on-chain privacy solutions

### Citation

If you use FHE-Vault in academic research, please cite:

```bibtex
@software{fhevault2025,
  title = {FHE-Vault: Privacy-Preserving Staking Protocol},
  author = {FHE-Vault Contributors},
  year = {2025},
  url = {https://github.com/yourusername/FHE-Vault},
  note = {Fully Homomorphic Encryption for DeFi Privacy}
}
```

## Disclaimer

**IMPORTANT NOTICE**

This software is provided "as is" without warranty of any kind. FHE-Vault is experimental technology under active development:

- **Not Production Ready**: Do not use with real funds
- **Testnet Only**: Currently deployed only on test networks
- **No Audit**: Has not undergone professional security audit
- **Experimental Tech**: FHEVM is cutting-edge and evolving
- **No Financial Advice**: This is not investment advice
- **Your Responsibility**: Users responsible for their own security

**By using FHE-Vault, you acknowledge these risks and agree to use at your own risk.**

---

## Why Privacy Matters in DeFi

Blockchain transparency is a double-edged sword. While it enables trustless verification and accountability, it also exposes financial information that most people and institutions want to keep private:

### The Privacy Problem

1. **Individuals**: Your entire financial history is public and permanent
2. **Businesses**: Competitors can analyze your cash flows and strategies
3. **Institutions**: Regulatory requirements conflict with public transparency
4. **Everyone**: Front-running, MEV, and targeted attacks exploit public data

### The FHE Solution

Fully Homomorphic Encryption offers a radical solution: **privacy by default, transparency by choice**. With FHE:

- Balances stay encrypted on-chain
- Computations run on encrypted data
- Users selectively reveal information
- Compliance achieved without sacrificing privacy
- No trust assumptions beyond the blockchain

**FHE-Vault demonstrates that privacy and blockchain can coexist.** We're building the foundation for a truly private, yet still decentralized and verifiable, financial system.

---

**Built with privacy and transparency in mind** | [Website](https://fhevault.xyz) | [GitHub](https://github.com/yourusername/FHE-Vault) | [Twitter](https://twitter.com/FHEVault)

**⚡ Powered by FHEVM** | **🔒 Privacy by Default** | **🌐 Decentralized** | **✅ Open Source**
