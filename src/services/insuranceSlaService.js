// Insurance SLA Service - Supabase queries for carriers, documents, and checklist items
import { supabase, handleSupabaseResult } from './supabaseClient';

const CARRIERS_TABLE = 'insurance_carriers';
const DOCUMENTS_TABLE = 'carrier_sla_documents';
const CHECKLIST_TABLE = 'carrier_sla_checklist_items';
const STORAGE_BUCKET = 'insurance-slas';

const insuranceSlaService = {
  /* ------------------------------------------------------------------ */
  /*  Carriers                                                          */
  /* ------------------------------------------------------------------ */

  async getCarriers() {
    const response = await supabase
      .from(CARRIERS_TABLE)
      .select('*')
      .order('name');
    return handleSupabaseResult(response);
  },

  async getCarrierById(id) {
    const response = await supabase
      .from(CARRIERS_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  async createCarrier(data) {
    const payload = { ...data, updated_at: new Date().toISOString() };
    const response = await supabase
      .from(CARRIERS_TABLE)
      .insert([payload])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  async updateCarrier(id, data) {
    const payload = { ...data, updated_at: new Date().toISOString() };
    const response = await supabase
      .from(CARRIERS_TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  async deleteCarrier(id) {
    // Storage files and DB rows cascade-delete via FK
    const response = await supabase
      .from(CARRIERS_TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  /* ------------------------------------------------------------------ */
  /*  Documents (PDF upload / list / delete)                            */
  /* ------------------------------------------------------------------ */

  /**
   * Find an existing carrier by name (case-insensitive) or create a new one.
   * @param {string} name
   * @returns {object} the carrier row
   */
  async findOrCreateCarrier(name) {
    // Look for existing carrier (case-insensitive)
    const { data: existing } = await supabase
      .from(CARRIERS_TABLE)
      .select('*')
      .ilike('name', name.trim())
      .maybeSingle();
    if (existing) return existing;
    // Create new carrier
    const response = await supabase
      .from(CARRIERS_TABLE)
      .insert([{ name: name.trim(), updated_at: new Date().toISOString() }])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  /**
   * Fetch ALL documents across all carriers, joined with carrier name.
   * Returns array of { ...doc, carrier_name }.
   */
  async getAllDocumentsWithCarrier() {
    const response = await supabase
      .from(DOCUMENTS_TABLE)
      .select('*, insurance_carriers(name)')
      .order('uploaded_at', { ascending: false });
    const rows = handleSupabaseResult(response);
    return (rows ?? []).map((row) => ({
      ...row,
      carrier_name: row.insurance_carriers?.name ?? 'Unknown',
      // Remove the nested object to keep it flat
      insurance_carriers: undefined,
    }));
  },

  async getDocuments(carrierId) {
    const response = await supabase
      .from(DOCUMENTS_TABLE)
      .select('*')
      .eq('carrier_id', carrierId)
      .order('uploaded_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  /**
   * Upload a PDF file to Supabase Storage and record it in the DB.
   * @param {string} carrierId
   * @param {File} file - browser File object
   * @param {{ publish_date?: string }} [extra] - optional extra fields
   * @returns {object} the new carrier_sla_documents row
   */
  async uploadDocument(carrierId, file, extra = {}) {
    const filePath = `${carrierId}/${Date.now()}_${file.name}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { contentType: 'application/pdf', upsert: false });

    if (uploadError) throw new Error(uploadError.message || 'Failed to upload PDF');

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // 3. Insert DB row
    const row = {
      carrier_id: carrierId,
      file_name: file.name,
      file_path: filePath,
      file_url: urlData?.publicUrl ?? null,
    };
    if (extra.publish_date) row.publish_date = extra.publish_date;

    const response = await supabase
      .from(DOCUMENTS_TABLE)
      .insert([row])
      .select()
      .single();

    return handleSupabaseResult(response);
  },

  async deleteDocument(docId, filePath) {
    // Remove from Storage
    if (filePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    }
    // Remove DB row
    const response = await supabase
      .from(DOCUMENTS_TABLE)
      .delete()
      .eq('id', docId);
    return handleSupabaseResult(response);
  },

  /* ------------------------------------------------------------------ */
  /*  Checklist items                                                   */
  /* ------------------------------------------------------------------ */

  async getChecklistItems(carrierId) {
    const response = await supabase
      .from(CHECKLIST_TABLE)
      .select('*')
      .eq('carrier_id', carrierId)
      .order('sort_order')
      .order('created_at');
    return handleSupabaseResult(response);
  },

  /**
   * Bulk-insert checklist items for a carrier.
   * @param {string} carrierId
   * @param {{ section?: string, text: string }[]} items
   */
  async addChecklistItems(carrierId, items) {
    const rows = items.map((item, i) => ({
      carrier_id: carrierId,
      section: item.section || null,
      text: item.text,
      sort_order: item.sort_order ?? i,
    }));
    const response = await supabase
      .from(CHECKLIST_TABLE)
      .insert(rows)
      .select();
    return handleSupabaseResult(response);
  },

  async updateChecklistItem(id, data) {
    const response = await supabase
      .from(CHECKLIST_TABLE)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  async deleteChecklistItem(id) {
    const response = await supabase
      .from(CHECKLIST_TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  /**
   * Reorder checklist items by updating sort_order for each item.
   * @param {{ id: string, sort_order: number }[]} items
   */
  async reorderChecklistItems(items) {
    const promises = items.map(({ id, sort_order }) =>
      supabase.from(CHECKLIST_TABLE).update({ sort_order }).eq('id', id)
    );
    await Promise.all(promises);
  },
};

export default insuranceSlaService;
