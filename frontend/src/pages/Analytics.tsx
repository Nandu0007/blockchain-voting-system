import React, { useEffect, useMemo, useState } from 'react';
import { getCampaigns } from '../services/api';
import type { Campaign } from '../types/api';

const GaugeBar: React.FC<{ value: number; color?: string; label: string; sublabel?: string }> = ({
  value,
  color = 'linear-gradient(90deg,#6366f1,#8b5cf6)',
  label,
  sublabel,
}) => (
  <div style={{ marginBottom: '1rem' }}>
    <div className="metric-gauge-label">
      <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
        {value}%
      </span>
    </div>
    {sublabel && (
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: '2px 0 6px' }}>{sublabel}</p>
    )}
    <div className="metric-gauge-track">
      <div className="metric-gauge-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

/* ─── Benchmark data ─────────────────────────────────────── */
type Tier = 'full' | 'partial' | 'none' | 'custom';

interface BenchmarkRow {
  category: string;
  capability: string;
  civitas: { tier: Tier; label: string };
  voatz: { tier: Tier; label: string };
  helios: { tier: Tier; label: string };
  opavote: { tier: Tier; label: string };
  polys: { tier: Tier; label: string };
}

const BENCHMARK_DATA: BenchmarkRow[] = [
  /* ── Security & Cryptography ── */
  {
    category: 'Security & Cryptography',
    capability: 'Role-based access control',
    civitas:  { tier: 'full',    label: '4-tier RBAC (Admin · Voter · Auditor · Observer)' },
    voatz:    { tier: 'partial', label: 'Basic admin/voter split' },
    helios:   { tier: 'partial', label: 'Admin only' },
    opavote:  { tier: 'partial', label: 'Basic roles' },
    polys:    { tier: 'partial', label: 'Partial' },
  },
  {
    category: 'Security & Cryptography',
    capability: 'End-to-end vote encryption',
    civitas:  { tier: 'full',    label: 'AES-256 per-campaign, configurable' },
    voatz:    { tier: 'full',    label: 'Yes (proprietary)' },
    helios:   { tier: 'full',    label: 'El Gamal homomorphic' },
    opavote:  { tier: 'none',    label: 'No ballot encryption' },
    polys:    { tier: 'full',    label: 'Yes' },
  },
  {
    category: 'Security & Cryptography',
    capability: 'Cryptographic vote receipt',
    civitas:  { tier: 'full',    label: 'On-chain SHA-256 receipt hash' },
    voatz:    { tier: 'partial', label: 'Partial — app-level proof' },
    helios:   { tier: 'full',    label: 'Yes — ballot tracker' },
    opavote:  { tier: 'none',    label: 'No receipt' },
    polys:    { tier: 'partial', label: 'Transaction proof only' },
  },
  {
    category: 'Security & Cryptography',
    capability: 'Zero-knowledge proof ready',
    civitas:  { tier: 'full',    label: 'Architecture ZK-compatible' },
    voatz:    { tier: 'none',    label: 'No' },
    helios:   { tier: 'partial', label: 'Partial (verifiable shuffle)' },
    opavote:  { tier: 'none',    label: 'No' },
    polys:    { tier: 'partial', label: 'In roadmap' },
  },
  {
    category: 'Security & Cryptography',
    capability: 'Double-vote prevention',
    civitas:  { tier: 'full',    label: 'JWT session + wallet uniqueness + DB constraint' },
    voatz:    { tier: 'full',    label: 'Yes' },
    helios:   { tier: 'full',    label: 'Yes' },
    opavote:  { tier: 'full',    label: 'Yes' },
    polys:    { tier: 'full',    label: 'Yes' },
  },
  {
    category: 'Security & Cryptography',
    capability: 'TLS / transport security',
    civitas:  { tier: 'full',    label: 'TLS 1.3 enforced' },
    voatz:    { tier: 'full',    label: 'Yes' },
    helios:   { tier: 'full',    label: 'Yes (HTTPS)' },
    opavote:  { tier: 'full',    label: 'Yes' },
    polys:    { tier: 'full',    label: 'Yes' },
  },
  /* ── Blockchain & Decentralization ── */
  {
    category: 'Blockchain & Decentralization',
    capability: 'On-chain vote storage',
    civitas:  { tier: 'full',    label: 'Native Solidity smart contracts (Ethereum)' },
    voatz:    { tier: 'none',    label: 'Centralized database' },
    helios:   { tier: 'none',    label: 'Centralized server' },
    opavote:  { tier: 'none',    label: 'Centralized' },
    polys:    { tier: 'full',    label: 'Polygon blockchain' },
  },
  {
    category: 'Blockchain & Decentralization',
    capability: 'Smart contract extensibility',
    civitas:  { tier: 'full',    label: 'Multi-contract Solidity architecture (Ballot · Delegation · Registry)' },
    voatz:    { tier: 'none',    label: 'Closed proprietary' },
    helios:   { tier: 'none',    label: 'No contracts' },
    opavote:  { tier: 'none',    label: 'No contracts' },
    polys:    { tier: 'partial', label: 'Limited contract hooks' },
  },
  {
    category: 'Blockchain & Decentralization',
    capability: 'MetaMask / Web3 wallet auth',
    civitas:  { tier: 'full',    label: 'MetaMask + fallback manual address entry' },
    voatz:    { tier: 'none',    label: 'No wallet support' },
    helios:   { tier: 'none',    label: 'Email-based only' },
    opavote:  { tier: 'none',    label: 'No wallet support' },
    polys:    { tier: 'full',    label: 'Yes — Metamask & WalletConnect' },
  },
  {
    category: 'Blockchain & Decentralization',
    capability: 'Multi-chain support',
    civitas:  { tier: 'full',    label: 'Configurable chain ID (Mainnet, Sepolia, custom)' },
    voatz:    { tier: 'none',    label: 'N/A' },
    helios:   { tier: 'none',    label: 'N/A' },
    opavote:  { tier: 'none',    label: 'N/A' },
    polys:    { tier: 'none',    label: 'Polygon only' },
  },
  {
    category: 'Blockchain & Decentralization',
    capability: 'Immutable audit trail',
    civitas:  { tier: 'full',    label: 'On-chain transaction hashes + server logs' },
    voatz:    { tier: 'partial', label: 'Internal logs only' },
    helios:   { tier: 'partial', label: 'Verifiable but centralized' },
    opavote:  { tier: 'partial', label: 'Basic server logs' },
    polys:    { tier: 'full',    label: 'On-chain' },
  },
  /* ── Ballot & Voting Features ── */
  {
    category: 'Ballot & Voting Features',
    capability: 'Ballot types supported',
    civitas:  { tier: 'full',    label: 'Single Choice · Multi-Choice · Ranking' },
    voatz:    { tier: 'partial', label: 'Single choice only' },
    helios:   { tier: 'partial', label: 'Single + approval' },
    opavote:  { tier: 'full',    label: 'Multiple types' },
    polys:    { tier: 'full',    label: 'Multiple types' },
  },
  {
    category: 'Ballot & Voting Features',
    capability: 'Vote delegation support',
    civitas:  { tier: 'full',    label: 'On-chain VoteDelegation contract' },
    voatz:    { tier: 'none',    label: 'No' },
    helios:   { tier: 'none',    label: 'No' },
    opavote:  { tier: 'none',    label: 'No' },
    polys:    { tier: 'none',    label: 'No' },
  },
  {
    category: 'Ballot & Voting Features',
    capability: 'Multi-signature governance',
    civitas:  { tier: 'full',    label: 'MultiSigVoting.sol — m-of-n threshold' },
    voatz:    { tier: 'none',    label: 'No' },
    helios:   { tier: 'none',    label: 'No' },
    opavote:  { tier: 'none',    label: 'No' },
    polys:    { tier: 'none',    label: 'No' },
  },
  {
    category: 'Ballot & Voting Features',
    capability: 'Voter eligibility registry',
    civitas:  { tier: 'full',    label: 'VoterRegistry.sol + backend verification + ID hash' },
    voatz:    { tier: 'partial', label: 'ID verification (proprietary)' },
    helios:   { tier: 'partial', label: 'Trustee-based' },
    opavote:  { tier: 'partial', label: 'Email whitelist' },
    polys:    { tier: 'partial', label: 'KYC optional' },
  },
  {
    category: 'Ballot & Voting Features',
    capability: 'Campaign lifecycle management',
    civitas:  { tier: 'full',    label: 'Pending → Active → Paused → Ended → Cancelled' },
    voatz:    { tier: 'partial', label: 'Basic open/close' },
    helios:   { tier: 'partial', label: 'Open / Freeze / Tally' },
    opavote:  { tier: 'full',    label: 'Full lifecycle' },
    polys:    { tier: 'full',    label: 'Full lifecycle' },
  },
  /* ── Administration & Governance ── */
  {
    category: 'Administration & Governance',
    capability: 'Real-time admin dashboard',
    civitas:  { tier: 'full',    label: 'Live KPI cockpit with campaign controls + voter mgmt' },
    voatz:    { tier: 'partial', label: 'Basic admin view' },
    helios:   { tier: 'partial', label: 'Minimal admin' },
    opavote:  { tier: 'full',    label: 'Full admin panel' },
    polys:    { tier: 'full',    label: 'DAO dashboard' },
  },
  {
    category: 'Administration & Governance',
    capability: 'Voter suspension / verification',
    civitas:  { tier: 'full',    label: 'Toggle verify + suspend per wallet' },
    voatz:    { tier: 'partial', label: 'Partial' },
    helios:   { tier: 'none',    label: 'No' },
    opavote:  { tier: 'partial', label: 'Email revocation only' },
    polys:    { tier: 'partial', label: 'Partial' },
  },
  {
    category: 'Administration & Governance',
    capability: 'JWT session management',
    civitas:  { tier: 'full',    label: 'Signed JWT issued per wallet + role — full RBAC' },
    voatz:    { tier: 'partial', label: 'Session tokens (opaque)' },
    helios:   { tier: 'none',    label: 'Cookie sessions' },
    opavote:  { tier: 'none',    label: 'Cookie sessions' },
    polys:    { tier: 'partial', label: 'Web3 session only' },
  },
  /* ── Analytics & Reporting ── */
  {
    category: 'Analytics & Reporting',
    capability: 'Enterprise analytics dashboard',
    civitas:  { tier: 'full',    label: 'Gauge bars · KPI grid · timeline · benchmark table' },
    voatz:    { tier: 'partial', label: 'Post-election summary only' },
    helios:   { tier: 'none',    label: 'Tally results only' },
    opavote:  { tier: 'partial', label: 'Basic charts' },
    polys:    { tier: 'full',    label: 'DAO analytics' },
  },
  {
    category: 'Analytics & Reporting',
    capability: 'Encrypted ballot rate tracking',
    civitas:  { tier: 'full',    label: 'Live % gauge + composite governance score' },
    voatz:    { tier: 'none',    label: 'No' },
    helios:   { tier: 'none',    label: 'No' },
    opavote:  { tier: 'none',    label: 'No' },
    polys:    { tier: 'none',    label: 'No' },
  },
  {
    category: 'Analytics & Reporting',
    capability: 'Animated live result bars',
    civitas:  { tier: 'full',    label: 'Per-option % fill animation + vote counts' },
    voatz:    { tier: 'partial', label: 'Static result display' },
    helios:   { tier: 'partial', label: 'Tally JSON only' },
    opavote:  { tier: 'full',    label: 'Yes' },
    polys:    { tier: 'full',    label: 'Yes' },
  },
  /* ── Infrastructure & Deployment ── */
  {
    category: 'Infrastructure & Deployment',
    capability: 'Open-source / self-hosted',
    civitas:  { tier: 'full',    label: '100% open-source — full control' },
    voatz:    { tier: 'none',    label: 'Closed SaaS only' },
    helios:   { tier: 'full',    label: 'Yes — Python source available' },
    opavote:  { tier: 'none',    label: 'SaaS only' },
    polys:    { tier: 'partial', label: 'Partial open-source' },
  },
  {
    category: 'Infrastructure & Deployment',
    capability: 'REST API access',
    civitas:  { tier: 'full',    label: 'Full REST API (auth · campaigns · voters · votes)' },
    voatz:    { tier: 'none',    label: 'No public API' },
    helios:   { tier: 'full',    label: 'Yes — JSON API' },
    opavote:  { tier: 'partial', label: 'Limited API' },
    polys:    { tier: 'partial', label: 'Partial' },
  },
  {
    category: 'Infrastructure & Deployment',
    capability: 'Hardhat smart contract toolchain',
    civitas:  { tier: 'full',    label: 'Hardhat + deploy scripts + local node' },
    voatz:    { tier: 'none',    label: 'N/A' },
    helios:   { tier: 'none',    label: 'N/A' },
    opavote:  { tier: 'none',    label: 'N/A' },
    polys:    { tier: 'full',    label: 'Yes (Hardhat)' },
  },
  {
    category: 'Infrastructure & Deployment',
    capability: 'TypeScript full-stack',
    civitas:  { tier: 'full',    label: 'React + Node.js — strict TypeScript end-to-end' },
    voatz:    { tier: 'none',    label: 'Unknown (proprietary)' },
    helios:   { tier: 'none',    label: 'Python / JavaScript' },
    opavote:  { tier: 'none',    label: 'Python' },
    polys:    { tier: 'partial', label: 'Partial TS' },
  },
  {
    category: 'Infrastructure & Deployment',
    capability: 'No user / vote limits',
    civitas:  { tier: 'full',    label: 'Unlimited campaigns, voters, and votes' },
    voatz:    { tier: 'none',    label: 'Pricing tiers limit usage' },
    helios:   { tier: 'full',    label: 'Self-hosted = unlimited' },
    opavote:  { tier: 'none',    label: 'Free tier capped at 20 voters' },
    polys:    { tier: 'partial', label: 'Gas cost limits at scale' },
  },
];

