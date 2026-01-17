// ============================================
// REACT ENTRY POINT
// ============================================
// This is where React starts. It takes our App component
// and renders it into the DOM (the HTML page).

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Find the 'root' div in index.html
const rootElement = document.getElementById('root');

// Create a React root and render our App
const root = ReactDOM.createRoot(rootElement);

root.render(
  // StrictMode helps catch common mistakes during development
  // It runs certain checks twice (only in development, not production)
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
