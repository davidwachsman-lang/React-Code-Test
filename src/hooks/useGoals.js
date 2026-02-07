import { useApi, useApiMutation } from './useApi';
import goalsService from '../services/goalsService';

export const usePillars = () =>
  useApi(() => goalsService.getPillars(), []);

export const useKeyResults = () =>
  useApi(() => goalsService.getKeyResults(), []);

export const useFinancialTargets = () =>
  useApi(() => goalsService.getFinancialTargets(), []);

export const useInitiatives = () =>
  useApi(() => goalsService.getInitiatives(), []);

export const useUpdateKeyResult = () => {
  const { mutate, loading, error } = useApiMutation();
  return {
    updateKeyResult: (id, data) => mutate(() => goalsService.updateKeyResult(id, data)),
    loading,
    error,
  };
};

export const useUpdateFinancialTarget = () => {
  const { mutate, loading, error } = useApiMutation();
  return {
    updateTarget: (id, data) => mutate(() => goalsService.updateFinancialTarget(id, data)),
    loading,
    error,
  };
};

export const useUpdateInitiative = () => {
  const { mutate, loading, error } = useApiMutation();
  return {
    updateInitiative: (id, data) => mutate(() => goalsService.updateInitiative(id, data)),
    loading,
    error,
  };
};
