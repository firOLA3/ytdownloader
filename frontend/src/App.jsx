import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import ResultStage from './components/ResultStage';
import Features from './components/Features';
import Workflow from './components/Workflow';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const navigate = useNavigate();

  const handleStartDownload = async (url) => {
    if (!url) return;
    
    setIsLoading(true);
    setVideoUrl(url);

    try {
      const response = await fetch('http://localhost:5000/api/fetch-info', {
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
      alert('Error fetching video information. Please check the URL.');
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
            element={<Hero onStartDownload={handleStartDownload} isLoading={isLoading} />} 
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
