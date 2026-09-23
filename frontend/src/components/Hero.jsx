import React, { useState, useEffect } from 'react';
import './Hero.css';

const Hero = ({ onStartDownload, isLoading, fetchError }) => {
  const [url, setUrl] = useState('');
  const [emojiIndex, setEmojiIndex] = useState(0);

  const smilingEmojis = ['🙂', '😊', '😀', '😃', '😄', '😁'];

  // Check if it's a valid URL string to trigger auto-fetch
  const isValidUrl = (str) => {
    return str.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)/i);
  };

  // Watch for changes (handles drag-and-drop or auto-fill)
  useEffect(() => {
    if (url && isValidUrl(url) && !isLoading) {
      onStartDownload(url);
    }
  }, [url]);

  // Animate emojis while loading
  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setEmojiIndex((prev) => (prev + 1) % smilingEmojis.length);
      }, 500); // Change emoji every 500ms
    } else {
      setEmojiIndex(0); // Reset when not loading
    }
    
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleStart = () => {
    if (url) onStartDownload(url);
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('Text');
    if (pastedText && isValidUrl(pastedText)) {
      setUrl(pastedText);
      onStartDownload(pastedText);
    }
  };

  return (
    <section className="hero section-padding">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">Download the moment</h1>
          <p className="hero-subtitle mono">
            No limits. No ads. Just raw uncompressed power. <br/>
            Paste any link below to extract video and audio streams instantly.
          </p>
        </div>
        
        <div className="hero-input-area">
          <input 
            type="text" 
            className="hero-input mono" 
            placeholder="Paste a YouTube, TikTok, or Instagram link..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={handlePaste}
            disabled={isLoading}
          />
          <button 
            className="hero-button bg-neon" 
            onClick={handleStart}
            disabled={isLoading || !url}
          >
            {isLoading ? (
              <div className="loader-container">
                <span className="spinner"></span>
                <span className="blinking-text mono">FETCHING... {smilingEmojis[emojiIndex]}</span>
              </div>
            ) : fetchError ? (
              <div className="error-container">
                <span className="mono">FETCH FAILED 😞</span>
              </div>
            ) : (
              'START DOWNLOAD'
            )}
          </button>

          {fetchError && (
            <div className="error-detail mono" role="alert">
              <span className="text-neon">{fetchError.message}</span>
              {fetchError.hint && <span className="text-gray">{fetchError.hint}</span>}
              <span className="text-gray">[{fetchError.code}]</span>
            </div>
          )}
        </div>
        
        <div className="hero-supported mono">
          <span className="text-gray">SUPPORTED:</span>
          <span>YOUTUBE</span>
          <span className="text-gray">/</span>
          <span>INSTAGRAM</span>
          <span className="text-gray">/</span>
          <span>TIKTOK</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
