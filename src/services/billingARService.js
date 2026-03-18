// Billing & AR Service - Supabase queries for AR jobs, KPI calculations, collection logging
import { supabase, handleSupabaseResult } from './supabaseClient';
import jobService from './jobService';

const TABLE = 'jobs';

// "Last, First" → "First Last"
function flipName(name) {
  if (!name || typeof name !== 'string') return name;
  const parts = name.split(',');
  if (parts.length === 2) {
    const last = parts[0].trim();
    const first = parts[1].trim();
    if (first && last) return `${first} ${last}`;
  }
  return name.trim();
}

const billingARService = {
  // Get all jobs with outstanding AR balance
  async getOutstandingAR() {
    const response = await supabase
      .from(TABLE)
      .select(`
        id, job_number, external_job_number, division, pm, status, stage,
        invoiced_amount, ar_balance, date_invoiced, date_paid,
        estimate_value, insurance_company, insurance_adjuster_name, insurance_adjuster_email,
        date_of_loss, date_received, date_started,
        customers(id, name, phone, email, billing_contact),
        properties(address1, address2, city, state, postal_code)
      `)
      .or('ar_balance.gt.0,and(invoiced_amount.gt.0,date_paid.is.null)')
      .order('ar_balance', { ascending: false });

    // Flatten nested data
    if (response.data) {
      response.data = response.data.map(job => ({
        ...job,
        customer_name: flipName(job.customers?.name) || 'Unknown',
        customer_email: job.customers?.email || '',
        customer_phone: job.customers?.phone || '',
        billing_contact: job.customers?.billing_contact || '',
        customer_id: job.customers?.id || null,
        property_address: job.properties
          ? [
              job.properties.address1,
              job.properties.address2,
              job.properties.city,
              job.properties.state,
              job.properties.postal_code
            ].filter(Boolean).join(', ')
          : 'Unknown',
        property_city: job.properties?.city || '',
        property_state: job.properties?.state || '',
        display_job_number: job.job_number || job.external_job_number || '—',
        assigned_pm_display: job.pm || '—',
      }));
    }

    return handleSupabaseResult(response);
  },

  // Mark a job as paid
  async markJobPaid(jobId) {
    const today = new Date().toISOString().split('T')[0];
    return jobService.update(jobId, {
      date_paid: today,
      ar_balance: 0,
    });
  },

  // Log a collection activity (uses crm_activities table)
  async logCollectionActivity(jobId, data) {
    const response = await supabase
      .from('crm_activities')
      .insert([{
        job_id: jobId,
        activity_type: 'collection_contact',
        contact_method: data.contact_method,
        notes: data.notes,
        next_action_date: data.next_action_date || null,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Get collection activities for a job
  async getCollectionActivities(jobId) {
    const response = await supabase
      .from('crm_activities')
      .select('*')
      .eq('job_id', jobId)
      .eq('activity_type', 'collection_contact')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },
};

/* ================================================================== */
/*  Pure KPI / Calculation Functions (no DB calls)                     */
/* ================================================================== */

export function calcDaysOutstanding(dateInvoiced) {
  if (!dateInvoiced) return 0;
  const invoiced = new Date(dateInvoiced);
  const today = new Date();
  const diff = today - invoiced;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function calcAgingBuckets(jobs) {
  const buckets = [
    { label: '0–30 days', min: 0, max: 30, count: 0, dollars: 0, color: '#16A34A', bg: '#DCFCE7', cls: 'aging-green' },
    { label: '31–60 days', min: 31, max: 60, count: 0, dollars: 0, color: '#D97706', bg: '#FEF3C7', cls: 'aging-yellow' },
    { label: '61–90 days', min: 61, max: 90, count: 0, dollars: 0, color: '#EA580C', bg: '#FEF3C7', cls: 'aging-orange' },
    { label: '90+ days', min: 91, max: Infinity, count: 0, dollars: 0, color: '#DC2626', bg: '#FEF2F2', cls: 'aging-red' },
  ];

  jobs.forEach(job => {
    const days = calcDaysOutstanding(job.date_invoiced);
    const balance = Number(job.ar_balance) || 0;
    for (const bucket of buckets) {
      if (days >= bucket.min && days <= bucket.max) {
        bucket.count++;
        bucket.dollars += balance;
        break;
      }
    }
  });

  return buckets;
}

export function calcKPIs(jobs) {
  const totalAR = jobs.reduce((sum, j) => sum + (Number(j.ar_balance) || 0), 0);

  const arByDivision = {};
  jobs.forEach(j => {
    const div = j.division || 'Other';
    arByDivision[div] = (arByDivision[div] || 0) + (Number(j.ar_balance) || 0);
  });

  const daysArr = jobs
    .filter(j => j.date_invoiced)
    .map(j => calcDaysOutstanding(j.date_invoiced));
  const avgARDays = daysArr.length > 0
    ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length)
    : 0;

  const jobsOver90 = jobs.filter(j => calcDaysOutstanding(j.date_invoiced) > 90).length;

  const totalInvoiced = jobs.reduce((sum, j) => sum + (Number(j.invoiced_amount) || 0), 0);
  const collectionRate = totalInvoiced > 0
    ? Math.round(((totalInvoiced - totalAR) / totalInvoiced) * 100)
    : 0;

  return {
    totalAR,
    arByDivision,
    avgARDays,
    jobsOver90,
    totalInvoiced,
    collectionRate,
  };
}

export default billingARService;
