# Blockchain Voting System - Development Instructions

## Project Overview
This is a production-ready, enterprise-grade blockchain voting system with advanced features including:
- Smart contracts for secure voting
- Role-based access control
- Vote encryption and privacy
- Multi-signature voting
- Complete audit trails
- Multi-chain deployment support

## Technology Stack
- **Smart Contracts**: Solidity (Ethereum/Polygon)
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Web3.js
- **Database**: PostgreSQL
- **Testing**: Hardhat, Jest, Mocha
- **Deployment**: Hardhat, GitHub Actions

## Development Setup

### Smart Contracts
- Location: `/contracts`
- Deploy: `hardhat run scripts/deploy.js`
- Test: `hardhat test`

### Backend
- Location: `/backend`
- Start: `npm start`
- Test: `npm test`
- Environment: TypeScript with full type safety

### Frontend
- Location: `/frontend`
- Start: `npm start`
- Build: `npm run build`
- Framework: React 18+ with TypeScript

## Key Architectural Patterns
- Smart contract separation of concerns (Registry, Ballot, Delegation)
- Service-oriented backend architecture
- Component-based React frontend
- JWT-based authentication
- Database-backed audit trails
- Event-driven state management

## Common Tasks
- Deploy contracts: `cd contracts && npm run deploy:mainnet`
- Start dev server: `cd backend && npm start`
- Run tests: `npm test` (in any subdirectory)
- Build production: `npm run build`

## Important Notes
- All smart contracts require careful security review
- Database migrations must be run before starting backend
- Frontend environment variables must be set before build
- Multi-chain deployment requires separate configurations
