import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { BrowserRouter } from 'react-router-dom';
import AuthProviderWrapper from './auth/AuthProvider';
import { useAuth } from './auth/AuthProvider';
import { attachAxiosInterceptor } from './auth/axiosMsalInterceptor';

// Attach axios interceptor after auth initialization. We'll attach in a small wrapper below.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProviderWrapper>
        <AppWithInterceptor />
      </AuthProviderWrapper>
    </BrowserRouter>
  </React.StrictMode>
);

// Small wrapper component to attach axios interceptor once auth context is ready.
function AppWithInterceptor() {
  // useAuth lives inside AuthProvider; import inside the component to avoid hook ordering issues
  const { getToken } = useAuth();
  // attach interceptor (idempotent if called multiple times)
  React.useEffect(() => {
    if (getToken) {
      attachAxiosInterceptor(getToken);
    }
  }, [getToken]);

  return <App />;
}
