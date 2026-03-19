import axios from 'axios';
import type {
  ApiEnvelope,
  AuthTokenResponse,
  Campaign,
  CampaignResult,
  CampaignStatus,
  UserRole,
  VoteRecord,
  VoterProfile,
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const getAuthToken = () => localStorage.getItem('voting-token');
const getStoredRole = () => localStorage.getItem('voting-role') as UserRole | null;

const hasSession = () => Boolean(getAuthToken());

const authHeader = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requireAuthHeader = () => {
  const headers = authHeader();
  if (!headers.Authorization) {
    throw new Error('Authentication required: connect wallet and issue a token first.');
  }
  return headers;
};

const errorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return 'Unauthorized (401): token missing, invalid, or expired. Please reconnect and issue a new token.';
    }
    if (status === 403) {
      const role = getStoredRole() || 'unknown';
      return `Forbidden (403): role '${role}' is not allowed for this action. Issue a token with the required role.`;
    }
    const apiMessage = error.response?.data?.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.length > 0) {
      return apiMessage;
    }
    return error.message;
  }

  return error instanceof Error ? error.message : 'Unexpected API error';
};

export const getApiErrorMessage = (error: unknown) => errorMessage(error);
export const hasAuthSession = () => hasSession();
export const getCurrentRole = () => getStoredRole();

export const issueToken = async (walletAddress: string, role: 'admin' | 'voter' | 'auditor' | 'observer') => {
  const response = await api.post<ApiEnvelope<AuthTokenResponse>>('/api/v1/auth/token', {
    walletAddress,
    role,
  });
  const data = response.data.data;
  localStorage.setItem('voting-token', data.token);
  localStorage.setItem('voting-role', data.role);
  localStorage.setItem('voting-wallet', data.walletAddress);
  return data;
};

export const clearSession = () => {
  localStorage.removeItem('voting-token');
  localStorage.removeItem('voting-role');
  localStorage.removeItem('voting-wallet');
};

export const getCampaigns = async (status?: string) => {
  const response = await api.get<ApiEnvelope<{ campaigns: Campaign[] }>>('/api/v1/campaigns', {
    params: status ? { status } : undefined,
  });
  return response.data.data.campaigns;
};

export const getCampaign = async (campaignId: string) => {
  const response = await api.get<ApiEnvelope<{ campaign: Campaign }>>(`/api/v1/campaigns/${campaignId}`);
  return response.data.data.campaign;
};

export const getCampaignResults = async (campaignId: string) => {
  const response = await api.get<ApiEnvelope<{ results: CampaignResult[] }>>(`/api/v1/campaigns/${campaignId}/results`);
  return response.data.data.results;
};

export const castVote = async (
  campaignId: string,
  payload: { selectedOptionIds: number[]; encryptedPayload?: string },
) => {
  const response = await api.post<ApiEnvelope<{ vote: VoteRecord }>>(
    `/api/v1/campaigns/${campaignId}/votes`,
    payload,
    {
      headers: requireAuthHeader(),
    },
  );
  return response.data.data.vote;
};

export const createCampaign = async (payload: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  ballotType: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'RANKING';
  encryptedVotes: boolean;
  options: string[];
  chainId: number;
}) => {
  const response = await api.post<ApiEnvelope<{ campaign: Campaign }>>('/api/v1/campaigns', payload, {
    headers: requireAuthHeader(),
  });
  return response.data.data.campaign;
};

export const updateCampaignStatus = async (campaignId: string, status: CampaignStatus) => {
  const response = await api.patch<ApiEnvelope<{ campaign: Campaign }>>(
    `/api/v1/campaigns/${campaignId}/status`,
    { status },
    {
      headers: requireAuthHeader(),
    },
  );
  return response.data.data.campaign;
};

export const getVoters = async () => {
  const response = await api.get<ApiEnvelope<{ voters: VoterProfile[] }>>('/api/v1/voters', {
    headers: requireAuthHeader(),
  });
  return response.data.data.voters;
};

export const registerVoter = async (payload: {
  walletAddress: string;
  governmentIdHash: string;
  role: UserRole;
}) => {
  const response = await api.post<ApiEnvelope<{ voter: VoterProfile }>>('/api/v1/voters', payload, {
    headers: requireAuthHeader(),
  });
  return response.data.data.voter;
};

export const verifyVoter = async (walletAddress: string, verified: boolean) => {
  const response = await api.patch<ApiEnvelope<{ voter: VoterProfile }>>(
    `/api/v1/voters/${walletAddress}/verify`,
    { verified },
    {
      headers: requireAuthHeader(),
    },
  );
  return response.data.data.voter;
};

export const suspendVoter = async (walletAddress: string, suspended: boolean) => {
  const response = await api.patch<ApiEnvelope<{ voter: VoterProfile }>>(
    `/api/v1/voters/${walletAddress}/suspend`,
    { suspended },
    {
      headers: requireAuthHeader(),
    },
  );
  return response.data.data.voter;
};
