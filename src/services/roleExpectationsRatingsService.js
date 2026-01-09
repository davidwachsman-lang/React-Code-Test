// Role Expectations Ratings Service - Supabase queries for role expectations ratings
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'role_expectations_ratings';

const roleExpectationsRatingsService = {
  // Get all ratings for a role
  async getRatingsByRole(role) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('role', role)
      .order('expectation_index', { ascending: true });
    return handleSupabaseResult(response);
  },

  // Get rating for a specific expectation
  async getRating(role, expectationIndex) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('role', role)
      .eq('expectation_index', expectationIndex)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Save or update a rating
  async saveRating(role, expectationIndex, rating, createdBy = null) {
    // Use upsert to insert or update
    const response = await supabase
      .from(TABLE)
      .upsert([{
        role,
        expectation_index: expectationIndex,
        rating,
        updated_by: createdBy
      }], {
        onConflict: 'role,expectation_index'
      })
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete a rating
  async deleteRating(role, expectationIndex) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('role', role)
      .eq('expectation_index', expectationIndex);
    return handleSupabaseResult(response);
  }
};

export default roleExpectationsRatingsService;