const TIER_STYLE: Record<Tier, { color: string; bg: string; border: string }> = {
  full:    { color: 'rgba(255,255,255,0.85)', bg: 'rgba(255,255,255,0.05)',  border: 'rgba(255,255,255,0.14)' },
  partial: { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.03)',  border: 'rgba(255,255,255,0.09)' },
  none:    { color: 'rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.01)', border: 'rgba(255,255,255,0.05)' },
  custom:  { color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.12)' },
};

const TIER_ICON: Record<Tier, string> = {
  full: '●',
  partial: '◐',
  none: '○',
  custom: '◆',
};

const Cell: React.FC<{ tier: Tier; label: string; highlight?: boolean }> = ({ tier, label, highlight }) => {
  const s = TIER_STYLE[tier];
  return (
    <td style={{ padding: highlight ? '0.8rem 1rem' : '0.8rem 1rem', verticalAlign: 'top' }}>
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 3,
          padding: '0.35rem 0.6rem',
          borderRadius: 8,
          background: highlight ? 'rgba(99,102,241,0.1)' : s.bg,
          border: `1px solid ${highlight ? 'rgba(99,102,241,0.3)' : s.border}`,
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: highlight ? '#c7d2fe' : s.color, whiteSpace: 'nowrap' }}>
          {TIER_ICON[tier]} {highlight ? label : label}
        </span>
      </div>
    </td>
  );
};

