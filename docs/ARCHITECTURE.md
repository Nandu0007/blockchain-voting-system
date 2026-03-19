# Architecture Guide

## System Overview

The Advanced Blockchain Voting System is built on a modular, scalable architecture supporting multiple blockchain networks, advanced cryptography, and enterprise-level security.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  Dashboard | Campaigns | Voting | Analytics | Admin Panel    │
└────────────────────────┬────────────────────────────────────┘
                         │ (Web3.js / Ethers.js)
                         │
┌────────────────────────▼────────────────────────────────────┐
│            Backend API (Node.js / Express)                   │
│  - Campaign Management                                       │
│  - Voter Authentication & Authorization                      │
│  - Vote Processing & Encryption                              │
│  - Analytics & Reporting                                     │
│  - Audit Trail Management                                    │
└────────────────────────┬────────────────────────────────────┘
                         │ (Web3 Provider)
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Smart Contracts (Solidity / EVM)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ VotingRegistry - Campaign & system management        │   │
│  │ AdvancedBallot - Individual ballot logic             │   │
│  │ VoterRegistry - Voter eligibility & verification     │   │
│  │ VoteDelegation - Delegation management               │   │
│  │ MultiSigVoting - Critical operation approvals        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│      Blockchain Networks (Multi-Chain Support)               │
│  - Ethereum Mainnet / Testnet (Sepolia)                      │
│  - Polygon Mainnet / Mumbai Testnet                          │
│  - Other EVM-compatible chains                               │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│             PostgreSQL Database                              │
│  - Voter profiles & eligibility                              │
│  - Campaign metadata                                         │
│  - Audit logs & transaction records                          │
│  - User authentication & role management                     │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Smart Contracts Layer

#### VotingRegistry.sol
- **Purpose**: Central registry managing voting campaigns and ballot creation
- **Key Functions**:
  - `createCampaign()` - Create new voting campaigns
  - `activateCampaign()` - Activate pending campaigns
  - `pauseCampaign()` - Pause campaigns (reversible)
  - `endCampaign()` - Finalize campaigns
  - `assignRole()` - RBAC: assign admin, voter, auditor roles
  - `verifyVoter()` - Mark voter as eligible

#### AdvancedBallot.sol
- **Purpose**: Individual ballot contract for each voting instance
- **Key Functions**:
  - `castVote()` - Submit encrypted or plain vote
  - `revokeVote()` - Change vote before voting ends
  - `decryptVotes()` - Decrypt homomorphically encrypted votes (admin only)
  - `closeBallot()` - Transition to closed state
  - `finalizeBallot()` - Lock results permanently
  - `grantVoterRole()` / `revokeVoterRole()` - Manage ballot voters

#### VoterRegistry.sol
- **Purpose**: Manage voter registration, eligibility, and verification
- **Key Functions**:
  - `registerVoter()` - Register with government ID hash
  - `verifyVoter()` - Verify eligibility status
  - `assignEligibility()` - Campaign-specific eligibility
  - `suspendVoter()` - Temporarily disable voting rights
  - `canVote()` - Check if voter is eligible

#### VoteDelegation.sol
- **Purpose**: Enable secure vote delegation
- **Key Functions**:
  - `createDelegation()` - Delegate vote to representative
  - `revokeDelegation()` - Revoke delegation before voting
  - `getFinalVoteAuthority()` - Resolve delegation chains (max 5 hops)
  - `getDelegatedVoteCount()` - Count delegated votes

#### MultiSigVoting.sol
- **Purpose**: Multi-signature voting for critical operations
- **Key Functions**:
  - `createProposal()` - Create multi-sig proposal
  - `approveProposal()` - Sign approval
  - `executeProposal()` - Auto-execute when threshold reached
  - `addSigner()` / `removeSigner()` - Manage signers
  - `setRequiredApprovalsCount()` - Adjust threshold

### 2. Backend API Layer

#### Structure
```
backend/
├── src/
│   ├── controllers/
│   │   ├── campaignController.ts
│   │   ├── ballotController.ts
│   │   ├── voterController.ts
│   │   └── analyticsController.ts
│   ├── services/
│   │   ├── blockchainService.ts
│   │   ├── encryptionService.ts
│   │   ├── authService.ts
│   │   └── auditService.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rbac.ts
│   │   └── errorHandler.ts
│   ├── models/
│   │   ├── Campaign.ts
│   │   ├── Voter.ts
│   │   └── Audit.ts
│   └── config/
│       ├── database.ts
│       ├── blockchain.ts
│       └── logger.ts
```

