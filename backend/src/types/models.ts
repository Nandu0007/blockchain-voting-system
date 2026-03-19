export type UserRole = 'admin' | 'voter' | 'auditor' | 'observer';

export type CampaignStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED';
export type BallotType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'RANKING';

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  creator: string;
  startTime: string;
  endTime: string;
  status: CampaignStatus;
  ballotType: BallotType;
  encryptedVotes: boolean;
  options: string[];
  chainId: number;
  contractAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoteRecord {
  id: string;
  campaignId: string;
  voter: string;
  selectedOptionIds: number[];
  encryptedPayload?: string;
  receiptHash: string;
  timestamp: string;
  revoked: boolean;
}

export interface VoterProfile {
  walletAddress: string;
  governmentIdHash: string;
  verified: boolean;
  suspended: boolean;
  role: UserRole;
  registeredAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  targetType: 'CAMPAIGN' | 'VOTE' | 'VOTER' | 'SYSTEM' | 'AUTH';
  targetId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface CreateCampaignInput {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  ballotType: BallotType;
  encryptedVotes: boolean;
  options: string[];
  chainId: number;
  contractAddress?: string;
}

export interface CastVoteInput {
  selectedOptionIds: number[];
  encryptedPayload?: string;
}
