/* ================================================================== */
/*  Estimate Control Tower — Mock Data & KPI Helpers                   */
/* ================================================================== */

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export const estimateTasks = [
  // --- Pending, no estimate yet ---
  { id: 'ect-001', jobNumber: 'MIT-24091', customerName: 'Anderson Residence', status: 'Pending', hasEstimate: false, estimateValue: 0, owner: 'Leo Champion', lineOfBusiness: 'HB: MIT',
    fnolDate: daysAgo(5), inspectionDate: null, estimateCreatedDate: null, estimateSentDate: null, approvedDate: null, nextFollowUpDate: null },
  { id: 'ect-002', jobNumber: 'MIT-24095', customerName: 'Franklin Office Park', status: 'Pending', hasEstimate: false, estimateValue: 0, owner: 'Aaron Kacel', lineOfBusiness: 'HB: MIT',
    fnolDate: daysAgo(3), inspectionDate: null, estimateCreatedDate: null, estimateSentDate: null, approvedDate: null, nextFollowUpDate: daysFromNow(1) },
  { id: 'ect-003', jobNumber: 'REC-11803', customerName: 'Baker Family', status: 'Pending', hasEstimate: false, estimateValue: 0, owner: 'Kevin Shell', lineOfBusiness: 'HB: RECON',
    fnolDate: daysAgo(2), inspectionDate: null, estimateCreatedDate: null, estimateSentDate: null, approvedDate: null, nextFollowUpDate: null },

  // --- Drafting ---
  { id: 'ect-004', jobNumber: 'MIT-24102', customerName: 'Summit Dental', status: 'Drafting', hasEstimate: true, estimateValue: 14250, owner: 'Leo Champion', lineOfBusiness: 'HB: MIT',
    fnolDate: daysAgo(8), inspectionDate: daysAgo(7), estimateCreatedDate: daysAgo(6), estimateSentDate: null, approvedDate: null, nextFollowUpDate: daysFromNow(2) },
  { id: 'ect-005', jobNumber: 'MIT-24110', customerName: 'Carter Residence', status: 'Drafting', hasEstimate: true, estimateValue: 8700, owner: 'Roger Hill', lineOfBusiness: 'LL',
    fnolDate: daysAgo(6), inspectionDate: daysAgo(5), estimateCreatedDate: daysAgo(4), estimateSentDate: null, approvedDate: null, nextFollowUpDate: null },
  { id: 'ect-018', jobNumber: 'MIT-24125', customerName: 'Bellevue Storage Co', status: 'Drafting', hasEstimate: true, estimateValue: 17300, owner: 'Kevin Shell', lineOfBusiness: 'HB: MIT',
    fnolDate: daysAgo(4), inspectionDate: daysAgo(3), estimateCreatedDate: daysAgo(2), estimateSentDate: null, approvedDate: null, nextFollowUpDate: daysFromNow(2) },

  // --- Sent ---
  { id: 'ect-006', jobNumber: 'REC-11811', customerName: 'Lakeside Apartments', status: 'Sent', hasEstimate: true, estimateValue: 32400, owner: 'Aaron Kacel', lineOfBusiness: 'HB: RECON',
    fnolDate: daysAgo(14), inspectionDate: daysAgo(12), estimateCreatedDate: daysAgo(10), estimateSentDate: daysAgo(7), approvedDate: null, nextFollowUpDate: daysFromNow(1) },
  { id: 'ect-007', jobNumber: 'REC-11820', customerName: 'Pine Valley HOA', status: 'Sent', hasEstimate: true, estimateValue: 19800, owner: 'Ramon Torres', lineOfBusiness: 'LL',
    fnolDate: daysAgo(12), inspectionDate: daysAgo(11), estimateCreatedDate: daysAgo(9), estimateSentDate: daysAgo(5), approvedDate: null, nextFollowUpDate: null },
  { id: 'ect-008', jobNumber: 'MIT-24118', customerName: 'Greenfield Church', status: 'Sent', hasEstimate: true, estimateValue: 45000, owner: 'Leo Champion', lineOfBusiness: 'HB: MIT',
    fnolDate: daysAgo(20), inspectionDate: daysAgo(18), estimateCreatedDate: daysAgo(16), estimateSentDate: daysAgo(12), approvedDate: null, nextFollowUpDate: null },
  { id: 'ect-009', jobNumber: 'REC-11835', customerName: 'Elm Street Condos', status: 'Sent', hasEstimate: true, estimateValue: 11500, owner: 'Kevin Shell', lineOfBusiness: 'HB: RECON',
    fnolDate: daysAgo(10), inspectionDate: daysAgo(8), estimateCreatedDate: daysAgo(7), estimateSentDate: daysAgo(4), approvedDate: null, nextFollowUpDate: daysFromNow(3) },

  // --- Sent (expired — 30+ days) ---
  { id: 'ect-019', jobNumber: 'MIT-24055', customerName: 'Meridian Partners', status: 'Sent', hasEstimate: true, estimateValue: 28500, owner: 'Leo Champion', lineOfBusiness: 'LL',
    fnolDate: daysAgo(48), inspectionDate: daysAgo(45), estimateCreatedDate: daysAgo(42), estimateSentDate: daysAgo(35), approvedDate: null, nextFollowUpDate: null },
  { id: 'ect-020', jobNumber: 'REC-11728', customerName: 'Valley View Apts', status: 'Sent', hasEstimate: true, estimateValue: 15200, owner: 'Ramon Torres', lineOfBusiness: 'HB: RECON',
    fnolDate: daysAgo(55), inspectionDate: daysAgo(52), estimateCreatedDate: daysAgo(50), estimateSentDate: daysAgo(42), approvedDate: null, nextFollowUpDate: null },

  // --- Approved ---
  { id: 'ect-010', jobNumber: 'MIT-24080', customerName: 'Morrison Residence', status: 'Approved', hasEstimate: true, estimateValue: 22100, owner: 'Roger Hill', lineOfBusiness: 'HB: MIT',
    fnolDate: daysAgo(25), inspectionDate: daysAgo(23), estimateCreatedDate: daysAgo(22), estimateSentDate: daysAgo(18), approvedDate: daysAgo(10), nextFollowUpDate: null },
  { id: 'ect-011', jobNumber: 'REC-11790', customerName: 'Westwood Clinic', status: 'Approved', hasEstimate: true, estimateValue: 37500, owner: 'Aaron Kacel', lineOfBusiness: 'HB: RECON',
    fnolDate: daysAgo(28), inspectionDate: daysAgo(26), estimateCreatedDate: daysAgo(24), estimateSentDate: daysAgo(20), approvedDate: daysAgo(14), nextFollowUpDate: null },
  { id: 'ect-012', jobNumber: 'MIT-24065', customerName: 'Oakridge Elementary', status: 'Approved', hasEstimate: true, estimateValue: 58000, owner: 'Leo Champion', lineOfBusiness: 'LL',
    fnolDate: daysAgo(40), inspectionDate: daysAgo(38), estimateCreatedDate: daysAgo(36), estimateSentDate: daysAgo(30), approvedDate: daysAgo(22), nextFollowUpDate: null },
  { id: 'ect-013', jobNumber: 'REC-11760', customerName: 'Riverbend Mall', status: 'Approved', hasEstimate: true, estimateValue: 85000, owner: 'Ramon Torres', lineOfBusiness: 'HB: RECON',
    fnolDate: daysAgo(55), inspectionDate: daysAgo(52), estimateCreatedDate: daysAgo(50), estimateSentDate: daysAgo(45), approvedDate: daysAgo(38), nextFollowUpDate: null },
  { id: 'ect-016', jobNumber: 'MIT-24040', customerName: 'Hendersonville Fire Dept', status: 'Approved', hasEstimate: true, estimateValue: 120000, owner: 'Ramon Torres', lineOfBusiness: 'HB: MIT',
    fnolDate: daysAgo(85), inspectionDate: daysAgo(82), estimateCreatedDate: daysAgo(80), estimateSentDate: daysAgo(75), approvedDate: daysAgo(65), nextFollowUpDate: null },

  // --- Declined ---
  { id: 'ect-014', jobNumber: 'MIT-24088', customerName: 'Harper Residence', status: 'Declined', hasEstimate: true, estimateValue: 6200, owner: 'Kevin Shell', lineOfBusiness: 'LL',
    fnolDate: daysAgo(18), inspectionDate: daysAgo(16), estimateCreatedDate: daysAgo(15), estimateSentDate: daysAgo(12), approvedDate: null, nextFollowUpDate: null },
  { id: 'ect-015', jobNumber: 'REC-11755', customerName: 'Downtown Lofts LLC', status: 'Declined', hasEstimate: true, estimateValue: 9400, owner: 'Roger Hill', lineOfBusiness: 'HB: RECON',
    fnolDate: daysAgo(70), inspectionDate: daysAgo(67), estimateCreatedDate: daysAgo(65), estimateSentDate: daysAgo(60), approvedDate: null, nextFollowUpDate: null },
  { id: 'ect-017', jobNumber: 'REC-11740', customerName: 'Sylvan Park Bistro', status: 'Declined', hasEstimate: true, estimateValue: 4800, owner: 'Aaron Kacel', lineOfBusiness: 'LL',
    fnolDate: daysAgo(82), inspectionDate: daysAgo(79), estimateCreatedDate: daysAgo(78), estimateSentDate: daysAgo(74), approvedDate: null, nextFollowUpDate: null },
];

