import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { Router } from './app/router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
