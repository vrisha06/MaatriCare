import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// GET a resource; returns [data, error, reload].
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null });
  const load = useCallback(() => {
    api(path).then((data) => setState({ data, error: null }), (error) => setState((s) => ({ ...s, error })));
  }, [path]);
  useEffect(load, [load]);
  return [state.data, state.error, load];
}

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
