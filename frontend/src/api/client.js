import { CONNECTION_UNCERTAIN, isConnectionFailure } from '../utils/networkStatus';
import axios from 'axios';
import { changesProgress, PROGRESS_CHANGED } from '../utils/progressSync';
import { expireFailedSession } from '../utils/authSession';
import {readRequestId} from '../utils/requestId';

let lastRequestId=null;
export const getLastRequestId=()=>lastRequestId;
const rememberRequestId=response=>{const requestId=readRequestId(response?.headers?.['x-request-id']);if(requestId)lastRequestId=requestId;};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    rememberRequestId(res);
    // Optional UI refresh must never turn a confirmed server save into a failure.
    try {
      if (changesProgress(res.config, localStorage.getItem('sf_token'))) {
        window.dispatchEvent(new Event(PROGRESS_CHANGED));
      }
    } catch { /* Storage can become unavailable after the request was sent. */ }
    return res;
  },
  (err) => {
    rememberRequestId(err.response);
    // This only reveals connection status; it never resends a failed request.
    try {
      if (isConnectionFailure(err) && err.config?.url !== '/health') window.dispatchEvent(new Event(CONNECTION_UNCERTAIN));
    } catch { /* A status notification must not replace the original request error. */ }
    expireFailedSession(err, () => window.localStorage,
      window.location.pathname + window.location.search + window.location.hash,
      path => window.location.assign(path));
    return Promise.reject(err);
  }
);

export default api;