#### Key Services
- **BlockchainService**: Contract interactions via Ethers.js
- **EncryptionService**: Vote encryption/decryption, zero-knowledge proofs
- **AuthService**: JWT, wallet verification, 2FA support
- **AuditService**: Log all voting activities for compliance
- **CampaignService**: Campaign lifecycle management
- **AnalyticsService**: Real-time voting statistics

### 3. Frontend Layer

#### Components
- **Navbar**: Navigation, wallet connection status
- **Dashboard**: Campaign overview, user statistics
- **CampaignCard**: Display campaign details
- **VotingInterface**: Encrypted/plain voting UI
- **Analytics**: Charts, real-time results
- **AdminPanel**: Campaign management, voter verification
- **Footer**: Links, contact information

#### State Management
- **Zustand Store**: Global application state
  - User authentication
  - Connected wallet info
  - User role & permissions
  - Cached campaign data

#### Web3 Integration
- MetaMask wallet connection
- Contract ABIs loaded from backend
- Transaction signing & monitoring
- Event listeners for contract updates

### 4. Database Schema

#### Key Tables
- **users**: Voter accounts, roles, verification status
- **campaigns**: Campaign metadata, status, timeline
- **ballots**: Ballot instances, encryption configuration
- **votes**: Encrypted votes, receipts (voter anonymity preserved)
- **delegations**: Vote delegations, revocation history
- **audit_logs**: All system actions, timestamps, actors
- **multisig_proposals**: Multi-signature voting proposals
- **eligibility**: Campaign-specific voter eligibility

## Data Flow

### Voting Flow
1. **Campaign Creation** (Admin)
   - Admin creates campaign via Registry
   - Deploy AdvancedBallot contract
   - Set start/end times, options

2. **Voter Registration**
   - Voter registers with government ID
   - Backend verifies eligibility
   - Added to VoterRegistry

3. **Voting**
   - Voter connects wallet
   - Frontend fetches ballot from contract
   - Voter selects option(s)
   - Vote encrypted (if enabled)
   - Submitted to AdvancedBallot contract
   - Receipt generated for verification

4. **Vote Decryption** (Encrypted ballots)
   - After voting ends
   - Admin initiates decryption
   - Results aggregated
   - Posted to ballot contract

5. **Finalization**
   - Campaign ends
   - Results locked
   - Audit trail sealed

### Multi-Signature Flow
1. Signer creates proposal
2. Other signers review and approve
3. Auto-executes when threshold reached
4. Logged in MultiSigVoting contract

## Security Architecture

### Cryptography
- **Threshold Encryption**: Homomorphic for vote privacy
- **Zero-Knowledge Proofs**: Verify votes without disclosure
- **Digital Signatures**: All transactions verified
- **Hash commitments**: Ballot option hashing

### Access Control
- **On-chain RBAC**: Smart contract role enforcement
- **JWT Tokens**: Backend API authentication
- **Multi-factor**: Optional 2FA for admin operations
- **Rate limiting**: Prevent brute force attacks

### Audit & Compliance
- **Immutable logs**: All actions recorded on-chain
- **Off-chain logs**: PostgreSQL audit trail
- **Compliance reports**: Generate audit evidence
- **Transaction tracing**: Full vote lifecycle visibility

## Scalability

### Optimization Strategies
- **Vote batching**: Batch multiple votes
- **Off-chain computation**: Heavy calculations off-chain
- **Database indexing**: Fast query performance
- **Caching**: Redis for frequent queries
- **L2 solutions**: Optional Polygon/Arbitrum deployment

### Performance Targets
- Sub-second vote submission
- Real-time result aggregation
- Support 10,000+ concurrent voters
- <100ms API response times

## Deployment Topology

### Development
- Local Hardhat node
- PostgreSQL on localhost
- React dev server on localhost:3000
- Express API on localhost:3001

### Staging
- Sepolia testnet
- Cloud database (AWS/GCP)
- Docker containerization
- CI/CD pipeline

### Production
- Ethereum/Polygon mainnet
- Managed database (redundancy)
- Kubernetes orchestration
- CDN for frontend
- Monitoring & alerting

## Disaster Recovery

- **Contract upgradability**: Proxy pattern for fixes
- **Emergency pause**: Owner can pause voting
- **Data backups**: Daily encrypted backups
- **Rollback procedures**: Tested recovery processes
- **Incident response**: On-call support team

---

**Last Updated**: March 2026
