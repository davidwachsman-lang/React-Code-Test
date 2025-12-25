// Custom hooks for CRM Records
import { useApi, useApiMutation } from './useApi';
import crmService from '../services/crmService';

/**
 * Get all CRM records
 */
export const useCRM = () => {
  return useApi(() => crmService.getAll(), []);
};

/**
 * Get all CRM records with customer metrics
 */
export const useCRMWithMetrics = () => {
  return useApi(() => crmService.getAllWithMetrics(), []);
};

/**
 * Get all CRM records with property count
 */
export const useCRMWithPropertyCount = () => {
  return useApi(() => crmService.getAllWithPropertyCount(), []);
};

/**
 * Get CRM records by relationship_stage
 */
export const useCRMByStage = (stage) => {
  return useApi(() => crmService.getByStage(stage), [stage]);
};

/**
 * Get CRM records assigned to current user
 * Note: Requires auth - placeholder for now
 */
export const useMyCRM = (userId) => {
  return useApi(() => userId ? crmService.getBySalesRep(userId) : Promise.resolve([]), [userId]);
};

/**
 * Get top targets
 */
export const useTopTargets = () => {
  return useApi(() => crmService.getTopTargets(), []);
};

/**
 * Get active prospects
 */
export const useActiveProspects = () => {
  return useApi(() => crmService.getActiveProspects(), []);
};

/**
 * Get hot prospects (top targets + near-term followups)
 */
export const useHotProspects = () => {
  return useApi(() => crmService.getHotProspects(), []);
};

/**
 * Get CRM records needing followup
 */
export const useCRMNeedingFollowup = () => {
  return useApi(() => crmService.getNeedingFollowup(), []);
};

/**
 * Get at-risk customers
 */
export const useAtRiskCustomers = () => {
  return useApi(() => crmService.getAtRiskCustomers(), []);
};

/**
 * Get VIP customers (top by lifetime_revenue)
 */
export const useVIPCustomers = (limit = 10) => {
  return useApi(() => crmService.getVIPCustomers(limit), [limit]);
};

/**
 * Get child CRM records
 */
export const useChildCRM = (parentId) => {
  return useApi(() => parentId ? crmService.getChildren(parentId) : Promise.resolve([]), [parentId]);
};

/**
 * Get parent CRM record
 */
export const useParentCRM = (childId) => {
  return useApi(() => childId ? crmService.getParent(childId) : Promise.resolve(null), [childId]);
};

