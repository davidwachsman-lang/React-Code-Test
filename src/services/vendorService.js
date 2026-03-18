// Vendor Service - Supabase queries for Resource Center vendors
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'vendors';
const STORAGE_BUCKET = 'vendor-contracts';

function sanitizeFileName(fileName) {
  return String(fileName || 'contract')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
}

const vendorService = {
  // Get all vendors
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select(`
        id,
        name,
        category,
        phone,
        email,
        notes,
        coi_received,
        workers_comp_received,
        coi_expiration_date,
        tax_form_received,
        tax_form_expiration_date,
        payment_terms,
        vendor_tier,
        contract_file_name,
        contract_file_path,
        contract_file_url,
        contract_uploaded_at,
        created_at,
        updated_at
      `)
      .order('category')
      .order('name');
    return handleSupabaseResult(response);
  },

  // Get vendor by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Create new vendor
  async create(vendorData) {
    const payload = {
      ...vendorData,
      updated_at: new Date().toISOString()
    };
    const response = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update vendor
  async update(id, vendorData) {
    const payload = {
      ...vendorData,
      updated_at: new Date().toISOString()
    };
    const response = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete vendor
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  async uploadContract(vendorId, file, existingFilePath = null) {
    const safeName = sanitizeFileName(file.name);
    const filePath = `${vendorId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Failed to upload contract');
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const response = await supabase
      .from(TABLE)
      .update({
        contract_file_name: file.name,
        contract_file_path: filePath,
        contract_file_url: urlData?.publicUrl ?? null,
        contract_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (existingFilePath) {
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([existingFilePath]);
      if (removeError) {
        console.error('Failed to delete previous contract file:', removeError);
      }
    }

    return handleSupabaseResult(response);
  }
};

export default vendorService;
