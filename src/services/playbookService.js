// Playbook Service - Supabase queries for Insight Meeting Playbooks
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'insight_meeting_playbooks';

// Helper to convert camelCase form data to snake_case for database
const toSnakeCase = (formData) => ({
  contact_name: formData.contactName || null,
  contact_title: formData.contactTitle || null,
  contact_email: formData.contactEmail || null,
  contact_phone: formData.contactPhone || null,
  contact_company: formData.contactCompany || null,
  insurance_provider: formData.insuranceProvider || null,
  agent_name: formData.agentName || null,
  agent_email: formData.agentEmail || null,
  agent_phone: formData.agentPhone || null,
  property_address: formData.propertyAddress || null,
  property_type: formData.propertyType || null,
  property_size: formData.propertySize || null,
  property_age: formData.propertyAge || null,
  number_of_buildings: formData.numberOfBuildings || null,
  number_of_units: formData.numberOfUnits || null,
  current_challenges: formData.currentChallenges || null,
  current_process: formData.currentProcess || null,
  process_challenges: formData.processChallenges || null,
  current_providers: formData.currentProviders || null,
  provider_satisfaction: formData.providerSatisfaction || null,
  provider_improvements: formData.providerImprovements || null,
  number_of_maintenance_engineers: formData.numberOfMaintenanceEngineers || null,
  last_training: formData.lastTraining || null,
  equipment: formData.equipment || null,
  recent_losses: formData.recentLosses || null,
  last_event: formData.lastEvent || null,
  event_type_24_months: formData.eventType24Months?.length > 0 ? formData.eventType24Months : null,
  outsourcing_scale: formData.outsourcingScale || null,
  protocol_for_callout: formData.protocolForCallout || null,
  events_annually: formData.eventsAnnually || null,
  portfolio_managers: formData.portfolioManagers || null,
  regional_managers: formData.regionalManagers || null,
  property_managers: formData.propertyManagers || null,
  maintenance_supervisors: formData.maintenanceSupervisors || null,
  director_engineering_maintenance: formData.directorEngineeringMaintenance || null,
  projected_job_date: formData.projectedJobDate || null,
  interaction_plan_strategy: formData.interactionPlanStrategy || null,
  sales_rep: formData.salesRep || null,
  crm_id: formData.crmId || null,
});

// Helper to convert snake_case database data to camelCase for form
const toCamelCase = (dbData) => ({
  id: dbData.id,
  contactName: dbData.contact_name || '',
  contactTitle: dbData.contact_title || '',
  contactEmail: dbData.contact_email || '',
  contactPhone: dbData.contact_phone || '',
  contactCompany: dbData.contact_company || '',
  insuranceProvider: dbData.insurance_provider || '',
  agentName: dbData.agent_name || '',
  agentEmail: dbData.agent_email || '',
  agentPhone: dbData.agent_phone || '',
  propertyAddress: dbData.property_address || '',
  propertyType: dbData.property_type || '',
  propertySize: dbData.property_size || '',
  propertyAge: dbData.property_age || '',
  numberOfBuildings: dbData.number_of_buildings || '',
  numberOfUnits: dbData.number_of_units || '',
  currentChallenges: dbData.current_challenges || '',
  currentProcess: dbData.current_process || '',
  processChallenges: dbData.process_challenges || '',
  currentProviders: dbData.current_providers || '',
  providerSatisfaction: dbData.provider_satisfaction || '',
  providerImprovements: dbData.provider_improvements || '',
  numberOfMaintenanceEngineers: dbData.number_of_maintenance_engineers || '',
  lastTraining: dbData.last_training || '',
  equipment: dbData.equipment || '',
  recentLosses: dbData.recent_losses || '',
  lastEvent: dbData.last_event || '',
  eventType24Months: dbData.event_type_24_months || [],
  outsourcingScale: dbData.outsourcing_scale || '',
  protocolForCallout: dbData.protocol_for_callout || '',
  eventsAnnually: dbData.events_annually || '',
  portfolioManagers: dbData.portfolio_managers || '',
  regionalManagers: dbData.regional_managers || '',
  propertyManagers: dbData.property_managers || '',
  maintenanceSupervisors: dbData.maintenance_supervisors || '',
  directorEngineeringMaintenance: dbData.director_engineering_maintenance || '',
  projectedJobDate: dbData.projected_job_date || '',
  interactionPlanStrategy: dbData.interaction_plan_strategy || '',
  salesRep: dbData.sales_rep || '',
  crmId: dbData.crm_id || null,
  createdAt: dbData.created_at,
  updatedAt: dbData.updated_at,
});

const playbookService = {
  // Get all playbooks
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    const result = handleSupabaseResult(response);
    return result.map(toCamelCase);
  },

  // Get playbook by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    const result = handleSupabaseResult(response);
    return result ? toCamelCase(result) : null;
  },

  // Create new playbook
  async create(formData) {
    const dbData = toSnakeCase(formData);
    const response = await supabase
      .from(TABLE)
      .insert([dbData])
      .select()
      .single();
    const result = handleSupabaseResult(response);
    return toCamelCase(result);
  },

  // Update playbook
  async update(id, formData) {
    const dbData = toSnakeCase(formData);
    const response = await supabase
      .from(TABLE)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    const result = handleSupabaseResult(response);
    return toCamelCase(result);
  },

  // Delete playbook
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  // Get playbooks by CRM record ID
  async getByCRMId(crmId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('crm_id', crmId)
      .order('created_at', { ascending: false });
    const result = handleSupabaseResult(response);
    return result.map(toCamelCase);
  },

  // Get playbooks by sales rep
  async getBySalesRep(salesRep) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('sales_rep', salesRep)
      .order('created_at', { ascending: false });
    const result = handleSupabaseResult(response);
    return result.map(toCamelCase);
  },

  // Get playbooks by company name (for searching/filtering)
  async getByCompany(companyName) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .ilike('contact_company', `%${companyName}%`)
      .order('created_at', { ascending: false });
    const result = handleSupabaseResult(response);
    return result.map(toCamelCase);
  },

  // Get recent playbooks
  async getRecent(limit = 10) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    const result = handleSupabaseResult(response);
    return result.map(toCamelCase);
  },
};

export default playbookService;
