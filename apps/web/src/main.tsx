import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import './styles.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('Unable to register the MFS offline app shell.', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: '#315bd6', colorText: '#202938', colorBgContainer: '#ffffff', borderRadius: 10, fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', controlHeight: 40 }, components: { Button: { fontWeight: 600 }, Table: { headerBg: '#f7f8fa', headerColor: '#727c8c', rowHoverBg: '#fafbfc' }, Menu: { itemSelectedBg: '#edf2ff', itemSelectedColor: '#315bd6' } } }}>
      <>
        <App />
        <PwaInstallPrompt />
      </>
    </ConfigProvider>
  </React.StrictMode>,
);
