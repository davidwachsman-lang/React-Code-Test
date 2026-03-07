import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'agency_playbooks';

const toSnakeCase = (formData) => ({
  agency_name: formData.agencyName || null,
  agency_address: formData.agencyAddress || null,
  agency_city_state_zip: formData.agencyCityStateZip || null,
  agency_phone: formData.agencyPhone || null,
  agency_email: formData.agencyEmail || null,
  key_contacts: formData.keyContacts || null,
  preferred_communication: formData.preferredCommunication || null,
  homeowner_policies: formData.homeownerPolicies || null,
  commercial_policies: formData.commercialPolicies || null,
  avg_monthly_claims: formData.avgMonthlyClaims || null,
  seasonal_volume_notes: formData.seasonalVolumeNotes || null,
  claims_process: formData.claimsProcess || null,
  notification_timing: formData.notificationTiming || null,
  tracking_process: formData.trackingProcess || null,
  reporting_requirements: formData.reportingRequirements || null,
  vendor_influencers: formData.vendorInfluencers || null,
  has_preferred_vendor_list: formData.hasPreferredVendorList || null,
  vendor_list_requirements: formData.vendorListRequirements || null,
  key_decision_criteria: formData.keyDecisionCriteria || null,
  past_frustrations: formData.pastFrustrations || null,
  common_mistakes: formData.commonMistakes || null,
  communication_issues: formData.communicationIssues || null,
  most_important_outcomes: formData.mostImportantOutcomes?.length > 0 ? formData.mostImportantOutcomes : null,
  confident_referral_factors: formData.confidentReferralFactors || null,
  vendor_success_measurement: formData.vendorSuccessMeasurement || null,
  six_month_vision: formData.sixMonthVision || null,
  co_branded_opportunities: formData.coBrandedOpportunities || null,
  additional_support: formData.additionalSupport || null,
  update_frequency: formData.updateFrequency || null,
  optional_notes: formData.optionalNotes || null,
  sales_rep: formData.salesRep || null,
  crm_id: formData.crmId || null,
});

const toCamelCase = (dbData) => ({
  id: dbData.id,
  agencyName: dbData.agency_name || '',
  agencyAddress: dbData.agency_address || '',
  agencyCityStateZip: dbData.agency_city_state_zip || '',
  agencyPhone: dbData.agency_phone || '',
  agencyEmail: dbData.agency_email || '',
  keyContacts: dbData.key_contacts || '',
  preferredCommunication: dbData.preferred_communication || '',
  homeownerPolicies: dbData.homeowner_policies || '',
  commercialPolicies: dbData.commercial_policies || '',
  avgMonthlyClaims: dbData.avg_monthly_claims || '',
  seasonalVolumeNotes: dbData.seasonal_volume_notes || '',
  claimsProcess: dbData.claims_process || '',
  notificationTiming: dbData.notification_timing || '',
  trackingProcess: dbData.tracking_process || '',
  reportingRequirements: dbData.reporting_requirements || '',
  vendorInfluencers: dbData.vendor_influencers || '',
  hasPreferredVendorList: dbData.has_preferred_vendor_list || '',
  vendorListRequirements: dbData.vendor_list_requirements || '',
  keyDecisionCriteria: dbData.key_decision_criteria || '',
  pastFrustrations: dbData.past_frustrations || '',
  commonMistakes: dbData.common_mistakes || '',
  communicationIssues: dbData.communication_issues || '',
  mostImportantOutcomes: dbData.most_important_outcomes || [],
  confidentReferralFactors: dbData.confident_referral_factors || '',
  vendorSuccessMeasurement: dbData.vendor_success_measurement || '',
  sixMonthVision: dbData.six_month_vision || '',
  coBrandedOpportunities: dbData.co_branded_opportunities || '',
  additionalSupport: dbData.additional_support || '',
  updateFrequency: dbData.update_frequency || '',
  optionalNotes: dbData.optional_notes || '',
  salesRep: dbData.sales_rep || '',
  crmId: dbData.crm_id || null,
  createdAt: dbData.created_at,
  updatedAt: dbData.updated_at,
});

const agencyPlaybookService = {
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response).map(toCamelCase);
  },

  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    const result = handleSupabaseResult(response);
    return result ? toCamelCase(result) : null;
  },

  async create(formData) {
    const dbData = toSnakeCase(formData);
    const response = await supabase
      .from(TABLE)
      .insert([dbData])
      .select()
      .single();
    return toCamelCase(handleSupabaseResult(response));
  },

  async update(id, formData) {
    const dbData = toSnakeCase(formData);
    const response = await supabase
      .from(TABLE)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    return toCamelCase(handleSupabaseResult(response));
  },

  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  async getByCRMId(crmId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('crm_id', crmId)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response).map(toCamelCase);
  },

  async getBySalesRep(salesRep) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('sales_rep', salesRep)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response).map(toCamelCase);
  },

  async getByAgencyName(name) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .ilike('agency_name', `%${name}%`)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response).map(toCamelCase);
  },
};

export default agencyPlaybookService;
