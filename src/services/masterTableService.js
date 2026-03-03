import { supabase, handleSupabaseResult } from './supabaseClient';

const BATCH_SIZE = 500;

const masterTableService = {
  /**
   * Truncate master_table and insert fresh rows (batch of 500).
   * @param {Array<Object>} rows — mapped row objects matching DB columns
   * @param {function} [onProgress] — optional callback(inserted, total)
   * @returns {{ inserted: number }}
   */
  async truncateAndInsert(rows, onProgress) {
    // 1. Delete all existing rows
    const deleteRes = await supabase
      .from('master_table')
      .delete()
      .neq('id', 0);
    handleSupabaseResult(deleteRes);

    // 2. Batch insert
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const insertRes = await supabase
        .from('master_table')
        .insert(chunk);
      handleSupabaseResult(insertRes);
      inserted += chunk.length;
      if (onProgress) onProgress(inserted, rows.length);
    }

    return { inserted };
  },

  /**
   * Fetch all rows ordered by id.
   */
  async getAll() {
    const response = await supabase
      .from('master_table')
      .select('*')
      .order('id');
    return handleSupabaseResult(response);
  },

  /**
   * Get exact row count without fetching data.
   */
  async getCount() {
    const response = await supabase
      .from('master_table')
      .select('id', { count: 'exact', head: true });
    handleSupabaseResult(response);
    return response.count;
  },
};

export default masterTableService;
