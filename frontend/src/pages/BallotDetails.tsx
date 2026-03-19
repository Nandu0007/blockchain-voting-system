import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { castVote, getApiErrorMessage, getCampaign, getCampaignResults } from '../services/api';
import { useToast } from '../components/Toast';
import type { Campaign, CampaignResult, VoteRecord } from '../types/api';

// ── Participation Arc Gauge ────────────────────────────────────
const ParticipationGauge: React.FC<{ pct: number; total: number }> = ({ pct, total }) => {
  const r = 50;
  const stroke = 8;
  const cx = 60;
  const cy = 60;
  const circumference = Math.PI * r; // half circumference for semi-circle
  const arc = circumference * (1 - pct / 100);

  return (
    <div className="participation-gauge-wrap">
      <svg width="120" height="70" viewBox="0 0 120 70" className="participation-gauge-arc">
        {/* Track */}
        <path
          d="M10,60 a50,50 0 0,1 100,0"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M10,60 a50,50 0 0,1 100,0"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={arc}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
          </linearGradient>
        </defs>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="800" fill="rgba(255,255,255,0.85)" fontFamily="Space Grotesk, sans-serif">
          {pct}%
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8"        fill="rgba(255,255,255,0.28)" fontFamily="inherit">
          participation
        </text>
      </svg>
      <div className="participation-gauge-label">{total} total vote{total !== 1 ? 's' : ''} cast</div>
    </div>
  );
};

