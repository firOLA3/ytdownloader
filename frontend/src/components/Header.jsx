import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeProvider';
import { Menu, X } from 'lucide-react';
import './Header.css';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-nav container">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>YTDOWNLOADER</Link>
        
        <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`nav-links mono ${isMenuOpen ? 'nav-open' : ''}`}>
          <Link to="/history" className="text-neon" onClick={() => setIsMenuOpen(false)}>HISTORY</Link>
          <a href="/#how-it-works" onClick={() => setIsMenuOpen(false)}>HOW IT WORKS</a>
          <a href="/#support" onClick={() => setIsMenuOpen(false)}>SUPPORT</a>
          <a href="/#faq" onClick={() => setIsMenuOpen(false)}>FAQ</a>
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
