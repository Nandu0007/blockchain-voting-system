import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import VotingCampaigns from './pages/VotingCampaigns';
import BallotDetails from './pages/BallotDetails';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Footer from './components/Footer';
import { ToastProvider } from './components/Toast';
import './App.css';

const AnimatedRoutes: React.FC<{ userRole: string }> = ({ userRole }) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="route-transition">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/campaigns" element={<VotingCampaigns />} />
        <Route path="/ballot/:id" element={<BallotDetails />} />
        <Route path="/analytics" element={<Analytics />} />
        {userRole === 'admin' && <Route path="/admin" element={<Admin />} />}
      </Routes>
    </div>
  );
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState<string>('observer');

  useEffect(() => {
    handleSessionChanged();
    void checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = (await window.ethereum.request({
          method: 'eth_accounts',
        })) as string[];

        const sessionWallet = localStorage.getItem('voting-wallet');
        setIsConnected(accounts.length > 0 || Boolean(sessionWallet));
        if (accounts.length > 0) {
          localStorage.setItem('voting-wallet', accounts[0]);
        }
      } else {
        const sessionWallet = localStorage.getItem('voting-wallet');
        setIsConnected(Boolean(sessionWallet));
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const handleSessionChanged = () => {
    const storedRole = localStorage.getItem('voting-role') || 'observer';
    setUserRole(storedRole);
    setIsConnected(Boolean(localStorage.getItem('voting-wallet')));
  };

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Navbar isConnected={isConnected} userRole={userRole} onSessionChanged={handleSessionChanged} />
          
          <main className="main-content">
            <AnimatedRoutes userRole={userRole} />
          </main>

          <Footer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