// ── Animated result bar fill ─────────────────────────────────
const ResultBar: React.FC<{ pct: number }> = ({ pct }) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="result-bar-track">
      <div className="result-bar-fill" style={{ width: `${w}%`, transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
};

// ── Vote Confirmation Modal ────────────────────────────────────
interface ConfirmModalProps {
  selections: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ selections, onConfirm, onCancel }) => (
  <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <div className="modal-box">
      <h3 id="confirm-title">Confirm Your Vote</h3>
      <p>
        You are about to submit your vote to the blockchain. This action is <strong>irreversible</strong>.
        Please review your selection:
      </p>
      <div style={{ marginBottom: '1.25rem' }}>
        {selections.map((s, i) => (
          <div
            key={i}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--clr-border-glow)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 6,
              background: 'rgba(255,255,255,0.05)',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onConfirm} id="confirm-vote-btn">
          🗳️ Confirm &amp; Submit
        </button>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────
const BallotDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [results, setResults] = useState<CampaignResult[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitIsError, setSubmitIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastVote, setLastVote] = useState<VoteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const currentCampaign = await getCampaign(id);
        setCampaign(currentCampaign);
        const campaignResults = await getCampaignResults(id);
        setResults(campaignResults);
      } catch (error) {
        console.error('Failed to load ballot details', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const toggleOption = (optionId: number) => {
    if (!campaign) return;
    if (campaign.ballotType === 'SINGLE_CHOICE') {
      setSelectedOptionIds([optionId]);
      return;
    }
    setSelectedOptionIds((curr) =>
      curr.includes(optionId) ? curr.filter((v) => v !== optionId) : [...curr, optionId],
    );
  };

  const handleSubmitClick = () => {
    if (selectedOptionIds.length === 0) {
      setSubmitIsError(true);
      setSubmitMessage('Please select at least one option before submitting.');
      return;
    }
    setShowConfirm(true);
  };

  const submitVote = async () => {
    setShowConfirm(false);
    if (!id || selectedOptionIds.length === 0) return;
    try {
      setSubmitting(true);
      setSubmitMessage(null);
      const vote = await castVote(id, { selectedOptionIds });
      setLastVote(vote);
      setSubmitIsError(false);
      setSubmitMessage('Vote recorded on-chain successfully.');
      toast.success('Vote recorded on-chain! 🎉');
      const campaignResults = await getCampaignResults(id);
      setResults(campaignResults);
    } catch (error) {
      const msg = getApiErrorMessage(error);
      setSubmitIsError(true);
      setSubmitMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyReceiptHash = async () => {
    if (!lastVote?.receiptHash) return;
    try {
      await navigator.clipboard.writeText(lastVote.receiptHash);
      toast.success('Receipt hash copied to clipboard.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to copy.');
    }
  };

  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);

  if (loading) {
    return (
      <div className="ballot-details-page">
        <div className="loading-shimmer" style={{ minHeight: 300 }} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="ballot-details-page">
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🗳️</div>
          <h3>Ballot not found</h3>
          <p>No ballot found for ID: {id}</p>
        </div>
      </div>
    );
  }

  const canVote = campaign.status === 'ACTIVE' || campaign.status === 'PENDING';
  const selectedLabels = selectedOptionIds.map((idx) => campaign.options[idx]).filter(Boolean);

  return (
    <div className="ballot-details-page">
      {/* Vote Confirm Modal */}
      {showConfirm && (
        <ConfirmModal
          selections={selectedLabels}
          onConfirm={() => void submitVote()}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className={`status ${campaign.status.toLowerCase()}`}>{campaign.status}</span>
          {campaign.encryptedVotes && <span className="chip chip-indigo">🔒 Encrypted Ballot</span>}
          <span className="chip chip-cyan">{campaign.ballotType.replace('_', ' ')}</span>
        </div>
        <h1>{campaign.title}</h1>
        <p>{campaign.description}</p>

        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            marginTop: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>🗓 Opens: {new Date(campaign.startTime).toLocaleString()}</span>
          <span>⏱ Closes: {new Date(campaign.endTime).toLocaleString()}</span>
        </div>
      </div>

      {/* Security info card */}
      <div className="admin-section" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>🔐 Security:</span>
          <span className="security-chip verified">Cryptographic Receipt</span>
          <span className="security-chip verified">Immutable On-Chain Record</span>
          <span className="security-chip verified">Double-Vote Prevention</span>
        </div>
      </div>

      {/* Voting section */}
      {canVote && (
        <section>
          <h2 className="section-h2" style={{ marginBottom: '1rem' }}>Cast Your Vote</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {campaign.ballotType === 'SINGLE_CHOICE'
              ? 'Select exactly one option below.'
              : 'Select one or more options below.'}
          </p>

          {campaign.options.map((option, index) => {
            const isSelected = selectedOptionIds.includes(index);
            const isMulti = campaign.ballotType !== 'SINGLE_CHOICE';
            return (
              <div
                key={option}
                className={`ballot-option ${isSelected ? 'selected' : ''} ${isMulti ? 'multi' : ''}`}
                onClick={() => toggleOption(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleOption(index)}
              >
                <div className="ballot-option-indicator">
                  {isSelected && (
                    <span style={{
                      width: isMulti ? 10 : 8,
                      height: isMulti ? 10 : 8,
                      borderRadius: isMulti ? 2 : '50%',
                      background: '#fff',
                      display: 'block'
                    }} />
                  )}
                </div>
                <span className="ballot-option-label">{option}</span>
              </div>
            );
          })}

          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSubmitClick} disabled={submitting}>
              {submitting ? '⏳ Submitting to Blockchain…' : '🗳️ Submit Vote'}
            </button>
            {selectedOptionIds.length > 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {selectedOptionIds.length} option{selectedOptionIds.length > 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {submitMessage && (
            <div className={`message-box ${submitIsError ? 'error' : 'success'}`} style={{ marginTop: '1rem' }}>
              {submitMessage}
            </div>
          )}

          {lastVote && (
            <div className="receipt-box" style={{ marginTop: '1.25rem' }}>
              <p style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>
                🔐 Cryptographic Vote Receipt
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                Store this hash to verify your vote on-chain at any time.
              </p>
              <div className="mono-text">{lastVote.receiptHash}</div>
              <button className="btn btn-secondary btn-sm" onClick={() => void copyReceiptHash()} style={{ marginTop: '0.75rem' }}>
                📋 Copy Hash
              </button>
            </div>
          )}
        </section>
      )}

      {/* Results section */}
      <section>
        <h2 className="section-h2" style={{ marginBottom: '1.25rem' }}>Live Results</h2>

        {totalVotes > 0 && (
          <ParticipationGauge pct={Math.min(100, totalVotes * 10)} total={totalVotes} />
        )}

        {results.length > 0 ? (
          <div className="result-bar-wrap">
            {results.map((result) => {
              const pct = totalVotes === 0 ? 0 : Math.round((result.votes / totalVotes) * 100);
              return (
                <div key={result.optionId} className="result-bar-item">
                  <div className="result-bar-meta">
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{result.option}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {result.votes} vote{result.votes !== 1 ? 's' : ''} · <strong>{pct}%</strong>
                    </span>
                  </div>
                  <ResultBar pct={pct} />
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Results will appear once votes are cast.
          </p>
        )}
      </section>
    </div>
  );
};

export default BallotDetails;
