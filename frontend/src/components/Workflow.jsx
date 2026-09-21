import React from 'react';
import './Workflow.css';

const Workflow = () => {
  return (
    <section className="workflow section-padding bg-light">
      <div className="container">
        <div className="workflow-label mono text-black">THE SHORT ROUTE / 003</div>
        
        <div className="workflow-separator"></div>
        
        <div className="workflow-grid">
          <div className="workflow-step">
            <div className="step-label mono text-black">01 / PASTE</div>
            <h3 className="step-heading text-black">Bring the link.</h3>
            <p className="step-desc">Copy the public URL from the platform you're browsing.</p>
          </div>
          
          <div className="workflow-step">
            <div className="step-label mono text-black">02 / CHOOSE</div>
            <h3 className="step-heading text-black">Pick the cut.</h3>
            <p className="step-desc">Select video or audio, then choose the quality that fits.</p>
          </div>
          
          <div className="workflow-step">
            <div className="step-label mono text-black">03 / KEEP</div>
            <h3 className="step-heading text-black">Take it with you.</h3>
            <p className="step-desc">Your download lands where you expect, ready for the next move.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Workflow;
