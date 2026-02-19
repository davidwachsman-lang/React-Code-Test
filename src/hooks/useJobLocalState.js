import { useState, useCallback } from 'react';
import { DEFAULT_LOCAL_STATE } from '../constants/jobFileConstants';

// Per-job local state for fields not yet in Supabase.
// keyed by job id — state resets on page reload.
export default function useJobLocalState() {
  const [store, setStore] = useState({});

  const getLocalState = useCallback((jobId) => {
    if (!jobId) return { ...DEFAULT_LOCAL_STATE };
    return store[jobId] || { ...DEFAULT_LOCAL_STATE };
  }, [store]);

  const updateLocalField = useCallback((jobId, field, value) => {
    setStore(prev => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || { ...DEFAULT_LOCAL_STATE }),
        [field]: value,
      },
    }));
  }, []);

  const updateLocalFields = useCallback((jobId, fields) => {
    setStore(prev => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || { ...DEFAULT_LOCAL_STATE }),
        ...fields,
      },
    }));
  }, []);

  return { getLocalState, updateLocalField, updateLocalFields };
}
