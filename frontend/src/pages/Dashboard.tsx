import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../services/api';
import type { Campaign } from '../types/api';

// Animated number counter
const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 900 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <>{display}</>;
};

// Small turnout progress bar
const TurnoutBar: React.FC<{ value: number; label?: string }> = ({ value, label }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(value, 100)), 120);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="turnout-bar">
      <div className="turnout-bar-label">
        <span>{label ?? 'Activity'}</span>
        <span>{value}%</span>
      </div>
      <div className="turnout-bar-track">
        <div className="turnout-bar-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

type SystemEvent = { type: 'created' | 'vote' | 'end'; label: string; time: string };

const Dashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [stats, setStats] = useState({ totalCampaigns: 0, activeCampaigns: 0, totalVotes: 0 });
  const [events, setEvents] = useState<SystemEvent[]>([]);

  const encryptedCampaigns = campaigns.filter((c) => c.encryptedVotes).length;
  const governanceHealth =
    stats.totalCampaigns === 0
      ? 100
      : Math.round(((stats.activeCampaigns + encryptedCampaigns) / (stats.totalCampaigns * 2)) * 100);

  const participationRate =
    stats.totalCampaigns > 0
      ? Math.min(Math.round((stats.activeCampaigns / stats.totalCampaigns) * 100), 100)
      : 0;

  useEffect(() => {
    void fetchData();
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getCampaigns();
      setCampaigns(data);
      const active = data.filter((c: Campaign) => c.status === 'ACTIVE').length;
      setStats({ totalCampaigns: data.length, activeCampaigns: active, totalVotes: 0 });
      setEvents(
        data.slice(0, 4).map((c: Campaign) => ({
          type: c.status === 'ENDED' ? 'end' : c.status === 'ACTIVE' ? 'vote' : 'created',
          label: c.title,
          time: new Date(c.createdAt).toLocaleString(),
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-hero-header">
        <div>
          <h1>Voting Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Blockchain-based voting — Sepolia testnet
          </p>
        </div>
        <div className="dashboard-meta">
          <span className="live-dot" />
          <span>{clock.toUTCString()}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Campaigns</h3>
          <p className="stat-number"><AnimatedNumber value={stats.totalCampaigns} /></p>
          <p>All campaigns</p>
          <TurnoutBar value={participationRate} label="Active rate" />
        </div>
        <div className="stat-card">
          <h3>Active</h3>
          <p className="stat-number"><AnimatedNumber value={stats.activeCampaigns} /></p>
          <p>Accepting votes now</p>
          <TurnoutBar
            value={stats.totalCampaigns > 0 ? Math.round((stats.activeCampaigns / stats.totalCampaigns) * 100) : 0}
            label="Of total"
          />
        </div>
        <div className="stat-card">
          <h3>Encrypted</h3>
          <p className="stat-number"><AnimatedNumber value={encryptedCampaigns} /></p>
          <p>Privacy-enabled ballots</p>
          <TurnoutBar
            value={stats.totalCampaigns > 0 ? Math.round((encryptedCampaigns / stats.totalCampaigns) * 100) : 0}
            label="Coverage"
          />
        </div>
        <div className="stat-card">
          <h3>System Health</h3>
          <p className="stat-number"><AnimatedNumber value={governanceHealth} />%</p>
          <p>Readiness index</p>
          <TurnoutBar value={governanceHealth} label="Score" />
        </div>
      </div>

      {/* Network info */}
      <section>
        <h2 className="section-h2" style={{ marginBottom: '1rem' }}>Network Status</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Status</h3>
            <p className="stat-number" style={{ fontSize: '1.4rem', fontWeight: 600 }}>
              {stats.activeCampaigns > 0 ? 'Live' : 'Idle'}
            </p>
            <p>Based on active campaigns</p>
          </div>
          <div className="stat-card">
            <h3>Network</h3>
            <p className="stat-number" style={{ fontSize: '1.4rem', fontWeight: 600 }}>Ethereum</p>
            <p>Sepolia testnet · Chain ID 11155111</p>
          </div>
          <div className="stat-card">
            <h3>Security</h3>
            <p className="stat-number" style={{ fontSize: '1.4rem', fontWeight: 600 }}>A+</p>
            <p>End-to-end audit trail</p>
          </div>
        </div>
      </section>

      {/* Event log */}
      {events.length > 0 && (
        <section>
          <h2 className="section-h2" style={{ marginBottom: '1rem' }}>Recent Activity</h2>
          <div className="timeline-list">
            {events.map((ev, idx) => (
              <div key={idx} className={`timeline-item event-${ev.type}`}>
                <p><strong>{ev.label}</strong></p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {ev.type === 'created' && 'Campaign created'}
                  {ev.type === 'vote' && 'Voting in progress'}
                  {ev.type === 'end' && 'Campaign ended'}
                  {' · '}{ev.time}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent campaigns */}
      <section className="recent-campaigns">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className="section-h2">Recent Campaigns</h2>
          <Link to="/campaigns" className="btn btn-secondary btn-sm">View all →</Link>
        </div>

        {loading ? (
          <div className="campaigns-list">
            <div className="loading-shimmer" /><div className="loading-shimmer" /><div className="loading-shimmer" />
          </div>
        ) : campaigns.length > 0 ? (
          <div className="campaigns-list">
            {campaigns.slice(0, 6).map((campaign, index) => (
              <div key={campaign.id} className="campaign-card" style={{ animationDelay: `${index * 60}ms` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={`status ${campaign.status.toLowerCase()}`}>{campaign.status}</span>
                  {campaign.encryptedVotes && <span className="chip chip-indigo">Encrypted</span>}
                </div>
                <h3>{campaign.title}</h3>
                <p>{campaign.description}</p>
                <div className="campaign-meta">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Ends {new Date(campaign.endTime).toLocaleDateString()}
                  </span>
                  <Link to={`/ballot/${campaign.id}`} className="btn btn-secondary btn-sm">View →</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div style={{ marginBottom: '1rem', opacity: 0.25 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ display: 'inline-block' }}>
                <rect x="6" y="12" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>No campaigns yet</h3>
            <p>Create a campaign from the admin panel to get started.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
