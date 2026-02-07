// Scorecard Service - Supabase queries for Performance Scorecards
import { supabase, handleSupabaseResult } from './supabaseClient';

const SCORECARDS_TABLE = 'sales_rep_scorecards';
const SETTINGS_TABLE = 'scorecard_settings';

const scorecardService = {
  // Get all scorecards
  async getAllScorecards() {
    const response = await supabase
      .from(SCORECARDS_TABLE)
      .select('*')
      .order('sales_rep_name', { ascending: true });
    return handleSupabaseResult(response);
  },

  // Get scorecard by sales rep name and effective date
  async getScorecardBySalesRep(salesRepName, effectiveDate = null) {
    if (!salesRepName || salesRepName.trim() === '') {
      return null;
    }
    
    try {
      let query = supabase
        .from(SCORECARDS_TABLE)
        .select('*')
        .eq('sales_rep_name', salesRepName);
      
      if (effectiveDate) {
        query = query.eq('effective_date', effectiveDate);
      } else {
        // Get the most recent one
        query = query.order('effective_date', { ascending: false }).limit(1);
      }
      
      const response = await query.maybeSingle();
      
      // Check if there's an error or no data
      if (response.error) {
        if (response.error.code === 'PGRST116') {
          // No rows returned - this is fine, return null
          return null;
        }
        throw new Error(response.error.message);
      }
      
      const result = response.data;
      
      // If no result or result has empty string id, return null
      if (!result || (result.id === '' || result.id === null || result.id === undefined)) {
        return null;
      }
      
      return result;
    } catch (error) {
      console.error('Error getting scorecard by sales rep:', error);
      return null;
    }
  },

  // Create new scorecard
  async createScorecard(data) {
    const response = await supabase
      .from(SCORECARDS_TABLE)
      .insert([data])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update scorecard
  async updateScorecard(id, data) {
    if (!id || id === '' || id === null || id === undefined) {
      throw new Error('Invalid scorecard ID');
    }
    const response = await supabase
      .from(SCORECARDS_TABLE)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Upsert scorecard (create or update)
  async upsertScorecard(data) {
    const response = await supabase
      .from(SCORECARDS_TABLE)
      .upsert(data, {
        onConflict: 'sales_rep_name,effective_date'
      })
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Get settings
  async getSettings() {
    const response = await supabase
      .from(SETTINGS_TABLE)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const result = handleSupabaseResult(response);
    
    // If no settings exist, return defaults
    if (!result) {
      return {
        effective_date: new Date().toISOString().split('T')[0],
        qualifying_target: 2000000.00,
        bonus_percentage: 0.0050
      };
    }
    
    return result;
  },

  // Update settings
  async updateSettings(data) {
    // Get existing settings ID or create new
    const existing = await this.getSettings();
    
    if (existing && existing.id) {
      const response = await supabase
        .from(SETTINGS_TABLE)
        .update(data)
        .eq('id', existing.id)
        .select()
        .single();
      return handleSupabaseResult(response);
    } else {
      const response = await supabase
        .from(SETTINGS_TABLE)
        .insert([data])
        .select()
        .single();
      return handleSupabaseResult(response);
    }
  },

  // Get all distinct sales reps from CRM records (same as CRM table uses)
  async getAllSalesReps() {
    try {
      console.log('Fetching sales reps from crm_records...');
      const response = await supabase
        .from('crm_records')
        .select('primary_sales_rep');
      
      if (response.error) {
        console.error('Error fetching sales reps:', response.error);
        throw new Error(response.error.message);
      }
      
      const records = response.data || [];
      console.log('Raw CRM records with sales reps:', records.length);
      
      // Get unique sales rep names (same logic as CRM table)
      // Filter out empty strings, null, undefined
      const uniqueReps = [...new Set(
        records
          .map(r => r?.primary_sales_rep)
          .filter(rep => rep && typeof rep === 'string' && rep.trim() !== '')
      )];
      
      console.log('Unique sales reps found:', uniqueReps);
      return uniqueReps.sort();
    } catch (error) {
      console.error('Error getting sales reps:', error);
      return [];
    }
  },

  // Calculate KPI metrics for a sales rep (via Postgres RPC)
  async calculateKPIMetrics(salesRepName, effectiveDate = null) {
    if (!salesRepName || salesRepName.trim() === '') {
      return { kpi1_actual_referrals: 0, kpi2_actual_clients: 0, kpi3_total_clients: 0, kpi3_visited_clients: 0 };
    }
    try {
      const { data, error } = await supabase.rpc('calculate_kpi_metrics', { p_sales_rep: salesRepName });
      if (error) throw error;
      return data || { kpi1_actual_referrals: 0, kpi2_actual_clients: 0, kpi3_total_clients: 0, kpi3_visited_clients: 0 };
    } catch (error) {
      console.error(`Error calculating KPI metrics for ${salesRepName}:`, error);
      return { kpi1_actual_referrals: 0, kpi2_actual_clients: 0, kpi3_total_clients: 0, kpi3_visited_clients: 0 };
    }
  },

  // Get scorecard data with calculated metrics for all sales reps
  async getAllScorecardsWithMetrics(effectiveDate = null) {
    try {
      const salesReps = await this.getAllSalesReps();
      console.log('Sales reps found:', salesReps);
      
      if (!salesReps || salesReps.length === 0) {
        console.warn('No sales reps found');
        return [];
      }
      
      const settings = await this.getSettings();
      const useDate = effectiveDate || settings.effective_date;
      
      const scorecards = await Promise.all(
        salesReps.map(async (repName) => {
          if (!repName || repName.trim() === '') {
            return null;
          }
          
          try {
            // Get existing scorecard data
            const existing = await this.getScorecardBySalesRep(repName, useDate);
            
            // Calculate actual metrics
            const metrics = await this.calculateKPIMetrics(repName, useDate);
            console.log(`Metrics for ${repName}:`, metrics);
            
            // Ensure id is valid UUID or null (not empty string)
            const scorecardId = existing?.id && existing.id !== '' && existing.id !== null ? existing.id : null;
            
            return {
              sales_rep_name: repName,
              effective_date: useDate,
              qualifying_target: existing?.qualifying_target || settings.qualifying_target,
              forecasted_referrals: existing?.forecasted_referrals || null,
              target_additional_clients: existing?.target_additional_clients || null,
              kpi1_actual_referrals: metrics.kpi1_actual_referrals || 0,
              kpi2_actual_clients: metrics.kpi2_actual_clients || 0,
              kpi3_total_clients: metrics.kpi3_total_clients || 0,
              kpi3_visited_clients: metrics.kpi3_visited_clients || 0,
              kpi1_rating: existing?.kpi1_rating || null,
              kpi1_comments: existing?.kpi1_comments || null,
              kpi2_rating: existing?.kpi2_rating || null,
              kpi2_comments: existing?.kpi2_comments || null,
              kpi3_rating: existing?.kpi3_rating || null,
              kpi3_comments: existing?.kpi3_comments || null,
              overall_rating: existing?.overall_rating || null,
              overall_comments: existing?.overall_comments || null,
              id: scorecardId
            };
          } catch (error) {
            console.error(`Error getting scorecard for ${repName}:`, error);
            // Return a basic scorecard structure even if there's an error
            try {
              const metrics = await this.calculateKPIMetrics(repName, useDate);
              return {
                sales_rep_name: repName,
                effective_date: useDate,
                qualifying_target: settings.qualifying_target,
                forecasted_referrals: null,
                target_additional_clients: null,
                kpi1_actual_referrals: metrics.kpi1_actual_referrals || 0,
                kpi2_actual_clients: metrics.kpi2_actual_clients || 0,
                kpi3_total_clients: metrics.kpi3_total_clients || 0,
                kpi3_visited_clients: metrics.kpi3_visited_clients || 0,
                kpi1_rating: null,
                kpi1_comments: null,
                kpi2_rating: null,
                kpi2_comments: null,
                kpi3_rating: null,
                kpi3_comments: null,
                overall_rating: null,
                overall_comments: null,
                id: null
              };
            } catch (metricsError) {
              console.error(`Error calculating metrics for ${repName}:`, metricsError);
              return {
                sales_rep_name: repName,
                effective_date: useDate,
                qualifying_target: settings.qualifying_target,
                forecasted_referrals: null,
                target_additional_clients: null,
                kpi1_actual_referrals: 0,
                kpi2_actual_clients: 0,
                kpi3_total_clients: 0,
                kpi3_visited_clients: 0,
                kpi1_rating: null,
                kpi1_comments: null,
                kpi2_rating: null,
                kpi2_comments: null,
                kpi3_rating: null,
                kpi3_comments: null,
                overall_rating: null,
                overall_comments: null,
                id: null
              };
            }
          }
        })
      );
      
      // Filter out any null results
      const validScorecards = scorecards.filter(sc => sc !== null);
      console.log('Valid scorecards:', validScorecards);
      return validScorecards;
    } catch (error) {
      console.error('Error in getAllScorecardsWithMetrics:', error);
      return [];
    }
  }
};

export default scorecardService;

