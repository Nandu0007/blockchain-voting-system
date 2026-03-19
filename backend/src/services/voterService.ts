import type { UserRole, VoterProfile } from '../types/models';
import { HttpError } from '../utils/httpError';

class VoterService {
  private readonly voters = new Map<string, VoterProfile>();

  ensureProvisioned(walletAddress: string, role: UserRole): VoterProfile {
    const normalized = walletAddress.toLowerCase();
    const existing = this.voters.get(normalized);

    if (existing) {
      if (existing.role !== role) {
        existing.role = role;
      }
      if (!existing.verified) {
        existing.verified = true;
      }
      existing.updatedAt = new Date().toISOString();
      this.voters.set(normalized, existing);
      return existing;
    }

    const now = new Date().toISOString();
    const voter: VoterProfile = {
      walletAddress: normalized,
      governmentIdHash: `self:${normalized}`,
      verified: true,
      suspended: false,
      role,
      registeredAt: now,
      updatedAt: now,
    };

    this.voters.set(normalized, voter);
    return voter;
  }

  register(walletAddress: string, governmentIdHash: string, role: UserRole = 'voter'): VoterProfile {
    const normalized = walletAddress.toLowerCase();
    if (this.voters.has(normalized)) {
      throw new HttpError(409, 'Voter already registered');
    }

    const now = new Date().toISOString();
    const voter: VoterProfile = {
      walletAddress: normalized,
      governmentIdHash,
      verified: false,
      suspended: false,
      role,
      registeredAt: now,
      updatedAt: now,
    };

    this.voters.set(normalized, voter);
    return voter;
  }

  verify(walletAddress: string, verified: boolean): VoterProfile {
    const voter = this.getOne(walletAddress);
    voter.verified = verified;
    voter.updatedAt = new Date().toISOString();
    this.voters.set(voter.walletAddress, voter);
    return voter;
  }

  suspend(walletAddress: string, suspended: boolean): VoterProfile {
    const voter = this.getOne(walletAddress);
    voter.suspended = suspended;
    voter.updatedAt = new Date().toISOString();
    this.voters.set(voter.walletAddress, voter);
    return voter;
  }

  getOne(walletAddress: string): VoterProfile {
    const normalized = walletAddress.toLowerCase();
    const voter = this.voters.get(normalized);
    if (!voter) {
      throw new HttpError(404, 'Voter not found');
    }
    return voter;
  }

  list(): VoterProfile[] {
    return Array.from(this.voters.values());
  }
}

export const voterService = new VoterService();
