import React, { useState, useEffect } from 'react';
import './History.css';
import { Download, Clock, Video, Music } from 'lucide-react';
import { apiUrl } from '../lib/api';

const History = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(apiUrl('/api/history'));
      if (!response.ok) throw new Error('Failed to fetch history');
      
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
      setError('Could not load history. Ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="history-page section-padding">
      <div className="container">
        <h2 className="history-title">DOWNLOAD <span className="text-neon">HISTORY</span></h2>
        <p className="history-subtitle mono">A chronological log of all your successful local extractions.</p>
        
        {isLoading && (
          <div className="history-loader mono">
            <span className="spinner"></span> FETCHING LOGS...
          </div>
        )}

        {error && (
          <div className="history-error mono border-neon">
            [ERROR]: {error}
          </div>
        )}

        {!isLoading && !error && history.length === 0 && (
          <div className="history-empty mono">
            NO DOWNLOADS FOUND IN THE DATABASE.
          </div>
        )}

        {!isLoading && !error && history.length > 0 && (
          <div className="history-table-container">
            <table className="history-table mono">
              <thead>
                <tr>
                  <th>TYPE</th>
                  <th>TITLE</th>
                  <th>FORMAT</th>
                  <th>DATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id}>
                    <td className="type-col">
                      {item.type === 'video' ? <Video size={18} /> : <Music size={18} />}
                      <span className="type-label">{item.type.toUpperCase()}</span>
                    </td>
                    <td className="title-col">
                      <div className="truncate-title" title={item.title}>{item.title}</div>
                      <a href={item.originalUrl} target="_blank" rel="noreferrer" className="original-url text-gray">
                        {item.originalUrl.substring(0, 30)}...
                      </a>
                    </td>
                    <td className="format-col">
                      <span className="format-badge border-neon">{item.formatChosen}</span>
                    </td>
                    <td className="date-col">
                      <Clock size={14} className="text-gray"/> 
                      {formatDate(item.date)}
                    </td>
                    <td className="action-col">
                      <a 
                        href={item.filePath ? apiUrl(item.filePath) : '#'} 
                        download 
                        className="history-download-btn"
                        title="Download again"
                      >
                        <Download size={18} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
