export type CampaignStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED';
export type BallotType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'RANKING';
export type UserRole = 'admin' | 'voter' | 'auditor' | 'observer';

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

export interface CampaignResult {
  optionId: number;
  option: string;
  votes: number;
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

export interface AuthTokenResponse {
  token: string;
  walletAddress: string;
  role: UserRole;
  expiresIn: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta: {
    requestId?: string;
    timestamp: string;
  };
}
