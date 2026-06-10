import { useState, useEffect, useCallback } from 'react';

export function getHashPath(): string {
  const hash = window.location.hash.slice(1) || '/dashboard';
  return hash.split('?')[0];
}

export function getHashParams(): URLSearchParams {
  const hash = window.location.hash.slice(1) || '';
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(qIdx + 1));
}

export function navigate(path: string, params?: Record<string, string>) {
  let hash = path;
  if (params && Object.keys(params).length > 0) {
    hash += '?' + new URLSearchParams(params).toString();
  }
  window.location.hash = hash;
}

export function useRoute() {
  const [path, setPath] = useState(getHashPath);
  const [params, setParams] = useState(getHashParams);

  const update = useCallback(() => {
    setPath(getHashPath());
    setParams(getHashParams());
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [update]);

  return { path, params };
}
