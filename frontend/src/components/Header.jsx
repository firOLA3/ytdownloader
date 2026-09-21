import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-nav">
        <div className="logo">YTDOWNLOADER</div>
        <nav className="nav-links mono">
          <a href="#how-it-works">HOW IT WORKS</a>
          <a href="#formats">FORMATS</a>
          <a href="#faq">FAQ</a>
        </nav>
      </div>
      
      <div className="header-ticker bg-neon mono">
        <div className="ticker-content">
          WHAT YOU WANT. WHEN YOU WANT IT. &nbsp;&nbsp;&nbsp; FAST CONVERSION – HIGH QUALITY – NO CLUTTER &nbsp;&nbsp;&nbsp;
          WHAT YOU WANT. WHEN YOU WANT IT. &nbsp;&nbsp;&nbsp; FAST CONVERSION – HIGH QUALITY – NO CLUTTER
        </div>
      </div>
    </header>
  );
};

export default Header;
