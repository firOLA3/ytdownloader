import React, { useState } from 'react';
import './ResultStage.css';
import DownloadModal from './DownloadModal';

const ResultStage = ({ videoData, videoUrl }) => {
  const [activeTab, setActiveTab] = useState('Video');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(null);
  
  if (!videoData) return null;

  const handleDownloadClick = (format, type) => {
    setSelectedFormat({ ...format, originalType: type });
    setIsModalOpen(true);
  };

  const renderTable = (formats, type) => {
    if (!formats || formats.length === 0) {
      return <div className="text-gray mono" style={{padding: '2rem'}}>No {type} formats available.</div>;
    }
    
    return (
      <table className="format-table">
        <thead>
          <tr className="mono">
            <th>File type</th>
            <th>Format</th>
            <th>Size</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {formats.map((item, idx) => {
            const formatStr = type === 'audio' ? 'Auto (MP3)' : item.ext;
            let typeStr = '';
            if (type === 'audio') {
              typeStr = `Audio - ${item.abr ? Math.round(item.abr) + 'kbps' : 'Unknown'}`;
            } else {
              typeStr = `${item.ext.toUpperCase()} - ${item.resolution || item.height + 'p'}`;
            }
            
            const sizeStr = item.filesize ? (item.filesize / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown';

            return (
              <tr key={idx}>
                <td className="text-white">{typeStr}</td>
                <td className="text-gray">{formatStr}</td>
                <td className="text-gray">{sizeStr}</td>
                <td>
                  <button 
                    className="table-btn bg-neon" 
                    onClick={() => handleDownloadClick(item, type)}
                  >
                    DOWNLOAD
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <section className="result-stage section-padding">
      <div className="container">
        <div className="result-label mono text-neon">RESULT DESK / 004</div>
        <div className="result-content bg-dark-green">
          
          <div className="result-video-info">
            <div className="result-thumbnail">
              {videoData.thumbnail ? (
                <img src={videoData.thumbnail} alt="Thumbnail" style={{width: '100%', aspectRatio: '16/9', objectFit: 'cover'}} />
              ) : (
                <div className="thumbnail-placeholder bg-light text-black">
                  <span className="mono">NO THUMBNAIL</span>
                </div>
              )}
            </div>
            <h2 className="result-video-title">{videoData.title || 'Unknown Title'}</h2>
          </div>

          <div className="result-formats">
            <div className="format-tabs mono">
              {['Video', 'Audio'].map(tab => (
                <button 
                  key={tab}
                  className={`format-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="format-table-container">
              {activeTab === 'Video' && renderTable(videoData.videoFormats, 'video')}
              {activeTab === 'Audio' && renderTable(videoData.audioFormats, 'audio')}
            </div>
          </div>
          
        </div>
      </div>
      
          {isModalOpen && (
            <DownloadModal 
              videoTitle={videoData.title} 
              videoUrl={videoUrl}
              format={selectedFormat}
              playerClient={videoData.clientUsed}
              onClose={() => setIsModalOpen(false)} 
            />
          )}
    </section>
  );
};

export default ResultStage;
