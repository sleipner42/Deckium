import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-PCHYQ322C3';
    document.head.appendChild(script1);

    // Initialize Google Analytics
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'G-PCHYQ322C3');

    // Track page views
    const trackPageView = () => {
      gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    };

    trackPageView();

    return () => {
      // Cleanup
      document.head.removeChild(script1);
    };
  }, [location]);

  return null;
};

export default GoogleAnalytics; 