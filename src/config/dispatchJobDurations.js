// Centralized duration assumptions for Dispatch & Scheduling
// Hours are decimal hours (e.g. 0.5 = 30 min).
//
// Update these values to change how the scheduler auto-allocates time
// when a job type/status is selected (and when Excel uploads auto-fill hours).
export const JOB_TYPE_HOURS = {
  dry: 0.5,
  monitoring: 1,
  stabilization: 3,
  'new-start': 0.5,
  'continue-service': 0.5,
  demo: 6,
  'equipment-pickup': 1.5,
  walkthrough: 1,
  packout: 8,
  emergency: 0.5,
  estimate: 1.5,
  inspection: 1,
};

export function hoursForJobType(value) {
  if (!value) return 0;
  return Number(JOB_TYPE_HOURS[value]) || 0;
}

