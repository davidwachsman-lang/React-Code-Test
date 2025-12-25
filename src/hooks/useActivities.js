// Custom hooks for CRM Activities
import { useApi, useApiMutation } from './useApi';
import crmActivityService from '../services/crmActivityService';

/**
 * Get activities for a CRM record
 */
export const useActivities = (crmId) => {
  return useApi(() => crmId ? crmActivityService.getByCRMId(crmId) : Promise.resolve([]), [crmId]);
};

/**
 * Get activities for a prospect (backward compatibility)
 */
export const useActivitiesByProspectId = (prospectId) => {
  return useActivities(prospectId);
};

/**
 * Get all activities
 */
export const useAllActivities = () => {
  return useApi(() => crmActivityService.getAll(), []);
};

/**
 * Get recent activities across all CRM records
 */
export const useRecentActivities = (limit = 50) => {
  return useApi(() => crmActivityService.getRecentActivities(limit), [limit]);
};

/**
 * Get activity by ID
 */
export const useActivity = (id) => {
  return useApi(() => id ? crmActivityService.getById(id) : Promise.resolve(null), [id]);
};

/**
 * Create activity mutation
 */
export const useCreateActivity = () => {
  return useApiMutation();
};

/**
 * Update activity mutation
 */
export const useUpdateActivity = () => {
  return useApiMutation();
};

/**
 * Delete activity mutation
 */
export const useDeleteActivity = () => {
  return useApiMutation();
};

