# Blockchain Voting System

Production-oriented blockchain voting platform with Solidity smart contracts, a TypeScript/Express API, and a React dashboard.

## What is implemented

- Smart contracts for:
  - ballot lifecycle and vote receipt generation (`AdvancedBallot.sol`)
  - voter registry (`VoterRegistry.sol`)
  - vote delegation (`VoteDelegation.sol`)
  - multi-sig governance approvals (`MultiSigVoting.sol`)
  - ballot/campaign registry (`VotingRegistry.sol`)
- Backend API (`backend/src`) with:
  - JWT auth token issuance (`/api/v1/auth/token`)
  - role-based access control (`admin`, `voter`, `auditor`, `observer`)
  - campaign CRUD-style lifecycle operations
  - vote casting and campaign result retrieval
  - voter registration / verification / suspension workflows
  - request ID middleware, Joi validation, structured error handling, and audit events
- Frontend app (`frontend/src`) with:
  - wallet + role session bootstrap
  - campaign listing and ballot detail views
  - vote submission with receipt hash feedback
  - analytics summary by campaign status
  - admin controls for token issuance, campaign creation/status, and voter management

## Repository structure

```text
.
├── contracts/
│   ├── AdvancedBallot.sol
│   ├── MultiSigVoting.sol
│   ├── VoteDelegation.sol
│   ├── VoterRegistry.sol
│   ├── VotingRegistry.sol
│   ├── hardhat.config.js
│   ├── package.json
│   └── scripts/deploy.js
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
└── docs/
    ├── API.md
    └── ARCHITECTURE.md
```

## Quick start

### 1) Contracts

```bash
cd contracts
npm install
npx hardhat compile
```

Deploy locally:

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

### 2) Backend

```bash
cd backend
npm install
cp .env.example .env
```

Set at minimum:

```env
JWT_SECRET=replace-with-a-long-secret
PORT=3001
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000
```

Run API:

```bash
npm run dev
```

### 3) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Default API URL is `http://localhost:3001`.

## Key API routes

- `POST /api/v1/auth/token`
- `GET /api/v1/campaigns`
- `POST /api/v1/campaigns` (admin)
- `PATCH /api/v1/campaigns/:campaignId/status` (admin)
- `POST /api/v1/campaigns/:campaignId/votes` (voter/admin)
- `GET /api/v1/campaigns/:campaignId/results`
- `GET /api/v1/voters` (admin/auditor)
- `POST /api/v1/voters` (admin)
- `PATCH /api/v1/voters/:walletAddress/verify` (admin)
- `PATCH /api/v1/voters/:walletAddress/suspend` (admin)

## Production hardening checklist

- Replace in-memory backend service stores with PostgreSQL persistence.
- Use managed secret storage for `JWT_SECRET` and deployment keys.
- Add CI pipelines for contract tests, API tests, and frontend build checks.
- Run independent security review/audit of smart contracts before mainnet deployment.
- Use multi-sig policy and timelock for critical admin actions in production.
