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
export const DIVISION_OPTIONS = ['HB', 'LL', 'REFERRAL'];
export const GROUP_OPTIONS = ['MIT', 'RECON'];
export const DEPARTMENT_OPTIONS = ['WATER', 'FIRE', 'MOLD', 'BIO', 'CONTENTS'];

// === PERSONNEL ===
export const PM_OPTIONS = ['KEVIN', 'LEO', 'AARON'];
export const CREW_CHIEF_OPTIONS = ['GABRIEL', 'PEDRO', 'JUAN'];
export const JFC_OPTIONS = ['KELSEY', 'BRANDIE', 'CARMINE'];
export const ESTIMATOR_OPTIONS = ['KEVIN', 'BRYAN', 'TRAVIS', 'JOSH'];
export const BIZ_DEV_OPTIONS = ['TONY', 'BRI', 'PAIGE', 'AINSLEY', 'JOE'];

// === FNOL DROPDOWNS ===
export const PROPERTY_STATUS_OPTIONS = ['VACANT', 'OCCUPIED'];
export const POWER_STATUS_OPTIONS = ['POWER', 'NO POWER'];
export const TYPE_OF_LOSS_OPTIONS = ['WATER', 'FIRE', 'MOLD', 'BIO'];
export const PROPERTY_TYPE_OPTIONS = ['RESIDENTIAL', 'COMMERCIAL'];
export const FOUNDATION_TYPE_OPTIONS = ['SLAB', 'CRAWLSPACE'];
export const DISPATCH_OPTIONS = ['IMMEDIATE SERVICE', 'DISPATCH'];
export const ESTIMATE_INSPECTION_OPTIONS = ['INSPECTION', 'ESTIMATE'];

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
export const FNOL_SECTIONS = [
  {
    label: 'Customer',
    fields: [
      { key: 'fnol_customer_name', label: 'Customer Name', type: 'text' },
      { key: 'fnol_date', label: 'Date', type: 'date' },
      { key: 'fnol_loss_address', label: 'Loss Address', type: 'text' },
      { key: 'fnol_phone', label: 'Phone', type: 'text' },
      { key: 'fnol_email', label: 'Email', type: 'email' },
      { key: 'fnol_reported_by', label: 'Reported By', type: 'text' },
      { key: 'fnol_referred_by', label: 'Referred By', type: 'text' },
      { key: 'fnol_billing_address', label: 'Billing Address', type: 'text' },
    ],
  },
  {
    label: 'Property',
    fields: [
      { key: 'fnol_property_status', label: 'Property Status', type: 'dropdown', options: PROPERTY_STATUS_OPTIONS },
      { key: 'fnol_power_status', label: 'Power Status', type: 'dropdown', options: POWER_STATUS_OPTIONS },
      { key: 'fnol_type_of_loss', label: 'Type of Loss', type: 'dropdown', options: TYPE_OF_LOSS_OPTIONS },
      { key: 'fnol_property_type', label: 'Property Type', type: 'dropdown', options: PROPERTY_TYPE_OPTIONS },
      { key: 'fnol_year_built', label: 'Year Built', type: 'text' },
      { key: 'fnol_foundation_type', label: 'Foundation Type', type: 'dropdown', options: FOUNDATION_TYPE_OPTIONS },
    ],
  },
  {
    label: 'Insurance',
    fields: [
      { key: 'fnol_carrier', label: 'Carrier', type: 'text' },
      { key: 'fnol_adjuster_name', label: 'Adjuster Name', type: 'text' },
      { key: 'fnol_adjuster_phone', label: 'Adjuster Phone', type: 'text' },
      { key: 'fnol_adjuster_email', label: 'Adjuster Email', type: 'email' },
    ],
  },
  {
    label: 'Loss Details',
    fields: [
      { key: 'fnol_rooms_affected', label: '# of Rooms Affected', type: 'number' },
      { key: 'fnol_floors_affected', label: '# of Floors Affected', type: 'number' },
      { key: 'fnol_units_affected', label: '# of Units Affected', type: 'number' },
      { key: 'fnol_affected_materials', label: 'Affected Materials', type: 'text' },
      { key: 'fnol_source_of_loss', label: 'Source of Loss', type: 'text' },
      { key: 'fnol_temp_repairs', label: 'Temp Repairs', type: 'text' },
    ],
  },
  {
    label: 'Dispatch',
    fields: [
      { key: 'fnol_immediate_service_dispatch', label: 'Immediate Service/Dispatch?', type: 'dropdown', options: DISPATCH_OPTIONS },
      { key: 'fnol_estimate_inspection', label: 'Estimate/Inspection?', type: 'dropdown', options: ESTIMATE_INSPECTION_OPTIONS },
    ],
  },
];

// Default local state shape for new fields not yet in Supabase
export const DEFAULT_LOCAL_STATE = {
  // Macro
  stage: '',
  group: '',
  department: '',
  // Dates
  target_completion_date: '',
  date_of_loss: '',
  date_of_cos: '',
  // Financials
  invoiced_amount: '',
  subcontractor_cost: '',
  labor_cost: '',
  ar_balance: '',
  // Personnel
  crew_chief: '',
  estimate_owner: '',
  business_dev_rep: '',
  // FNOL (26 fields)
  fnol_customer_name: '',
  fnol_date: '',
  fnol_loss_address: '',
  fnol_phone: '',
  fnol_email: '',
  fnol_reported_by: '',
  fnol_referred_by: '',
  fnol_billing_address: '',
  fnol_property_status: '',
  fnol_power_status: '',
  fnol_type_of_loss: '',
  fnol_property_type: '',
  fnol_year_built: '',
  fnol_foundation_type: '',
  fnol_carrier: '',
  fnol_adjuster_name: '',
  fnol_adjuster_phone: '',
  fnol_adjuster_email: '',
  fnol_rooms_affected: '',
  fnol_floors_affected: '',
  fnol_units_affected: '',
  fnol_affected_materials: '',
  fnol_source_of_loss: '',
  fnol_temp_repairs: '',
  fnol_immediate_service_dispatch: '',
  fnol_estimate_inspection: '',
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
