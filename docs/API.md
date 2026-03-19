# API Documentation

## Base URL
```
https://api.voting-blockchain.com/api/v1
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Campaigns API

### Create Campaign
```
POST /campaigns
Content-Type: application/json

{
  "title": "2026 Board Election",
  "description": "Annual election for board positions",
  "startTime": 1711000000,
  "endTime": 1711100000,
  "options": ["Option A", "Option B", "Option C"],
  "ballotType": "SINGLE_CHOICE",
  "encryptedVotes": true
}

Response: 201 Created
{
  "campaignId": 1,
  "status": "PENDING",
  "ballotAddress": "0x...",
  "createdAt": "2026-03-19T10:00:00Z"
}
```

### Get Campaigns
```
GET /campaigns?status=ACTIVE&limit=10&offset=0

Response: 200 OK
{
  "campaigns": [
    {
      "id": 1,
      "title": "2026 Board Election",
      "description": "Annual election...",
      "status": "ACTIVE",
      "startTime": 1711000000,
      "endTime": 1711100000,
      "totalVotes": 1234,
      "ballotAddress": "0x...",
      "createdAt": "2026-03-19T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Get Campaign by ID
```
GET /campaigns/:campaignId

Response: 200 OK
{
  "id": 1,
  "title": "2026 Board Election",
  "description": "Annual election...",
  "status": "ACTIVE",
  "creator": "0x...",
  "startTime": 1711000000,
  "endTime": 1711100000,
  "options": ["Option A", "Option B", "Option C"],
  "ballotType": "SINGLE_CHOICE",
  "encryptedVotes": true,
  "ballotAddress": "0x...",
  "createdAt": "2026-03-19T10:00:00Z"
}
```

### Activate Campaign
```
POST /campaigns/:campaignId/activate

Response: 200 OK
{
  "campaignId": 1,
  "status": "ACTIVE",
  "activatedAt": "2026-03-19T10:30:00Z"
}
```

### Pause Campaign
```
POST /campaigns/:campaignId/pause
{
  "reason": "System maintenance"
}

Response: 200 OK
{
  "campaignId": 1,
  "status": "PAUSED",
  "pausedAt": "2026-03-19T10:45:00Z"
}
```

### Resume Campaign
```
POST /campaigns/:campaignId/resume

Response: 200 OK
{
  "campaignId": 1,
  "status": "ACTIVE",
  "resumedAt": "2026-03-19T11:00:00Z"
}
```

### End Campaign
```
POST /campaigns/:campaignId/end

Response: 200 OK
{
  "campaignId": 1,
  "status": "ENDED",
  "endedAt": "2026-03-19T12:00:00Z"
}
```

## Voting API

### Cast Vote
```
POST /votes
Content-Type: application/json

{
  "campaignId": 1,
  "selectedOptions": [0],
  "encryptedVote": "0x...",
  "voterAddress": "0x..."
}

Response: 201 Created
{
  "voteId": "uuidv4",
  "campaignId": 1,
  "receipt": "0x...",
  "receiptHash": "0x...",
  "timestamp": "2026-03-19T11:30:00Z"
}
```

### Get Vote Receipt
```
GET /votes/:receiptHash

Response: 200 OK
{
  "receiptHash": "0x...",
  "campaignId": 1,
  "timestamp": "2026-03-19T11:30:00Z",
  "verified": true
}
```

### Revoke Vote
```
POST /votes/:campaignId/revoke
{
  "voterAddress": "0x..."
}

Response: 200 OK
{
  "campaignId": 1,
  "revokedAt": "2026-03-19T11:45:00Z",
  "message": "Vote successfully revoked"
}
```

### Get Results
```
GET /campaigns/:campaignId/results

Response: 200 OK
{
  "campaignId": 1,
  "status": "FINALIZED",
  "results": [
    {
      "optionId": 0,
      "text": "Option A",
      "votes": 600,
      "percentage": 48.6
    },
    {
      "optionId": 1,
      "text": "Option B",
      "votes": 450,
      "percentage": 36.5
    },
    {
      "optionId": 2,
      "text": "Option C",
      "votes": 184,
      "percentage": 14.9
    }
  ],
  "totalVotes": 1234,
  "finalizedAt": "2026-03-19T12:00:00Z"
}
```

## Voter API

### Register Voter
```
POST /voters
{
  "voterAddress": "0x...",
  "governmentIdHash": "0x...",
  "email": "voter@example.com"
}

Response: 201 Created
{
  "voterId": "uuid",
  "voterAddress": "0x...",
  "status": "PENDING",
  "registeredAt": "2026-03-19T10:00:00Z"
}
```

### Verify Voter
```
POST /voters/:voterId/verify
{
  "verificationData": "..."
}

Response: 200 OK
{
  "voterId": "uuid",
  "voterAddress": "0x...",
  "status": "VERIFIED",
  "verifiedAt": "2026-03-19T10:30:00Z"
}
```

### Get Voter Details
```
GET /voters/:voterAddress

Response: 200 OK
{
  "voterAddress": "0x...",
  "status": "VERIFIED",
  "registeredAt": "2026-03-19T10:00:00Z",
  "isActive": true,
  "eligibleCampaigns": [1, 3, 5]
}
```

### Check Eligibility
```
GET /voters/:voterAddress/eligibility/:campaignId

Response: 200 OK
{
  "voterAddress": "0x...",
  "campaignId": 1,
  "isEligible": true,
  "reason": "Verified and registered"
}
```

## Delegation API

### Create Delegation
```
POST /delegations
{
  "campaignId": 1,
  "delegateAddress": "0x...",
  "voterAddress": "0x..."
}

Response: 201 Created
{
  "delegationId": "uuid",
  "campaignId": 1,
  "delegatedAt": "2026-03-19T10:00:00Z"
}
```

### Get Delegation
```
GET /delegations/:campaignId/:voterAddress

Response: 200 OK
{
  "campaignId": 1,
  "delegatorAddress": "0x...",
  "delegateAddress": "0x...",
  "delegatedAt": "2026-03-19T10:00:00Z",
  "revoked": false
}
```

### Revoke Delegation
```
DELETE /delegations/:campaignId/:voterAddress

Response: 200 OK
{
  "campaignId": 1,
  "revokedAt": "2026-03-19T10:30:00Z"
}
```

## Analytics API

### Get Campaign Statistics
```
GET /analytics/campaigns/:campaignId

Response: 200 OK
{
  "campaignId": 1,
  "totalVotes": 1234,
  "uniqueVoters": 1200,
  "delegatedVotes": 34,
  "revokedVotes": 56,
  "votesByOption": [600, 450, 184],
  "participationRate": 85.6,
  "averageVotingTime": "2.5 minutes",
  "lastUpdated": "2026-03-19T11:59:00Z"
}
```

### Get Real-Time Results
```
GET /analytics/campaigns/:campaignId/live

Response: 200 OK
{
  "campaignId": 1,
  "isLive": true,
  "results": [
    {"optionId": 0, "votes": 600, "percentage": 48.6},
    {"optionId": 1, "votes": 450, "percentage": 36.5},
    {"optionId": 2, "votes": 184, "percentage": 14.9}
  ],
  "lastUpdated": "2026-03-19T11:59:45Z"
}
```

## Audit API

### Get Audit Logs
```
GET /audit-logs?campaignId=1&actor=0x...&limit=50&offset=0

Response: 200 OK
{
  "logs": [
    {
      "id": 1,
      "campaignId": 1,
      "actor": "0x...",
      "action": "CAMPAIGN_CREATED",
      "data": {...},
      "timestamp": "2026-03-19T10:00:00Z"
    }
  ],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```

### Export Audit Trail
```
GET /audit-logs/:campaignId/export?format=csv|json

Response: 200 OK
[Binary CSV/JSON file]
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid campaign ID",
    "details": [
      {"field": "campaignId", "message": "Must be a positive integer"}
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid JWT token"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "requiredRole": "ADMIN"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Campaign not found",
    "campaignId": 999
  }
}
```

### 500 Server Error
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req-123-456"
  }
}
```

## Rate Limiting
- 100 requests per minute for regular users
- 1000 requests per minute for verified API keys
- Returns: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers

## Pagination
All list endpoints support pagination:
- `limit`: Maximum number of results (default: 10, max: 100)
- `offset`: Number of results to skip (default: 0)
- `sort`: Field to sort by (default: createdAt)
- `order`: ASC or DESC (default: DESC)

---

**Last Updated**: March 2026
