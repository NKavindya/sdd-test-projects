import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import 'antd/dist/reset.css';
import './theme/store.less';
import App from './App';
createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/store">
    <App />
  </BrowserRouter>,
);
