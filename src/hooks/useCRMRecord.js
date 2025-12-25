// Custom hooks for single CRM Record operations
import { useApi, useApiMutation } from './useApi';
import crmService from '../services/crmService';

/**
 * Get single CRM record by ID
 */
export const useCRMRecord = (id) => {
  return useApi(() => crmService.getById(id), [id]);
};

/**
 * Get single CRM record with properties and activities
 */
export const useCRMRecordWithRelations = (id) => {
  return useApi(() => crmService.getByIdWithRelations(id), [id]);
};

/**
 * Create CRM record mutation
 */
export const useCreateCRMRecord = () => {
  return useApiMutation();
};

/**
 * Update CRM record mutation
 */
export const useUpdateCRMRecord = () => {
  return useApiMutation();
};

/**
 * Delete CRM record mutation
 */
export const useDeleteCRMRecord = () => {
  return useApiMutation();
};

/**
 * Toggle top target flag mutation
 */
export const useToggleTopTarget = () => {
  return useApiMutation();
};

/**
 * Convert prospect to active customer mutation
 */
export const useConvertToCustomer = () => {
  return useApiMutation();
};

/**
 * Mark CRM record as lost mutation
 */
export const useMarkAsLost = () => {
  return useApiMutation();
};

/**
 * Mark CRM record as inactive mutation
 */
export const useMarkAsInactive = () => {
  return useApiMutation();
};

/**
 * Reactivate CRM record mutation
 */
export const useReactivate = () => {
  return useApiMutation();
};