/* ================================================================== */
/*  Shared helpers                                                     */
/* ================================================================== */

function daysBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function avg(nums) {
  const valid = nums.filter((n) => n != null && Number.isFinite(n));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function formatDollars(value) {
  if (value >= 1000) {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return '$' + value.toFixed(0);
}

/* ================================================================== */
/*  KPI computation (8 cards)                                          */
/* ================================================================== */

export function getEstimateKPIs(tasks) {
  const now = Date.now();

  const pendingNoEstimate = tasks.filter(
    (t) => t.status === 'Pending' && !t.hasEstimate
  ).length;

  const openTasks = tasks.filter(
    (t) => !['Approved', 'Declined'].includes(t.status) && t.hasEstimate
  );
  const openDollarValue = openTasks.reduce((s, t) => s + (t.estimateValue || 0), 0);

  const fnolToInspDays = tasks
    .filter((t) => t.fnolDate && t.inspectionDate)
    .map((t) => daysBetween(t.fnolDate, t.inspectionDate));

  const inspToEstDays = tasks
    .filter((t) => t.inspectionDate && t.estimateCreatedDate)
    .map((t) => daysBetween(t.inspectionDate, t.estimateCreatedDate));

  const estToCloseDays = tasks
    .filter((t) => t.estimateSentDate && t.approvedDate)
    .map((t) => daysBetween(t.estimateSentDate, t.approvedDate));

  const fullCycleDays = tasks
    .filter((t) => t.fnolDate && t.approvedDate)
    .map((t) => daysBetween(t.fnolDate, t.approvedDate));

  const estimateValues = tasks
    .filter((t) => t.hasEstimate && t.estimateValue > 0)
    .map((t) => t.estimateValue);

  function approvalRate(windowDays) {
    const cutoff = new Date(now - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const decided = tasks.filter(
      (t) =>
        ['Approved', 'Declined'].includes(t.status) &&
        t.estimateSentDate &&
        t.estimateSentDate >= cutoff
    );
    if (decided.length === 0) return 0;
    const approved = decided.filter((t) => t.status === 'Approved').length;
    return Math.round((approved / decided.length) * 100);
  }

  function approvalRateYTD() {
    const jan1 = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const decided = tasks.filter(
      (t) =>
        ['Approved', 'Declined'].includes(t.status) &&
        t.estimateSentDate &&
        t.estimateSentDate >= jan1
    );
    if (decided.length === 0) return 0;
    const approved = decided.filter((t) => t.status === 'Approved').length;
    return Math.round((approved / decided.length) * 100);
  }

  const openOrPending = tasks.filter(
    (t) => !['Approved', 'Declined'].includes(t.status)
  );
  const noFollowUp = openOrPending.filter((t) => !t.nextFollowUpDate).length;

  return {
    pendingNoEstimate: { count: pendingNoEstimate },
    totalOpen: {
      count: openTasks.length,
      dollarValue: openDollarValue,
      dollarFormatted: formatDollars(openDollarValue),
    },
    fnolToInspection: { avgDays: Math.round(avg(fnolToInspDays) * 10) / 10 },
    inspectionToEstimate: { avgDays: Math.round(avg(inspToEstDays) * 10) / 10 },
    estimateToClose: { avgDays: Math.round(avg(estToCloseDays) * 10) / 10 },
    totalCycleTime: { avgDays: Math.round(avg(fullCycleDays) * 10) / 10 },
    avgEstimateDollar: {
      value: Math.round(avg(estimateValues)),
      formatted: formatDollars(Math.round(avg(estimateValues))),
    },
    approvalRate: {
      rate30: approvalRate(30),
      rate60: approvalRate(60),
      rateYTD: approvalRateYTD(),
    },
    noFollowUp: { count: noFollowUp },
  };
}

/* ================================================================== */
/*  Pipeline Funnel                                                    */
/* ================================================================== */

const FUNNEL_STAGES = ['Draft', 'Sent', 'Follow-Up Needed', 'Approved', 'Declined', 'Expired'];

function funnelStageFor(task) {
  if (task.status === 'Drafting') return 'Draft';
  if (task.status === 'Pending' && task.hasEstimate) return 'Draft';
  if (task.status === 'Approved') return 'Approved';
  if (task.status === 'Declined') return 'Declined';
  if (task.status === 'Sent') {
    const sentDays = daysBetween(task.estimateSentDate, new Date().toISOString());
    if (sentDays != null && sentDays >= 30) return 'Expired';
    if (!task.nextFollowUpDate || new Date(task.nextFollowUpDate) <= new Date()) {
      return 'Follow-Up Needed';
    }
    return 'Sent';
  }
  return null; // Pending w/o estimate — not in funnel
}

export function getPipelineFunnel(tasks) {
  const buckets = {};
  FUNNEL_STAGES.forEach((s) => { buckets[s] = { stage: s, count: 0, dollarValue: 0 }; });

  tasks.forEach((t) => {
    const stage = funnelStageFor(t);
    if (stage && buckets[stage]) {
      buckets[stage].count += 1;
      buckets[stage].dollarValue += t.estimateValue || 0;
    }
  });

  return FUNNEL_STAGES.map((s) => ({
    ...buckets[s],
    dollarFormatted: formatDollars(buckets[s].dollarValue),
  }));
}

/* ================================================================== */
/*  Estimator Leaderboard                                              */
/* ================================================================== */

export function getEstimatorLeaderboard(tasks) {
  const byOwner = {};

  tasks.forEach((t) => {
    if (!t.owner) return;
    if (!byOwner[t.owner]) {
      byOwner[t.owner] = { name: t.owner, all: [], open: [], approved: [], declined: [] };
    }
    byOwner[t.owner].all.push(t);
    if (!['Approved', 'Declined'].includes(t.status)) byOwner[t.owner].open.push(t);
    if (t.status === 'Approved') byOwner[t.owner].approved.push(t);
    if (t.status === 'Declined') byOwner[t.owner].declined.push(t);
  });

  return Object.values(byOwner)
    .map((o) => {
      const decided = o.approved.length + o.declined.length;
      const rate = decided > 0 ? Math.round((o.approved.length / decided) * 100) : null;
      const totalVal = o.open.reduce((s, t) => s + (t.estimateValue || 0), 0);
      const openWithValue = o.open.filter((t) => t.estimateValue > 0);
      const avgVal = openWithValue.length > 0 ? avg(openWithValue.map((t) => t.estimateValue)) : 0;

      const fnolToEst = o.all
        .filter((t) => t.fnolDate && t.estimateCreatedDate)
        .map((t) => daysBetween(t.fnolDate, t.estimateCreatedDate));
      const estToConversion = o.approved
        .filter((t) => t.estimateSentDate && t.approvedDate)
        .map((t) => daysBetween(t.estimateSentDate, t.approvedDate));
      const totalCycle = o.approved
        .filter((t) => t.fnolDate && t.approvedDate)
        .map((t) => daysBetween(t.fnolDate, t.approvedDate));

      return {
        name: o.name,
        openCount: o.open.length,
        totalValue: totalVal,
        totalValueFormatted: formatDollars(totalVal),
        avgValue: Math.round(avgVal),
        avgValueFormatted: formatDollars(Math.round(avgVal)),
        conversionRate: rate,
        avgFnolToEstimate: fnolToEst.length > 0 ? Math.round(avg(fnolToEst) * 10) / 10 : null,
        avgEstToConversion: estToConversion.length > 0 ? Math.round(avg(estToConversion) * 10) / 10 : null,
        avgTotalCycle: totalCycle.length > 0 ? Math.round(avg(totalCycle) * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.openCount - a.openCount);
}

/* ================================================================== */
/*  Aging Heatmap                                                      */
/* ================================================================== */

export function getAgingHeatmap(tasks) {
  const now = new Date();
  const buckets = [
    { label: '0-7 days', min: 0, max: 7, count: 0, cls: 'aging-green' },
    { label: '8-14 days', min: 8, max: 14, count: 0, cls: 'aging-yellow' },
    { label: '15-30 days', min: 15, max: 30, count: 0, cls: 'aging-orange' },
    { label: '30+ days', min: 31, max: Infinity, count: 0, cls: 'aging-red' },
  ];

  tasks
    .filter((t) => t.hasEstimate && !['Approved', 'Declined'].includes(t.status))
    .forEach((t) => {
      const origin = t.estimateCreatedDate || t.fnolDate;
      if (!origin) return;
      const age = Math.floor((now - new Date(origin)) / (1000 * 60 * 60 * 24));
      for (const b of buckets) {
        if (age >= b.min && age <= b.max) { b.count += 1; break; }
      }
    });

  return buckets;
}
