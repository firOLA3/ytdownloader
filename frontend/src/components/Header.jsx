import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeProvider';
import './Header.css';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="header">
      <div className="header-nav container">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>YTDOWNLOADER</Link>
        <nav className="nav-links mono">
          <Link to="/history" className="text-neon">HISTORY</Link>
          <a href="/#how-it-works">HOW IT WORKS</a>
          <a href="/#support">SUPPORT</a>
          <a href="/#faq">FAQ</a>
          <div className="theme-toggle" onClick={toggleTheme}>
            <div className={`theme-toggle-thumb ${theme === 'light' ? 'light' : ''}`}></div>
          </div>
        </nav>
      </div>

      <div className="container">
        <div className="header-ticker bg-neon mono">
          <div className="ticker-content">
            WHAT YOU WANT. WHEN YOU WANT IT. &nbsp;&nbsp;&nbsp; FAST CONVERSION – HIGH QUALITY – NO CLUTTER &nbsp;&nbsp;&nbsp;
            WHAT YOU WANT. WHEN YOU WANT IT. &nbsp;&nbsp;&nbsp; FAST CONVERSION – HIGH QUALITY – NO CLUTTER
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
