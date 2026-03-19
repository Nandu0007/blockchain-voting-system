import React, { useEffect, useState } from 'react';
import {
  createCampaign,
  getCurrentRole,
  getApiErrorMessage,
  getCampaigns,
  getVoters,
  hasAuthSession,
  issueToken,
  registerVoter,
  suspendVoter,
  updateCampaignStatus,
  verifyVoter,
} from '../services/api';
import type { Campaign, CampaignStatus, UserRole, VoterProfile } from '../types/api';

const Admin: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('voting-wallet') || '');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [tokenIsError, setTokenIsError] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [voters, setVoters] = useState<VoterProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  const [campaignForm, setCampaignForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    ballotType: 'SINGLE_CHOICE' as 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'RANKING',
    encryptedVotes: false,
    options: 'Yes,No',
    chainId: 11155111,
  });

  const [voterForm, setVoterForm] = useState({
    walletAddress: '',
    governmentIdHash: '',
    role: 'voter' as UserRole,
  });

  const loadAdminData = async () => {
    try {
      setBusy(true);
      const campaignData = await getCampaigns();
      setCampaigns(campaignData);
      if (hasAuthSession()) {
        const role = getCurrentRole();
        if (role === 'admin' || role === 'auditor') {
          const voterData = await getVoters();
          setVoters(voterData);
        } else {
          setVoters([]);
          setMessage(`Role '${role || 'unknown'}' cannot access voter admin APIs. Use admin/auditor token.`);
          setMessageIsError(true);
        }
      } else {
        setVoters([]);
        setMessage('No admin token found. Issue a token below to load voter administration data.');
        setMessageIsError(false);
      }
    } catch (error) {
      setMessage(getApiErrorMessage(error));
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const handleIssueToken = async () => {
    try {
      setTokenMessage(null);
      const data = await issueToken(walletAddress, selectedRole);
      setTokenIsError(false);
      setTokenMessage(`Token issued for ${data.walletAddress} with role: ${data.role}`);
      await loadAdminData();
    } catch (error) {
      setTokenIsError(true);
      setTokenMessage(getApiErrorMessage(error));
    }
  };

  const handleCreateCampaign = async () => {
    try {
      setMessage(null);
      await createCampaign({
        ...campaignForm,
        options: campaignForm.options
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      });
      setMessageIsError(false);
      setMessage('Campaign created successfully.');
      await loadAdminData();
    } catch (error) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(error));
    }
  };

  const handleStatusChange = async (campaignId: string, status: CampaignStatus) => {
    try {
      setMessage(null);
      await updateCampaignStatus(campaignId, status);
      await loadAdminData();
    } catch (error) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(error));
    }
  };

  const handleRegisterVoter = async () => {
    try {
      setMessage(null);
      await registerVoter(voterForm);
      setMessageIsError(false);
      setMessage('Voter registered successfully.');
      await loadAdminData();
    } catch (error) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(error));
    }
  };

  const handleVerify = async (wallet: string, verified: boolean) => {
    try {
      setMessage(null);
      await verifyVoter(wallet, verified);
      await loadAdminData();
    } catch (error) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(error));
    }
  };

  const handleSuspend = async (wallet: string, suspended: boolean) => {
    try {
      setMessage(null);
      await suspendVoter(wallet, suspended);
      await loadAdminData();
    } catch (error) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(error));
    }
  };

  const statusColors: Record<CampaignStatus, string> = {
    ACTIVE: 'var(--clr-accent-4)',
    PENDING: 'var(--clr-accent-warn)',
    PAUSED: 'var(--clr-accent-3)',
    ENDED: 'rgba(255,255,255,0.35)',
    CANCELLED: 'var(--clr-accent-err)',
  };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p>Campaign governance, voter operations, and privileged access controls in a secured environment.</p>

      {/* Global message */}
      {message && (
        <div className={`message-box ${messageIsError ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* ── Session Token ── */}
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-icon">🔑</div>
          <h2>Session Token Management</h2>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Issue a signed JWT for a wallet address and role to run privileged API operations.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', maxWidth: 520 }}>
          <input
            type="text"
            placeholder="0x... wallet address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            style={{ marginBottom: 0 }}
          >
            <option value="admin">admin</option>
            <option value="voter">voter</option>
            <option value="auditor">auditor</option>
            <option value="observer">observer</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleIssueToken}>
            🔏 Issue Token
          </button>
          <button className="btn btn-secondary" onClick={() => void loadAdminData()}>
            🔄 Refresh Data
          </button>
        </div>
        {tokenMessage && (
          <div className={`message-box ${tokenIsError ? 'error' : 'success'}`} style={{ marginTop: '0.75rem' }}>
            {tokenMessage}
          </div>
        )}
      </div>

      {/* ── Create Campaign ── */}
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-icon">📣</div>
          <h2>Create Campaign</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: 700 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <input placeholder="Campaign Title" value={campaignForm.title}
              onChange={(e) => setCampaignForm((f) => ({ ...f, title: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <input placeholder="Description" value={campaignForm.description}
              onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Time (ISO 8601)</p>
            <input type="text" placeholder="2026-03-20T09:00:00.000Z" value={campaignForm.startTime}
              onChange={(e) => setCampaignForm((f) => ({ ...f, startTime: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>End Time (ISO 8601)</p>
            <input type="text" placeholder="2026-03-21T09:00:00.000Z" value={campaignForm.endTime}
              onChange={(e) => setCampaignForm((f) => ({ ...f, endTime: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ballot Type</p>
            <select value={campaignForm.ballotType}
              onChange={(e) => setCampaignForm((f) => ({ ...f, ballotType: e.target.value as 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'RANKING' }))} style={{ marginBottom: 0 }}>
              <option value="SINGLE_CHOICE">Single Choice</option>
              <option value="MULTI_CHOICE">Multi Choice</option>
              <option value="RANKING">Ranking</option>
            </select>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chain ID</p>
            <input type="number" value={campaignForm.chainId}
              onChange={(e) => setCampaignForm((f) => ({ ...f, chainId: Number(e.target.value) || 0 }))} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <input placeholder="Options (comma-separated): Yes, No, Abstain" value={campaignForm.options}
              onChange={(e) => setCampaignForm((f) => ({ ...f, options: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="encryptedVotes" checked={campaignForm.encryptedVotes}
              onChange={(e) => setCampaignForm((f) => ({ ...f, encryptedVotes: e.target.checked }))} style={{ width: 'auto' }} />
            <label htmlFor="encryptedVotes" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              🔒 Enable Encrypted Votes
            </label>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCreateCampaign} style={{ marginTop: '1rem' }}>
          📣 Create Campaign
        </button>
      </div>

      {/* ── Campaign Controls ── */}
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-icon">⚙️</div>
          <h2>Campaign Controls</h2>
        </div>
        {busy ? (
          <div>
            <div className="loading-shimmer" style={{ minHeight: 80, marginBottom: '0.5rem' }} />
            <div className="loading-shimmer" style={{ minHeight: 80 }} />
          </div>
        ) : campaigns.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>No campaigns found. Create one above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius-md)',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#fff', fontWeight: 600, marginBottom: '2px' }}>{campaign.title}</p>
                  <span className={`status ${campaign.status.toLowerCase()}`}>{campaign.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(campaign.id, 'ACTIVE')}>
                    ▶ Active
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(campaign.id, 'PAUSED')}>
                    ⏸ Pause
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(campaign.id, 'ENDED')}>
                    ⏹ End
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Register Voter ── */}
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-icon">👤</div>
          <h2>Register Voter</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', maxWidth: 680 }}>
          <input type="text" placeholder="Wallet Address (0x...)" value={voterForm.walletAddress}
            onChange={(e) => setVoterForm((f) => ({ ...f, walletAddress: e.target.value }))} style={{ marginBottom: 0 }} />
          <input type="text" placeholder="Government ID Hash" value={voterForm.governmentIdHash}
            onChange={(e) => setVoterForm((f) => ({ ...f, governmentIdHash: e.target.value }))} style={{ marginBottom: 0 }} />
          <select value={voterForm.role}
            onChange={(e) => setVoterForm((f) => ({ ...f, role: e.target.value as UserRole }))} style={{ marginBottom: 0 }}>
            <option value="voter">voter</option>
            <option value="auditor">auditor</option>
            <option value="observer">observer</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleRegisterVoter} style={{ marginTop: '0.75rem' }}>
          👤 Register Voter
        </button>
      </div>

      {/* ── Voter Administration ── */}
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-icon">🗂️</div>
          <h2>Voter Administration ({voters.length})</h2>
        </div>
        {busy ? (
          <div className="loading-shimmer" style={{ minHeight: 100 }} />
        ) : voters.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>No voters registered or admin access required.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="voter-table">
              <thead>
                <tr>
                  <th>Wallet Address</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Suspended</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((voter) => (
                  <tr key={voter.walletAddress}>
                    <td>
                      <span className="voter-address">
                        {voter.walletAddress.slice(0, 10)}…{voter.walletAddress.slice(-6)}
                      </span>
                    </td>
                    <td>
                      <span className="chip chip-indigo">{voter.role}</span>
                    </td>
                    <td>
                      <span className={`chip ${voter.verified ? 'chip-green' : ''}`}
                        style={!voter.verified ? { color: 'rgba(255,255,255,0.35)', border: '1px solid var(--clr-border)' } : {}}>
                        {voter.verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={voter.suspended ? 'chip' : ''}
                        style={voter.suspended ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' } : { color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>
                        {voter.suspended ? '⚠ Suspended' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => handleVerify(voter.walletAddress, !voter.verified)}>
                          {voter.verified ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          className={`btn btn-sm ${voter.suspended ? 'btn-secondary' : 'btn-danger'}`}
                          onClick={() => handleSuspend(voter.walletAddress, !voter.suspended)}>
                          {voter.suspended ? 'Restore' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
