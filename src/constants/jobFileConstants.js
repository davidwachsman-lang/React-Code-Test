// Job File Constants — dropdown options, field configs, doc check groups

// === MACRO ===
export const STATUS_OPTIONS = ['PENDING', 'WIP', 'READY TO BILL', 'AR'];
export const STATUS_DB_MAP = {
  'PENDING': 'pending',
  'WIP': 'wip',
  'READY TO BILL': 'ready_to_bill',
  'AR': 'ar',
};
export const STATUS_DISPLAY_MAP = Object.fromEntries(
  Object.entries(STATUS_DB_MAP).map(([k, v]) => [v, k])
);

export const STAGE_OPTIONS = ['INTAKE', 'MITIGATION', 'RECONSTRUCTION', 'CLOSEOUT'];
export const PENDING_STAGE_OPTIONS = [
  'Inspection Scheduled', 'Estimating', 'Estimate Submitted', 'Awaiting Approval',
];
export const WIP_STAGE_OPTIONS = [
  'Dry', 'Monitoring', 'Stabilization', 'Walkthrough', 'New Start',
  'Continue Service', 'Demo', 'Packout', 'Equipment Pickup', 'Emergency',
];
export const DIVISION_OPTIONS = ['HB', 'LL', 'REFERRAL'];
export const GROUP_OPTIONS = ['MIT', 'RECON'];
export const DEPARTMENT_OPTIONS = ['WATER', 'FIRE', 'MOLD', 'BIO', 'CONTENTS'];

// === PERSONNEL ===
export const PM_OPTIONS = ['KEVIN', 'LEO', 'AARON'];
export const CREW_CHIEF_OPTIONS = ['GABRIEL', 'PEDRO', 'JUAN'];
export const JFC_OPTIONS = ['KELSEY', 'BRANDIE', 'CARMINE'];
export const ESTIMATOR_OPTIONS = ['KEVIN', 'BRYAN', 'TRAVIS', 'JOSH'];
export const BIZ_DEV_OPTIONS = ['TONY', 'BRI', 'PAIGE', 'AINSLEY', 'JOE'];

// === FNOL / INTAKE DROPDOWNS (title case — matches Intake form values saved to Supabase) ===
export const CALLER_TYPE_OPTIONS = ['Homeowner', 'Adjuster', 'Property Manager / HOA', 'GC', 'Tenant'];
export const RELATIONSHIP_OPTIONS = ['Owner', 'Insured', 'Tenant', 'Other'];
export const PROPERTY_STATUS_OPTIONS = ['Vacant', 'Occupied'];
export const POWER_STATUS_OPTIONS = ['Power', 'No Power'];
export const TYPE_OF_LOSS_OPTIONS = ['Water', 'Fire', 'Mold', 'Bio', 'Trauma', 'Board-up', 'Reconstruction', 'Contents'];
export const PROPERTY_TYPE_OPTIONS = ['Residential', 'Commercial'];
export const FOUNDATION_TYPE_OPTIONS = ['Slab', 'Crawlspace'];
export const YES_NO_OPTIONS = ['Yes', 'No'];
export const WATER_CATEGORY_OPTIONS = ['1', '2', '3'];
export const WATER_CLASS_OPTIONS = ['1', '2', '3', '4'];
export const URGENCY_OPTIONS = ['Emergency (1–3 hrs)', 'Same Day', 'Next Day', 'Scheduled'];
export const COVERAGE_OPTIONS = ['Yes', 'No'];
export const PAYMENT_METHOD_OPTIONS = ['QBO Payment Link', 'Apple Pay', 'Card on File', 'Check on Site'];
export const AFFECTED_AREA_OPTIONS = ['Kitchen', 'Bath', 'Living Room', 'Bedroom', 'Basement', 'Attic', 'Exterior'];
export const DISPATCH_OPTIONS = ['Immediate Service', 'Dispatch'];
export const ESTIMATE_INSPECTION_OPTIONS = ['Inspection', 'Estimate'];

// === DRYBOOK DOCUMENTATION ===
export const DOC_CHECK_ITEMS = [
  { key: 'job_locked', label: 'Job Locked' },
  { key: 'dbmx_file_created', label: 'DBMX File Created' },
  { key: 'start_date_entered', label: 'Start Date Entered' },
  { key: 'atp_signed', label: 'ATP Signed' },
  { key: 'customer_info_form_signed', label: 'Customer Info Form Signed' },
  { key: 'equipment_resp_form_signed', label: 'Equipment Resp Form Signed' },
  { key: 'cause_of_loss_photo', label: 'Cause of Loss Photo' },
  { key: 'front_of_structure_photo', label: 'Front of Structure Photo' },
  { key: 'pre_mitigation_photos', label: 'Pre-Mitigation Photos' },
  { key: 'daily_departure_photos', label: 'Daily Departure Photos' },
  { key: 'docusketch_uploaded', label: 'DocuSketch Uploaded' },
  { key: 'initial_scope_sheet_entered', label: 'Initial Scope Sheet Entered' },
  { key: 'equipment_placed_and_logged', label: 'Equipment Placed and Logged' },
  { key: 'initial_atmospheric_readings', label: 'Initial Atmospheric Readings Taken' },
  { key: 'day_1_note_entered', label: 'Day 1 Note Entered' },
  { key: 'initial_inspection_questions', label: 'Initial Inspection Questions Answered' },
];

