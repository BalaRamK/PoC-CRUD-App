import axios from 'axios';

let _interceptorAttached = false;
// helper to attach an axios interceptor that uses the provided getToken function
export function attachAxiosInterceptor(getToken) {
  if (_interceptorAttached) return;
  _interceptorAttached = true;

  // add request interceptor
  axios.interceptors.request.use(async (config) => {
    try {
      const scopes = [process.env.REACT_APP_API_SCOPE || process.env.REACT_APP_GRAPH_SCOPES];
      const token = await getToken(scopes);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // proceed without token
      console.warn('Could not acquire token for request', e);
    }
    return config;
  }, (error) => Promise.reject(error));
}

export default axios;
