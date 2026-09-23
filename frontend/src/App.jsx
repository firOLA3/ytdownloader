import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import ResultStage from './components/ResultStage';
import History from './components/History';
import Features from './components/Features';
import Workflow from './components/Workflow';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleStartDownload = async (url) => {
    if (!url) return;
    
    setIsLoading(true);
    setFetchError(false);
    setVideoUrl(url);

    const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
    try {
      const response = await fetch(`${API_BASE}/api/fetch-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch video info');
      }

      const data = await response.json();
      setVideoData(data);
      // Navigate seamlessly to /convert once data arrives
      navigate('/convert');
    } catch (error) {
      console.error(error);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header />
      <main>
        <Routes>
          <Route 
            path="/" 
            element={<Hero onStartDownload={handleStartDownload} isLoading={isLoading} fetchError={fetchError} />} 
          />
          <Route 
            path="/convert" 
            element={
              videoData ? (
                <ResultStage videoData={videoData} videoUrl={videoUrl} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route path="/history" element={<History />} />
        </Routes>
        <Features />
        <Workflow />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
