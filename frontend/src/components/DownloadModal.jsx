import React, { useState, useEffect } from 'react';
import './DownloadModal.css';

const DownloadModal = ({ videoTitle, videoUrl, format, onClose }) => {
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('initializing');
  const [fileUrl, setFileUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [speed, setSpeed] = useState('');
  const [eta, setEta] = useState('');

  useEffect(() => {
    if (!format || !videoUrl) return;

    const startDownload = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE}/api/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: videoUrl,
            formatId: format.formatId,
            type: format.originalType,
            title: videoTitle
          })
        });

        if (!response.ok) throw new Error('Failed to start download');
        const data = await response.json();
        setJobId(data.jobId);
      } catch (err) {
        console.error(err);
        setStatus('error');
        setErrorMessage('Could not initiate download on the server.');
      }
    };

    startDownload();
  }, [format, videoUrl, videoTitle]);

  useEffect(() => {
    if (!jobId || status === 'done' || status === 'error') return;

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const eventSource = new EventSource(`${API_BASE}/api/download-stream/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const job = JSON.parse(event.data);
        setProgress(job.percent || 0);
        setStatus(job.status);
        if (job.speed) setSpeed(job.speed);
        if (job.eta) setEta(job.eta);
        
        if (job.status === 'done') {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          setFileUrl(`${API_BASE}${job.filePath}`);
          eventSource.close();
        } else if (job.status === 'error') {
          setErrorMessage(job.error || 'An error occurred during download.');
          eventSource.close();
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      eventSource.close();
      if (status !== 'done') {
        setStatus('error');
        setErrorMessage('Lost connection to server.');
      }
    };

    return () => eventSource.close();
  }, [jobId, status]);

  if (!format) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content bg-dark-green">
        <button className="modal-close text-gray" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h3 className="modal-title">{videoTitle}</h3>
        </div>
        
        <div className="modal-body">
          <div className="modal-format-info mono text-neon">
             {format.originalType === 'audio' 
                ? `Audio - ${format.abr ? Math.round(format.abr) + 'kbps' : 'MP3'}` 
                : `${format.ext.toUpperCase()} - ${format.resolution || format.height + 'p'}`}
          </div>
          
          {status === 'initializing' && (
            <div className="modal-wait-text mono text-white">
              INITIALIZING DOWNLOAD JOB...
            </div>
          )}

          {(status === 'downloading' || status === 'merging') && (
            <div style={{width: '100%'}}>
              <div className="modal-wait-text mono text-neon" style={{marginBottom: '0.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between'}}>
                <span>{status.toUpperCase()}... {progress}%</span>
                {speed && <span>{speed}/s | ETA: {eta || 'Unknown'}</span>}
              </div>
              <div style={{width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent-neon)', transition: 'width 0.1s linear'}} />
              </div>
            </div>
          )}

          {status === 'done' && fileUrl && (
             <a href={fileUrl} download className="modal-download-btn bg-neon" style={{textDecoration: 'none', display: 'block'}}>
               SAVE FILE
             </a>
          )}

          {status === 'error' && (
             <div className="modal-wait-text mono text-neon" style={{color: '#ff4444'}}>
               ERROR: {errorMessage}
             </div>
          )}
          
          <p className="modal-thank-you text-gray" style={{marginTop: '1rem'}}>
            Thank you for using our service. If you could share our website with your friends, that would be a huge help. <strong className="text-white">Thank you.</strong>
          </p>
          
          <div className="modal-tip text-gray">
            <strong className="text-white">Tip:</strong> Insert "<strong className="text-neon">sos</strong>" before the word "youtube" in the link to download videos and mp3 files from YouTube as a faster way.
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="modal-close-btn text-white" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
