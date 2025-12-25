// Custom hooks for Prospects
import { useApi, useApiMutation } from './useApi';
import prospectService from '../services/prospectService';

/**
 * Get all prospects
 */
export const useProspects = () => {
  return useApi(() => prospectService.getAll(), []);
};

/**
 * Get all prospects with property count
 */
export const useProspectsWithPropertyCount = () => {
  return useApi(() => prospectService.getAllWithPropertyCount(), []);
};

/**
 * Get single prospect by ID
 */
export const useProspect = (id) => {
  return useApi(() => prospectService.getById(id), [id]);
};

/**
 * Get single prospect with properties and activities
 */
export const useProspectWithRelations = (id) => {
  return useApi(() => prospectService.getByIdWithRelations(id), [id]);
};

/**
 * Get prospects by status
 */
export const useProspectsByStatus = (status) => {
  return useApi(() => prospectService.getByStatus(status), [status]);
};

/**
 * Get prospects assigned to current user
 * Note: Requires auth - placeholder for now
 */
export const useMyProspects = (userId) => {
  return useApi(() => userId ? prospectService.getBySalesRep(userId) : Promise.resolve([]), [userId]);
};

/**
 * Get top 10 targets
 */
export const useTopTargets = () => {
  return useApi(() => prospectService.getTopTargets(), []);
};

/**
 * Get prospects needing followup
 */
export const useProspectsNeedingFollowup = () => {
  return useApi(() => prospectService.getNeedingFollowup(), []);
};

/**
 * Get child prospects
 */
export const useChildProspects = (parentId) => {
  return useApi(() => parentId ? prospectService.getChildren(parentId) : Promise.resolve([]), [parentId]);
};

/**
 * Get parent prospect
 */
export const useParentProspect = (childId) => {
  return useApi(() => childId ? prospectService.getParent(childId) : Promise.resolve(null), [childId]);
};

/**
 * Create prospect mutation
 */
export const useCreateProspect = () => {
  return useApiMutation();
};

/**
 * Update prospect mutation
 */
export const useUpdateProspect = () => {
  return useApiMutation();
};

/**
 * Delete prospect mutation
 */
export const useDeleteProspect = () => {
  return useApiMutation();
};

