// Custom hooks for Properties
import { useApi, useApiMutation } from './useApi';
import propertyService from '../services/propertyService';

/**
 * Get properties for a CRM record
 */
export const useProperties = (crmId) => {
  return useApi(() => crmId ? propertyService.getByCRMId(crmId) : Promise.resolve([]), [crmId]);
};

/**
 * Get properties for a prospect (backward compatibility)
 */
export const usePropertiesByProspectId = (prospectId) => {
  return useProperties(prospectId);
};

/**
 * Get all properties
 */
export const useAllProperties = () => {
  return useApi(() => propertyService.getAll(), []);
};

/**
 * Get property by ID
 */
export const useProperty = (id) => {
  return useApi(() => id ? propertyService.getById(id) : Promise.resolve(null), [id]);
};

/**
 * Create property mutation
 */
export const useCreateProperty = () => {
  return useApiMutation();
};

/**
 * Update property mutation
 */
export const useUpdateProperty = () => {
  return useApiMutation();
};

/**
 * Delete property mutation
 */
export const useDeleteProperty = () => {
  return useApiMutation();
};

