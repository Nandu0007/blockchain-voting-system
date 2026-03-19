import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-bottom-bar">
      <p>© {currentYear} Blockchain Voting System — Built on Ethereum Sepolia</p>
    </footer>
  );
};

export default Footer;
