import { createHash, randomUUID } from 'crypto';
import type {
  Campaign,
  CampaignStatus,
  CastVoteInput,
  CreateCampaignInput,
  VoteRecord,
} from '../types/models';
import { HttpError } from '../utils/httpError';

class CampaignService {
  private readonly campaigns = new Map<string, Campaign>();
  private readonly votesByCampaign = new Map<string, VoteRecord[]>();

  create(input: CreateCampaignInput, creator: string): Campaign {
    const start = Date.parse(input.startTime);
    const end = Date.parse(input.endTime);

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      throw new HttpError(400, 'Invalid campaign time window');
    }

    if (input.options.length < 2) {
      throw new HttpError(400, 'At least two options are required');
    }

    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      creator: creator.toLowerCase(),
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      status: 'PENDING',
      ballotType: input.ballotType,
      encryptedVotes: input.encryptedVotes,
      options: input.options,
      chainId: input.chainId,
      contractAddress: input.contractAddress,
      createdAt: now,
      updatedAt: now,
    };

    this.campaigns.set(campaign.id, campaign);
    this.votesByCampaign.set(campaign.id, []);
    return campaign;
  }

  list(status?: CampaignStatus): Campaign[] {
    const all = Array.from(this.campaigns.values());
    if (!status) {
      return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return all.filter((campaign) => campaign.status === status);
  }

  getOne(campaignId: string): Campaign {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new HttpError(404, 'Campaign not found');
    }
    return campaign;
  }

  updateStatus(campaignId: string, status: CampaignStatus): Campaign {
    const campaign = this.getOne(campaignId);
    campaign.status = status;
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  castVote(campaignId: string, voter: string, input: CastVoteInput): VoteRecord {
    const campaign = this.getOne(campaignId);
    if (campaign.status !== 'ACTIVE') {
      throw new HttpError(409, 'Campaign is not active');
    }

    const now = Date.now();
    if (now < Date.parse(campaign.startTime) || now > Date.parse(campaign.endTime)) {
      throw new HttpError(409, 'Vote not within campaign time window');
    }

    const invalidOption = input.selectedOptionIds.some((optionId) => optionId < 0 || optionId >= campaign.options.length);
    if (invalidOption) {
      throw new HttpError(400, 'Invalid option selected');
    }

    if (campaign.ballotType === 'SINGLE_CHOICE' && input.selectedOptionIds.length !== 1) {
      throw new HttpError(400, 'Single-choice campaign accepts exactly one option');
    }

    const normalizedVoter = voter.toLowerCase();
    const votes = this.votesByCampaign.get(campaignId) || [];
    const existing = votes.find((vote) => vote.voter === normalizedVoter && !vote.revoked);

    if (existing) {
      existing.revoked = true;
    }

    const timestamp = new Date().toISOString();
    const receiptHash = createHash('sha256')
      .update(`${campaignId}:${normalizedVoter}:${timestamp}:${input.selectedOptionIds.join(',')}`)
      .digest('hex');

    const vote: VoteRecord = {
      id: randomUUID(),
      campaignId,
      voter: normalizedVoter,
      selectedOptionIds: input.selectedOptionIds,
      encryptedPayload: input.encryptedPayload,
      receiptHash,
      timestamp,
      revoked: false,
    };

    votes.push(vote);
    this.votesByCampaign.set(campaignId, votes);
    return vote;
  }

  getCampaignVotes(campaignId: string): VoteRecord[] {
    this.getOne(campaignId);
    return (this.votesByCampaign.get(campaignId) || []).filter((vote) => !vote.revoked);
  }

  getResults(campaignId: string): { optionId: number; option: string; votes: number }[] {
    const campaign = this.getOne(campaignId);
    const votes = this.getCampaignVotes(campaignId);

    if (campaign.encryptedVotes && campaign.status !== 'ENDED') {
      throw new HttpError(403, 'Encrypted campaign results are available after campaign ends');
    }

    const tally = campaign.options.map((option, optionId) => ({
      optionId,
      option,
      votes: 0,
    }));

    for (const vote of votes) {
      for (const selected of vote.selectedOptionIds) {
        tally[selected].votes += 1;
      }
    }

    return tally;
  }
}

export const campaignService = new CampaignService();
