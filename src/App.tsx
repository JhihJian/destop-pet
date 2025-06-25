import React from 'react';
import Live2DViewer from './components/Live2DViewer';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="desktop-pet-container">
      <Live2DViewer />
    </div>
  );
};

export default App;
