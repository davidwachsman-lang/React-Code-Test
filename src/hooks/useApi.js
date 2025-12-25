// Custom React Hook for API Calls with Loading and Error States
import { useState, useEffect } from 'react';

/**
 * Custom hook for making API calls with automatic loading and error handling
 * 
 * @param {Function} apiFunction - The API service function to call
 * @param {Array} dependencies - Dependencies array for useEffect
 * @returns {Object} { data, loading, error, refetch }
 * 
 * @example
 * const { data: estimates, loading, error, refetch } = useApi(
 *   () => estimateService.getAll(),
 *   []
 * );
 */
export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData 
  };
};

/**
 * Custom hook for API mutations (POST, PUT, DELETE)
 * 
 * @returns {Object} { mutate, loading, error, data }
 * 
 * @example
 * const { mutate: saveEstimate, loading, error } = useApiMutation();
 * 
 * const handleSave = async () => {
 *   await saveEstimate(() => estimateService.create(data));
 * };
 */
export const useApiMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = async (apiFunction) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('API Mutation Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    mutate, 
    loading, 
    error, 
    data,
    reset: () => {
      setError(null);
      setData(null);
    }
  };
};

/**
 * Example Usage in a Component:
 * 
 * import { useApi, useApiMutation } from '../hooks/useApi';
 * import { estimateService } from '../services';
 * 
 * function EstimateList() {
 *   // Fetch data on mount
 *   const { data: estimates, loading, error, refetch } = useApi(
 *     () => estimateService.getAll(),
 *     [] // dependencies
 *   );
 * 
 *   // Mutation for creating/updating
 *   const { mutate: saveEstimate, loading: saving } = useApiMutation();
 * 
 *   const handleSave = async () => {
 *     try {
 *       await saveEstimate(() => estimateService.create(formData));
 *       alert('Saved successfully!');
 *       refetch(); // Refresh the list
 *     } catch (error) {
 *       alert('Failed to save: ' + error.message);
 *     }
 *   };
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 * 
 *   return (
 *     <div>
 *       {estimates.map(estimate => (
 *         <div key={estimate.id}>{estimate.name}</div>
 *       ))}
 *       <button onClick={handleSave} disabled={saving}>
 *         {saving ? 'Saving...' : 'Save'}
 *       </button>
 *     </div>
 *   );
 * }
 */
