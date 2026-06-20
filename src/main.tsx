import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {isDesktopRuntime} from './platform/desktop.ts';

document.documentElement.dataset.runtime = isDesktopRuntime() ? 'desktop' : 'web';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
