import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import BlogPost from './BlogPost';
import BlogListing from './BlogListing';
import GoogleAnalytics from './components/GoogleAnalytics';

const App = () => {
  return (
    <Router>
      <GoogleAnalytics />
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/blog" element={<BlogListing />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App; 