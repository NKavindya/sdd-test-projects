import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toast } from '@heroui/react';
import './i18n';
import './index.css';
import App from './App';
import { SessionProvider } from './services/session';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename="/store">
    <SessionProvider>
      <App />
      <Toast.Provider placement="top end" />
    </SessionProvider>
  </BrowserRouter>,
);
