import React from 'react';
import { ArrowDownCircle } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <>
      <div className="footer-status mono container">
        <span className="text-neon">• SERVICE ONLINE / 99.98% UPTIME</span>
        <span className="footer-status-right text-gray">GLOBAL EDGE / 21 SEPT 2026</span>
      </div>
      <footer className="footer bg-neon">
        <div className="footer-content container">
        <div className="footer-logo">YTDOWNLOADER</div>
        <div className="footer-center mono">USE RESPONSIBLY / PUBLIC CONTENT ONLY</div>
        <div className="footer-icon">
          <ArrowDownCircle size={32} strokeWidth={1.5} />
        </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
