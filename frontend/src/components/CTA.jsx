import React from 'react';
import './CTA.css';

const CTA = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="cta section-padding">
      <div className="container cta-container">
        <div className="cta-label mono text-neon">READY WHEN YOU ARE</div>
        <h2 className="cta-title">Your next download starts with a link.</h2>
        <button className="cta-button bg-neon" onClick={scrollToTop}>PASTE A LINK</button>
      </div>
    </section>
  );
};

export default CTA;