export const DOC_CHECK_GROUPS = [
  { label: 'Setup', items: ['job_locked', 'dbmx_file_created', 'start_date_entered'] },
  { label: 'Agreements', items: ['atp_signed', 'customer_info_form_signed', 'equipment_resp_form_signed'] },
  { label: 'Photos', items: ['cause_of_loss_photo', 'front_of_structure_photo', 'pre_mitigation_photos', 'daily_departure_photos'] },
  { label: 'Field Work', items: ['docusketch_uploaded', 'initial_scope_sheet_entered', 'equipment_placed_and_logged', 'initial_atmospheric_readings'] },
  { label: 'Notes', items: ['day_1_note_entered', 'initial_inspection_questions'] },
];

// === COMMUNICATIONS ===
export const ESCALATION_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

// === FNOL FIELD SECTIONS ===
// Field metadata:
//   supabaseField: string — reads/writes from job[supabaseField] via onSupabaseChange (persisted)
//   readonlyFrom: string  — reads from job[readonlyFrom], not editable (comes from related tables)
//   (neither)             — reads/writes from localState[key] via onLocalChange (preview/local)
export const FNOL_SECTIONS = [
  {
    label: 'Caller Information',
    fields: [
      { key: 'fnol_caller_type', label: 'Caller Type', type: 'dropdown', options: CALLER_TYPE_OPTIONS },
      { key: 'fnol_customer_name', label: 'Customer Name', type: 'text', readonlyFrom: 'customer_name' },
      { key: 'fnol_caller_phone', label: 'Caller Phone', type: 'text' },
      { key: 'fnol_caller_email', label: 'Caller Email', type: 'email' },
      { key: 'fnol_relationship', label: 'Relationship to Property', type: 'dropdown', options: RELATIONSHIP_OPTIONS },
      { key: 'fnol_date', label: 'FNOL Date', type: 'date' },
      { key: 'fnol_reported_by', label: 'Reported By', type: 'text' },
      { key: 'fnol_referred_by', label: 'Referred By', type: 'text' },
      { key: 'fnol_billing_address', label: 'Billing Address', type: 'text' },
    ],
  },
  {
    label: 'Property & Access',
    fields: [
      { key: 'fnol_loss_address', label: 'Loss Address', type: 'text', readonlyFrom: 'property_address' },
      { key: 'fnol_property_type', label: 'Property Type', type: 'dropdown', options: PROPERTY_TYPE_OPTIONS, supabaseField: 'property_type' },
      { key: 'fnol_property_status', label: 'Property Status', type: 'dropdown', options: PROPERTY_STATUS_OPTIONS },
      { key: 'fnol_power_status', label: 'Power Status', type: 'dropdown', options: POWER_STATUS_OPTIONS },
      { key: 'fnol_year_built', label: 'Year Built', type: 'text' },
      { key: 'fnol_foundation_type', label: 'Foundation Type', type: 'dropdown', options: FOUNDATION_TYPE_OPTIONS },
      { key: 'fnol_access', label: 'Access Instructions', type: 'text' },
      { key: 'fnol_onsite_name', label: 'On-site Contact Name', type: 'text' },
      { key: 'fnol_onsite_phone', label: 'On-site Contact Phone', type: 'text' },
    ],
  },
  {
    label: 'Loss Details',
    fields: [
      { key: 'fnol_loss_type', label: 'Loss Type', type: 'dropdown', options: TYPE_OF_LOSS_OPTIONS, supabaseField: 'loss_type' },
      { key: 'fnol_source_of_loss', label: 'Source of Loss', type: 'text', supabaseField: 'loss_cause' },
      { key: 'fnol_date_of_loss', label: 'Loss Date/Time', type: 'datetime-local', supabaseField: 'date_of_loss' },
      { key: 'fnol_active_leak', label: 'Active Leak?', type: 'dropdown', options: YES_NO_OPTIONS },
      { key: 'fnol_water_category', label: 'Water Category', type: 'dropdown', options: WATER_CATEGORY_OPTIONS },
      { key: 'fnol_water_class', label: 'Water Class', type: 'dropdown', options: WATER_CLASS_OPTIONS },
      { key: 'fnol_affected_areas', label: 'Affected Areas', type: 'pills', options: AFFECTED_AREA_OPTIONS },
      { key: 'fnol_sqft', label: 'Estimated Affected SF', type: 'number' },
      { key: 'fnol_rooms_affected', label: '# of Rooms Affected', type: 'number' },
      { key: 'fnol_floors_affected', label: '# of Floors Affected', type: 'number' },
      { key: 'fnol_units_affected', label: '# of Units Affected', type: 'number' },
      { key: 'fnol_affected_materials', label: 'Affected Materials', type: 'text' },
      { key: 'fnol_temp_repairs', label: 'Temp Repairs', type: 'text' },
    ],
  },
  {
    label: 'Insurance',
    fields: [
      { key: 'fnol_carrier', label: 'Carrier', type: 'text', supabaseField: 'insurance_company' },
      { key: 'fnol_claim_number', label: 'Claim #', type: 'text' },
      { key: 'fnol_adjuster_name', label: 'Adjuster Name', type: 'text', supabaseField: 'insurance_adjuster_name' },
      { key: 'fnol_adjuster_phone', label: 'Adjuster Phone', type: 'text', supabaseField: 'insurance_adjuster_phone' },
      { key: 'fnol_adjuster_email', label: 'Adjuster Email', type: 'email', supabaseField: 'insurance_adjuster_email' },
      { key: 'fnol_deductible', label: 'Deductible ($)', type: 'number' },
      { key: 'fnol_coverage', label: 'Coverage Confirmed', type: 'dropdown', options: COVERAGE_OPTIONS },
    ],
  },
  {
    label: 'Dispatch',
    fields: [
      { key: 'fnol_urgency', label: 'Urgency', type: 'dropdown', options: URGENCY_OPTIONS },
      { key: 'fnol_arrival', label: 'Preferred Arrival Window', type: 'text' },
      { key: 'fnol_branch', label: 'Branch Assignment', type: 'text' },
      { key: 'fnol_assigned', label: 'PM/Tech Assigned', type: 'text' },
      { key: 'fnol_dispatch_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    label: 'Authorization & Payment',
    fields: [
      { key: 'fnol_auth_required', label: 'Authorization Required', type: 'dropdown', options: YES_NO_OPTIONS },
      { key: 'fnol_payment_method', label: 'Payment Method', type: 'dropdown', options: PAYMENT_METHOD_OPTIONS },
      { key: 'fnol_auth_signer', label: 'Authorized Signer', type: 'text' },
      { key: 'fnol_auth_contact', label: 'Authorized Signer Phone/Email', type: 'text' },
    ],
  },
];

// Default local state shape for fields not yet in Supabase
// Note: stage, job_group, department, crew_chief, estimate_owner, sales_person,
// target_completion_date, date_of_loss, date_of_cos, invoiced_amount,
// subcontractor_cost, labor_cost, ar_balance are now persisted in Supabase.
// Legacy local keys kept for fallback compatibility.
export const DEFAULT_LOCAL_STATE = {
  // Legacy fallbacks (now in Supabase — kept for backward compat with existing local data)
  stage: '',
  group: '',
  department: '',
  crew_chief: '',
  estimate_owner: '',
  business_dev_rep: '',
  // FNOL — Caller Information
  fnol_caller_type: '',
  fnol_caller_phone: '',
  fnol_caller_email: '',
  fnol_relationship: '',
  fnol_date: '',
  fnol_reported_by: '',
  fnol_referred_by: '',
  fnol_billing_address: '',
  // FNOL — Property & Access (local-only fields; property_type is Supabase)
  fnol_property_status: '',
  fnol_power_status: '',
  fnol_year_built: '',
  fnol_foundation_type: '',
  fnol_access: '',
  fnol_onsite_name: '',
  fnol_onsite_phone: '',
  // FNOL — Loss Details (local-only fields; loss_type, loss_cause, date_of_loss are Supabase)
  fnol_active_leak: '',
  fnol_water_category: '',
  fnol_water_class: '',
  fnol_affected_areas: '',
  fnol_sqft: '',
  fnol_rooms_affected: '',
  fnol_floors_affected: '',
  fnol_units_affected: '',
  fnol_affected_materials: '',
  fnol_temp_repairs: '',
  // FNOL — Insurance (local-only fields; carrier/adjuster are Supabase)
  fnol_claim_number: '',
  fnol_deductible: '',
  fnol_coverage: '',
  // FNOL — Dispatch
  fnol_urgency: '',
  fnol_arrival: '',
  fnol_branch: '',
  fnol_assigned: '',
  fnol_dispatch_notes: '',
  // FNOL — Authorization & Payment
  fnol_auth_required: '',
  fnol_payment_method: '',
  fnol_auth_signer: '',
  fnol_auth_contact: '',
  // Documentation (16 booleans)
  job_locked: false,
  dbmx_file_created: false,
  start_date_entered: false,
  atp_signed: false,
  customer_info_form_signed: false,
  equipment_resp_form_signed: false,
  cause_of_loss_photo: false,
  front_of_structure_photo: false,
  pre_mitigation_photos: false,
  daily_departure_photos: false,
  docusketch_uploaded: false,
  initial_scope_sheet_entered: false,
  equipment_placed_and_logged: false,
  initial_atmospheric_readings: false,
  day_1_note_entered: false,
  initial_inspection_questions: false,
  // Communications
  customer_communication: '',
  adjuster_carrier_communication: '',
  job_timeline_events: '',
  escalations: '',
};
