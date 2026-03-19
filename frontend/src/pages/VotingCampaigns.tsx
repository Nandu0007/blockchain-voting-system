import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../services/api';
import type { Campaign } from '../types/api';

// ── Countdown Timer ──────────────────────────────────────────
interface CountdownParts { d: number; h: number; m: number; s: number; ended: boolean }

function getCountdown(endTime: string): CountdownParts {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, ended: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, ended: false };
}

const CountdownTimer: React.FC<{ endTime: string; status: string }> = ({ endTime, status }) => {
  const [parts, setParts] = useState<CountdownParts>(getCountdown(endTime));

  useEffect(() => {
    if (status !== 'ACTIVE' && status !== 'PENDING') return;
    const id = setInterval(() => setParts(getCountdown(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime, status]);

  if (status === 'ENDED' || status === 'CANCELLED') {
    return <div className="countdown-timer ended">Campaign closed</div>;
  }

  if (parts.ended) {
    return <div className="countdown-timer ended">Voting closed</div>;
  }

  const isEndingSoon = parts.d === 0 && parts.h < 6;

  return (
    <div className={`countdown-timer ${isEndingSoon ? 'ending-soon' : ''}`}>
      <span style={{ fontSize: '0.65rem', marginRight: 2, opacity: 0.6 }}>⏱</span>
      {parts.d > 0 && (
        <>
          <div className="countdown-seg">
            <span className="countdown-seg-val">{parts.d}</span>
            <span className="countdown-seg-lbl">d</span>
          </div>
          <span className="countdown-sep">:</span>
        </>
      )}
      <div className="countdown-seg">
        <span className="countdown-seg-val">{String(parts.h).padStart(2, '0')}</span>
        <span className="countdown-seg-lbl">hr</span>
      </div>
      <span className="countdown-sep">:</span>
      <div className="countdown-seg">
        <span className="countdown-seg-val">{String(parts.m).padStart(2, '0')}</span>
        <span className="countdown-seg-lbl">min</span>
      </div>
      <span className="countdown-sep">:</span>
      <div className="countdown-seg">
        <span className="countdown-seg-val">{String(parts.s).padStart(2, '0')}</span>
        <span className="countdown-seg-lbl">sec</span>
      </div>
    </div>
  );
};

// ── Quick Preview Hover Card ─────────────────────────────────
const QuickPreview: React.FC<{ options: string[] }> = ({ options }) => (
  <div className="quick-preview">
    <p className="quick-preview-title">Ballot Options</p>
    {options.slice(0, 4).map((opt, i) => (
      <div key={i} className="quick-preview-opt">
        <span className="quick-preview-idx">{i + 1}</span>
        <span>{opt}</span>
      </div>
    ))}
    {options.length > 4 && (
      <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
        +{options.length - 4} more options…
      </p>
    )}
  </div>
);

// ── Grid / List toggle icons ─────────────────────────────────
const GridIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);

const ListIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="2" width="14" height="2.5" rx="1"/>
    <rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
    <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
  </svg>
);

const VotingCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Campaign['status']>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'endingSoon' | 'title'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const response = await getCampaigns();
        setCampaigns(response);
      } catch (error) {
        console.error('Failed to load campaigns', error);
      } finally {
        setLoading(false);
      }
    };
    void fetchCampaigns();
  }, []);

  const visibleCampaigns = campaigns
    .filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'endingSoon') return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const encryptedCount = campaigns.filter((c) => c.encryptedVotes).length;

  return (
    <div className="campaigns-page">
      {/* Page header */}
      <h1>Campaigns</h1>
      <p style={{ marginBottom: '1.5rem' }}>
        Browse, filter, and vote on active governance campaigns.
      </p>

      {/* KPI strip */}
      <div className="stats-grid" style={{ marginTop: 0 }}>
        <div className="stat-card">
          <h3>Total Campaigns</h3>
          <p className="stat-number">{campaigns.length}</p>
          <p>All programs</p>
        </div>
        <div className="stat-card">
          <h3>Active Governance</h3>
          <p className="stat-number">{activeCount}</p>
          <p>Accepting votes now</p>
        </div>
        <div className="stat-card">
          <h3>Privacy-Enabled</h3>
          <p className="stat-number">{encryptedCount}</p>
          <p>With encrypted ballots</p>
        </div>
      </div>

      {/* Control bar */}
      <section className="control-bar" style={{ marginBottom: '1.5rem' }}>
        <input
          id="campaign-search"
          type="text"
          placeholder="🔍  Search campaigns by title or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | Campaign['status'])}
          style={{ marginBottom: 0 }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="ENDED">Ended</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 0 }}>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'endingSoon' | 'title')}
            style={{ marginBottom: 0, flex: 1 }}
          >
            <option value="recent">Most Recent</option>
            <option value="endingSoon">Ending Soon</option>
            <option value="title">Title A–Z</option>
          </select>
          {/* Grid / List toggle */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Grid view"
            >
              <GridIcon />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="List view"
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </section>

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          {`Showing ${visibleCampaigns.length} of ${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Campaign list */}
      {loading ? (
        <div className="campaigns-list">
          {[...Array(6)].map((_, i) => <div key={i} className="loading-shimmer" />)}
        </div>
      ) : visibleCampaigns.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🗳️</div>
          <h3>No campaigns found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className={`campaigns-list ${viewMode === 'list' ? 'list-view' : ''}`}>
          {visibleCampaigns.map((campaign, index) => (
            <div
              className="campaign-card"
              key={campaign.id}
              style={{ animationDelay: `${index * 55}ms`, position: 'relative' }}
            >
              {/* Top row: status + encryption badge + ballot type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`status ${campaign.status.toLowerCase()}`}>{campaign.status}</span>
                {campaign.encryptedVotes && <span className="chip chip-indigo">🔒 Encrypted</span>}
                <span className="chip chip-cyan" style={{ marginLeft: 'auto' }}>
                  {campaign.ballotType.replace('_', ' ')}
                </span>
              </div>

              <h3>{campaign.title}</h3>
              <p>{campaign.description}</p>

              {/* Countdown timer */}
              <CountdownTimer endTime={campaign.endTime} status={campaign.status} />

              {/* Quick preview popup on hover */}
              {campaign.options && campaign.options.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <div className="quick-preview-trigger">
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      👁 {campaign.options.length} ballot option{campaign.options.length !== 1 ? 's' : ''} — hover to preview
                    </span>
                    <QuickPreview options={campaign.options} />
                  </div>
                </div>
              )}

              <div className="campaign-meta">
                <span style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>
                  Ends {new Date(campaign.endTime).toLocaleString()}
                </span>
                <Link to={`/ballot/${campaign.id}`} className="btn btn-primary btn-sm">
                  Open Ballot →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VotingCampaigns;
