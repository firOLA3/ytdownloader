import React, { useState, useEffect } from 'react';
import './DownloadModal.css';

const DownloadModal = ({ videoTitle, videoUrl, format, onClose }) => {
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('initializing'); // initializing, downloading, merging, done, error
  const [fileUrl, setFileUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!format || !videoUrl) return;

    const startDownload = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/download', {
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

    const pollStatus = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/download-status/${jobId}`);
        if (response.ok) {
          const job = await response.json();
          setProgress(job.percent || 0);
          setStatus(job.status);
          if (job.status === 'done') {
            setFileUrl(`http://localhost:5000${job.filePath}`);
            clearInterval(pollStatus);
          } else if (job.status === 'error') {
            setErrorMessage(job.error || 'An error occurred during download.');
            clearInterval(pollStatus);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 1000);

    return () => clearInterval(pollStatus);
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
              <div className="modal-wait-text mono text-neon" style={{marginBottom: '0.5rem', textAlign: 'left'}}>
                {status.toUpperCase()}... {progress}%
              </div>
              <div style={{width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{width: `${progress}%`, height: '100%', backgroundColor: 'var(--text-neon)', transition: 'width 0.3s ease'}} />
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
