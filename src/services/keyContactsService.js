import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'key_contacts';

const keyContactsService = {
  async getByCrmId(crmId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('crm_id', crmId)
      .order('sort_order', { ascending: true });
    return handleSupabaseResult(response);
  },

  async save(crmId, contacts) {
    // Delete existing contacts for this CRM record
    await supabase.from(TABLE).delete().eq('crm_id', crmId);

    if (!contacts || contacts.length === 0) return [];

    // Insert all contacts with sort order
    const rows = contacts.map((c, i) => ({
      crm_id: crmId,
      role: c.role || null,
      name: c.name || null,
      title: c.title || null,
      email: c.email || null,
      cell: c.cell || null,
      is_key_influencer: c.isKeyInfluencer || false,
      sort_order: i,
    }));

    const response = await supabase
      .from(TABLE)
      .insert(rows)
      .select();
    return handleSupabaseResult(response);
  },
};

export default keyContactsService;
