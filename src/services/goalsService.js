import { supabase, handleSupabaseResult } from './supabaseClient';

const goalsService = {
  // ── Pillars ──────────────────────────────────────────────
  async getPillars() {
    const response = await supabase
      .from('goals_pillars')
      .select('*')
      .order('sort_order');
    return handleSupabaseResult(response);
  },

  // ── Key Results ──────────────────────────────────────────
  async getKeyResults() {
    const response = await supabase
      .from('goals_key_results')
      .select('*, pillar:goals_pillars(id, name)')
      .order('sort_order');
    return handleSupabaseResult(response);
  },

  async updateKeyResult(id, data) {
    const response = await supabase
      .from('goals_key_results')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // ── Financial Targets ────────────────────────────────────
  async getFinancialTargets() {
    const response = await supabase
      .from('goals_financial_targets')
      .select('*')
      .order('sort_order');
    return handleSupabaseResult(response);
  },

  async updateFinancialTarget(id, data) {
    const response = await supabase
      .from('goals_financial_targets')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // ── Initiatives ──────────────────────────────────────────
  async getInitiatives() {
    const response = await supabase
      .from('goals_initiatives')
      .select('*, pillar:goals_pillars(id, name)')
      .order('sort_order');
    return handleSupabaseResult(response);
  },

  async updateInitiative(id, data) {
    const response = await supabase
      .from('goals_initiatives')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },
};

export default goalsService;
