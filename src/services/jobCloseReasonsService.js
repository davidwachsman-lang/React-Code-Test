// Job Close Reasons Service - Fetches macro and sub reasons from Supabase
import { supabase } from './supabaseClient';

const jobCloseReasonsService = {
  /**
   * Get all macro reasons
   * @returns {Array} Array of macro reason objects
   */
  async getMacroReasons() {
    try {
      const { data, error } = await supabase
        .from('job_close_macro_reason')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching macro reasons:', error);
      throw error;
    }
  },

  /**
   * Get sub reasons for a specific macro reason
   * @param {number} macroReasonId - The macro reason ID
   * @returns {Array} Array of sub reason objects
   */
  async getSubReasons(macroReasonId) {
    try {
      const { data, error } = await supabase
        .from('job_close_sub_reason')
        .select('*')
        .eq('macro_reason_id', macroReasonId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sub reasons:', error);
      throw error;
    }
  },

  /**
   * Get all sub reasons (for preloading)
   * @returns {Array} Array of all sub reason objects
   */
  async getAllSubReasons() {
    try {
      const { data, error } = await supabase
        .from('job_close_sub_reason')
        .select('*')
        .order('macro_reason_id', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all sub reasons:', error);
      throw error;
    }
  },

  /**
   * Get macro and sub reason labels by IDs
   * @param {number} macroReasonId
   * @param {number} subReasonId
   * @returns {Object} { macroLabel, subLabel }
   */
  async getReasonLabels(macroReasonId, subReasonId) {
    try {
      const [macroResult, subResult] = await Promise.all([
        supabase
          .from('job_close_macro_reason')
          .select('label')
          .eq('id', macroReasonId)
          .single(),
        supabase
          .from('job_close_sub_reason')
          .select('label')
          .eq('id', subReasonId)
          .single()
      ]);

      return {
        macroLabel: macroResult.data?.label || 'N/A',
        subLabel: subResult.data?.label || 'N/A'
      };
    } catch (error) {
      console.error('Error fetching reason labels:', error);
      return {
        macroLabel: 'N/A',
        subLabel: 'N/A'
      };
    }
  }
};

export default jobCloseReasonsService;
