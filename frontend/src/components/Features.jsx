import React from 'react';
import './Features.css';
import useScrollReveal from '../hooks/useScrollReveal';

const Features = () => {
  useScrollReveal();
  return (
    <section className="features section-padding bg-dark-green" id="how-it-works">
      <div className="container">
        <div className="features-header reveal">
          <div className="mono text-neon">DOWNLOAD DESK / 002</div>
          <h2 className="features-title">Built for the files you actually keep.</h2>
        </div>
        
        <div className="features-grid">
          <div className="feature-card reveal delay-100">
            <div className="feature-number mono text-neon">01</div>
            <h3 className="feature-heading">Every useful format.</h3>
            <p className="feature-desc">MP4, MP3, and quality options that are easy to understand before you commit.</p>
          </div>
          
          <div className="feature-card reveal delay-200">
            <div className="feature-number mono text-neon">02</div>
            <h3 className="feature-heading">Fast by default.</h3>
            <p className="feature-desc">A clean workflow that starts with the link and leaves room for nothing else.</p>
          </div>
          
          <div className="feature-card reveal delay-300">
            <div className="feature-number mono text-neon">03</div>
            <h3 className="feature-heading">No account required.</h3>
            <p className="feature-desc">There's no dashboard to create or profile to maintain. Just paste and go.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