/* Group rows by category */
const grouped = BENCHMARK_DATA.reduce<Record<string, BenchmarkRow[]>>((acc, row) => {
  if (!acc[row.category]) acc[row.category] = [];
  acc[row.category].push(row);
  return acc;
}, {});

/* ─── Score summary strip ── */
const scoreFor = (col: keyof Omit<BenchmarkRow, 'category' | 'capability'>) => {
  const full = BENCHMARK_DATA.filter((r) => r[col].tier === 'full').length;
  return Math.round((full / BENCHMARK_DATA.length) * 100);
};

const SCORES = [
  { name: 'BVS', score: scoreFor('civitas'), color: 'rgba(255,255,255,0.9)' },
  { name: 'Polys',       score: scoreFor('polys'),   color: 'rgba(255,255,255,0.45)' },
  { name: 'Helios',      score: scoreFor('helios'),  color: 'rgba(255,255,255,0.35)' },
  { name: 'OpaVote',     score: scoreFor('opavote'), color: 'rgba(255,255,255,0.25)' },
  { name: 'Voatz',       score: scoreFor('voatz'),   color: 'rgba(255,255,255,0.2)' },
].sort((a, b) => b.score - a.score);

/* ─── Component ─────────────────────────────────────────────── */
const Analytics: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getCampaigns();
        setCampaigns(data);
      } catch (error) {
        console.error('Failed to load analytics data', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const statusBreakdown = useMemo(() => {
    const counts = { PENDING: 0, ACTIVE: 0, PAUSED: 0, ENDED: 0, CANCELLED: 0 };
    for (const c of campaigns) counts[c.status] += 1;
    return counts;
  }, [campaigns]);

  const advancedMetrics = useMemo(() => {
    const total = campaigns.length;
    const encrypted = campaigns.filter((c) => c.encryptedVotes).length;
    const active = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const ended = campaigns.filter((c) => c.status === 'ENDED').length;
    const encryptedRate = total === 0 ? 0 : Math.round((encrypted / total) * 100);
    const closureRate = total === 0 ? 0 : Math.round((ended / total) * 100);
    const governanceScore = Math.round(encryptedRate * 0.45 + (active > 0 ? 100 : 60) * 0.35 + closureRate * 0.2);
    return { encryptedRate, closureRate, governanceScore, active };
  }, [campaigns]);

  const latestTimeline = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [campaigns],
  );

  return (
    <div className="analytics-page">
      <h1>Enterprise Governance Analytics</h1>
      <p>Performance intelligence, compliance posture, and operational metrics across all voting programs.</p>

      {loading ? (
        <div className="stats-grid">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Campaigns</h3>
              <p className="stat-number">{campaigns.length}</p>
              <p>All governance programs</p>
            </div>
            <div className="stat-card">
              <h3>Active Campaigns</h3>
              <p className="stat-number">{statusBreakdown.ACTIVE}</p>
              <p>Currently live</p>
            </div>
            <div className="stat-card">
              <h3>Ended Programs</h3>
              <p className="stat-number">{statusBreakdown.ENDED}</p>
              <p>Concluded campaigns</p>
            </div>
            <div className="stat-card">
              <h3>Governance Score</h3>
              <p className="stat-number">{advancedMetrics.governanceScore}</p>
              <p>Composite readiness indicator</p>
            </div>
          </div>

          {/* Status breakdown */}
          <section>
            <h2 className="section-h2" style={{ marginBottom: '1rem' }}>Status Breakdown</h2>
            <div className="status-breakdown-grid">
              {Object.entries(statusBreakdown).map(([key, val]) => (
                <div key={key} className="status-breakdown-item">
                  <span className="status-breakdown-count">{val}</span>
                  <span className="status-breakdown-label">{key}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Advanced Metrics */}
          <section>
            <h2 className="section-h2" style={{ marginBottom: '1.25rem' }}>Advanced Metrics</h2>
            <div className="admin-section" style={{ padding: 'var(--spacing-xl)' }}>
              <GaugeBar value={advancedMetrics.encryptedRate} label="Encrypted Ballot Coverage"
                sublabel="% of campaigns using privacy-preserving vote encryption"
                color="linear-gradient(90deg,#8b5cf6,#6366f1)" />
              <GaugeBar value={advancedMetrics.closureRate} label="Program Closure Rate"
                sublabel="% of campaigns that have completed their governance cycle"
                color="linear-gradient(90deg,#06b6d4,#10b981)" />
              <GaugeBar value={advancedMetrics.governanceScore} label="Overall Governance Score"
                sublabel="Weighted composite: encryption (45%) + activity (35%) + closure (20%)"
                color="linear-gradient(90deg,#f59e0b,#f97316)" />
              <div style={{
                marginTop: '1.25rem', padding: '0.85rem 1rem',
                background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem',
                fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)',
              }}>
                <span style={{ fontSize: '1rem' }}>●</span>
                <strong>Operational Signal: </strong>
                {advancedMetrics.active > 0 ? 'Live governance sessions in progress' : 'No active governance sessions'}
              </div>
            </div>
          </section>

          {/* Audit timeline */}
          <section>
            <h2 className="section-h2" style={{ marginBottom: '1.25rem' }}>Audit Timeline</h2>
            {latestTimeline.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>No campaign events recorded yet.</p>
            ) : (
              <div className="timeline-list">
                {latestTimeline.map((c) => (
                  <div key={c.id} className="timeline-item">
                    <p><strong>{c.title}</strong></p>
                    <p>Status: <span className={`status ${c.status.toLowerCase()}`}>{c.status}</span></p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '4px' }}>
                      Updated {new Date(c.updatedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ══════ CAPABILITY BENCHMARK ══════ */}
          <section>
            <div style={{ marginBottom: '1rem' }}>
              <h2 className="section-h2">Full Capability Benchmark</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {BENCHMARK_DATA.length}-point deep-dive comparison vs. Voatz, Polys, Helios, and OpaVote — the four dominant online voting platforms.
              </p>
            </div>

            {/* Score summary strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.5rem',
              marginBottom: '1.5rem',
            }}>
              {SCORES.map((s, i) => (
                <div key={s.name} style={{
                  padding: '0.85rem 1rem',
                  background: i === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,

                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                    background: 'rgba(255,255,255,0.3)',
                    }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.name}
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                      {s.score}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${s.score}%`, borderRadius: 99,
                      background: s.color,
                      animation: 'barFill 1s cubic-bezier(0.4,0,0.2,1) both',
                    }} />
                  </div>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
                    {BENCHMARK_DATA.filter((r) => {
                      const col = (['civitas','polys','helios','opavote','voatz'] as const)[['CivitasVote','Polys','Helios','OpaVote','Voatz'].indexOf(s.name)];
                      return r[col]?.tier === 'full';
                    }).length} / {BENCHMARK_DATA.length} full features
                  </p>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[
                { icon: '●', label: 'Fully Supported', color: 'rgba(255,255,255,0.75)' },
                { icon: '◐', label: 'Partial / Limited', color: 'rgba(255,255,255,0.45)' },
                { icon: '○', label: 'Not Available', color: 'rgba(255,255,255,0.25)' },
              ].map((l) => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: l.color }}>
                  <span>{l.icon}</span>
                  <span style={{ fontWeight: 600 }}>{l.label}</span>
                </div>
              ))}
            </div>

            {/* Main Table */}
            <div className="benchmark-table-wrap" style={{ borderRadius: 'var(--radius-lg)', maxHeight: '75vh', overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontSize: '0.82rem' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ background: '#0d0d18', borderBottom: '1px solid var(--clr-border)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', minWidth: 200 }}>
                      Capability
                    </th>
                    {[
                      { name: 'Blockchain Voting System', highlight: true },
                      { name: 'Voatz', highlight: false },
                      { name: 'Polys', highlight: false },
                      { name: 'Helios', highlight: false },
                      { name: 'OpaVote', highlight: false },
                    ].map(({ name, highlight }) => (
                      <th key={name} style={{
                        padding: '0.85rem 1rem', textAlign: 'left',
                        fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: highlight ? '#fff' : 'rgba(255,255,255,0.35)',
                        background: highlight ? 'rgba(255,255,255,0.04)' : undefined,
                        borderBottom: highlight ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                        minWidth: 180,
                      }}>
                        {highlight ? '⛓ ' : ''}{name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([category, rows]) => (
                    <React.Fragment key={category}>
                      {/* Category separator row */}
                      <tr>
                        <td colSpan={6} style={{
                          padding: '0.6rem 1rem',
                          background: 'rgba(255,255,255,0.02)',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: 'rgba(255,255,255,0.4)',
                        }}>
                          {category}
                        </td>
                      </tr>
                      {rows.map((row, idx) => (
                        <tr key={row.capability} style={{
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                          transition: 'background 150ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')}>
                          {/* Capability name */}
                          <td style={{ padding: '0.8rem 1rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }}>
                            {row.capability}
                          </td>
                          {/* CivitasVote — highlighted column */}
                          <td style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                            <div style={{
                              display: 'inline-flex', flexDirection: 'column', gap: 3,
                              padding: '0.35rem 0.6rem', borderRadius: 8,
                              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)',
                            }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                                {TIER_ICON[row.civitas.tier]} {row.civitas.label}
                              </span>
                            </div>
                          </td>
                          {([row.voatz, row.polys, row.helios, row.opavote] as const).map((col, ci) => (
                            <td key={ci} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                              <div style={{
                                display: 'inline-flex', flexDirection: 'column', gap: 3,
                                padding: '0.35rem 0.6rem', borderRadius: 8,
                                background: TIER_STYLE[col.tier].bg, border: `1px solid ${TIER_STYLE[col.tier].border}`,
                              }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: TIER_STYLE[col.tier].color }}>
                                  {TIER_ICON[col.tier]} {col.label}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom note */}
            <p style={{ marginTop: '0.85rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
              Benchmark data based on publicly documented features of each platform as of Q1 2026. CivitasVote Enterprise is open-source with zero feature caps — all capabilities are fully unlocked.
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default Analytics;
