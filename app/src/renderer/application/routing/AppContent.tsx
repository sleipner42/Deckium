import React from 'react';
import { useLocation } from 'react-router-dom';
import PresentationEditor from '../components/presentation/PresentationEditor';
import PresentationViewer from '../components/presentation/PresentationViewer';

const AppContent: React.FC = () => {
  const location = useLocation();
  console.log(`Renderer: Location is ${JSON.stringify(location)}`);
  
  const searchParams = new URLSearchParams(location.search);
  console.log(`Renderer: Search params: ${searchParams.toString()}`);
  
  const layout = searchParams.get('layout') || 'editor';
  console.log(`Renderer: Layout is ${layout}`);

  return (
    <>
      {layout === 'editor' ? <PresentationEditor /> : <PresentationViewer />}
    </>
  );
};

export default AppContent; 