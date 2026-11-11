import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import './i18n';
import './index.css';
import App from './App';
import { SessionProvider } from './services/session';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <SessionProvider>
      <App />
      <Toaster richColors position="top-right" />
    </SessionProvider>
  </BrowserRouter>,
);
