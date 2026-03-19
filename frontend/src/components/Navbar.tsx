import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clearSession, issueToken } from '../services/api';
import { useToast } from './Toast';
import type { UserRole } from '../types/api';

interface NavbarProps {
  isConnected: boolean;
  userRole: string;
  onSessionChanged: () => void;
}

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  voter: 'Voter',
  auditor: 'Auditor',
  observer: 'Observer',
};

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <li>
      <Link to={to} className={isActive ? 'active' : ''}>
        {children}
      </Link>
    </li>
  );
};

// Hex-chain SVG logo icon
const LogoIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2L3 6v6l7 4 7-4V6L10 2z"/>
    <path d="M10 22v-6"/>
    <path d="M3 12l7 4 7-4"/>
    <path d="M17 6l4 2v4l-4 2"/>
    <path d="M3 6L1 8v4l2 1"/>
  </svg>
);

// Sun icon for light mode
const SunIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

// Moon icon for dark mode
const MoonIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
  </svg>
);

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const Navbar: React.FC<NavbarProps> = ({ isConnected, userRole, onSessionChanged }) => {
  const toast = useToast();
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('voting-theme');
    return stored !== 'light';
  });
  const walletAddress = localStorage.getItem('voting-wallet') || '';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('voting-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const requestRole = (): UserRole => {
    const roleInput = (
      window.prompt('Select role (admin, voter, auditor, observer):', 'voter') || 'voter'
    ).toLowerCase();
    if (roleInput === 'admin' || roleInput === 'voter' || roleInput === 'auditor' || roleInput === 'observer') {
      return roleInput;
    }
    return 'voter';
  };

  const connectWithoutWallet = async () => {
    const walletAddress = window.prompt('MetaMask not detected. Enter wallet address (0x...):');
    if (!walletAddress) return;
    const normalized = walletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
      toast.error('Invalid address format. Please enter a valid 42-character 0x address.');
      return;
    }
    const role = requestRole();
    await issueToken(normalized, role);
    onSessionChanged();
    toast.success(`Connected as ${roleLabel[role] ?? role}`);
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        await connectWithoutWallet();
        return;
      }
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts.length === 0) return;
      const role = requestRole();
      await issueToken(accounts[0], role);
      onSessionChanged();
      toast.success(`Wallet connected — ${roleLabel[role] ?? role}`);
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  const disconnect = () => {
    clearSession();
    onSessionChanged();
    toast.info('Session ended. Wallet disconnected.');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">
            <LogoIcon />
          </div>
          <h1>Blockchain Voting System</h1>
        </Link>

        {/* Navigation links */}
        <ul className="navbar-menu">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/campaigns">Campaigns</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          {userRole === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </ul>

        {/* Right actions */}
        <div className="navbar-right">
          <div className="security-badge">
            <span className="security-badge-dot" />
            TLS Secured
          </div>

          {/* Dark/Light mode toggle */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {isConnected ? (
            <>
              <button className="btn btn-secondary btn-sm" title={walletAddress}>
                {roleLabel[userRole] || userRole}
                {walletAddress && (
                  <span style={{ opacity: 0.65, fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: '0.7rem' }}>
                    · {truncateAddress(walletAddress)}
                  </span>
                )}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={disconnect}>
                Logout
              </button>
            </>
          ) : (
            <button onClick={connectWallet} className="btn btn-primary btn-sm">
              🔗 Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
