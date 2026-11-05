import { useEffect, useState } from 'react';
import api from '../api/client';
export function useStatsSection(path) {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: false });
    api.get(path).then(response => {
      if (active) setState({ data: response.data, loading: false, error: false });
    }).catch(() => {
      if (active) setState({ data: null, loading: false, error: true });
    });
    return () => { active = false; };
  }, [path, attempt]);
  useEffect(()=>{if(!path.startsWith('/mood/'))return;const refresh=()=>setAttempt(value=>value+1);window.addEventListener('selfforge:mood-changed',refresh);return()=>window.removeEventListener('selfforge:mood-changed',refresh);},[path]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
