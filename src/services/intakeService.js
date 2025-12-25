// Intake Service - Handles creating customer, property, and job from intake form
import customerService from './customerService';
import propertyService from './propertyService';
import jobService from './jobService';
import { supabase, handleSupabaseResult } from './supabaseClient';

const intakeService = {
  /**
   * Get next sequential job number from database
   * @param {string} division - Division name (MIT, RECON, Large Loss, Referral)
   * @returns {string} Job number in format YY-DIVISION-####
   */
  async getNextJobNumber(division) {
    try {
      const { data, error } = await supabase.rpc('get_next_job_number', {
        div: division
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting job number:', error);
      // Fallback to timestamp-based if database function fails
      const yearShort = new Date().getFullYear().toString().slice(-2);
      const divCode = division === 'HB - Nashville' ? 'HBN' :
                      division === 'Referral' ? 'REF' :
                      division === 'Large Loss' ? 'LL' :
                      division === 'RECON' ? 'REC' :
                      division === 'MIT' ? 'MIT' : 'GEN';
      return `${yearShort}-${divCode}-${String(Date.now()).slice(-4)}`;
    }
  },

  /**
   * Submit a complete intake form
   * Creates customer, property, and job records
   * @param {Object} intakeData - The intake form data
   * @returns {Object} Created records { customer, property, job }
   */
  async submitIntake(intakeData) {
    try {
      // Check if this is a Referral or Large Loss intake
      const isReferral = intakeData.division === 'Referral' || intakeData.division === 'Large Loss';

      // Step 1: Create or find customer
      const customerData = isReferral ? {
        name: intakeData.customerName, // Company/Client name - goes to CRM company field
        billing_contact: null, // Leave billing contact empty for Large Loss/Referral
        phone: intakeData.customerPhone,
        email: intakeData.customerEmail,
        notes: `${intakeData.division} Intake\n${intakeData.notes || ''}`
      } : {
        name: intakeData.callerName,
        billing_contact: intakeData.callerName,
        phone: intakeData.callerPhone,
        email: intakeData.callerEmail,
        notes: `Caller Type: ${intakeData.callerType}\nRelationship: ${intakeData.relationship || 'N/A'}\n${intakeData.notes || ''}`
      };

      const customer = await customerService.create(customerData);

      // Step 2: Create property
      const propertyData = isReferral ? {
        customer_id: customer.id,
        name: intakeData.jobName || 'Referral Property',
        address1: intakeData.address || '',
        address2: '',
        city: intakeData.city || '',
        state: intakeData.state || '',
        postal_code: intakeData.zip || '',
        country: 'USA',
        notes: `Access: ${intakeData.access || 'N/A'}\nOnsite Contact: ${intakeData.onsiteName || 'N/A'} - ${intakeData.onsitePhone || 'N/A'}`
      } : {
        customer_id: customer.id,
        name: 'Loss Location',
        address1: intakeData.address,
        address2: '',
        city: intakeData.city || '',
        state: intakeData.state || '',
        postal_code: intakeData.zip || '',
        country: 'USA',
        notes: `Access: ${intakeData.access || 'N/A'}\nOnsite Contact: ${intakeData.onsiteName || 'N/A'} - ${intakeData.onsitePhone || 'N/A'}`
      };

      const property = await propertyService.create(propertyData);

      // Step 3: Create job
      // Generate sequential job number: YY-DIVISION-####
      const jobNumber = await this.getNextJobNumber(intakeData.division);

      const jobData = isReferral ? {
        job_number: jobNumber,
        customer_id: customer.id,
        property_id: property.id,
        status: 'pending',
        loss_type: intakeData.division === 'Referral' ? 'Referral' : 'Large Loss',
        property_type: intakeData.propertyType || 'Commercial', // Default to Commercial for Large Loss/Referral
        date_opened: new Date().toISOString().split('T')[0],
        scope_summary: `${intakeData.division} Job`,
        referral_source: intakeData.division,
        is_emergency: false,
        division: intakeData.division,
        // Referral-specific dedicated columns
        job_name: intakeData.jobName || null,
        insurance_company: intakeData.insuranceCompany || null,
        insurance_policy_number: intakeData.insurancePolicyNumber || null,
        insurance_adjuster_name: intakeData.insuranceAdjusterName || null,
        insurance_adjuster_phone: intakeData.insuranceAdjusterPhone || null,
        insurance_adjuster_email: intakeData.insuranceAdjusterEmail || null,
        restoration_company: intakeData.restorationCompany || null,
        restoration_contact: intakeData.restorationContact || null,
        restoration_phone: intakeData.restorationPhone || null,
        restoration_email: intakeData.restorationEmail || null,
        internal_notes: intakeData.notes || null  // Only additional notes from user
      } : {
        job_number: jobNumber,
        customer_id: customer.id,
        property_id: property.id,
        status: 'pending',
        loss_type: intakeData.lossType,
        property_type: intakeData.propertyType || null,
        loss_cause: intakeData.source || null,
        date_of_loss: intakeData.lossDate || null,
        date_opened: new Date().toISOString().split('T')[0],
        scope_summary: this._buildScopeSummary(intakeData),
        internal_notes: this._buildInternalNotes(intakeData),
        referral_source: intakeData.callerType,
        is_emergency: intakeData.urgency === 'Emergency',
        division: intakeData.division
      };

      const job = await jobService.create(jobData);

      return {
        success: true,
        customer,
        property,
        job,
        jobNumber
      };

    } catch (error) {
      console.error('Intake submission error:', error);
      throw new Error(error.message || 'Failed to submit intake form');
    }
  },

  /**
   * Build scope summary from intake data
   */
  _buildScopeSummary(data) {
    const parts = [];

    if (data.lossType) parts.push(`Loss Type: ${data.lossType}`);
    if (data.category) parts.push(`Category: ${data.category}`);
    if (data.wclass) parts.push(`Class: ${data.wclass}`);
    if (data.affectedAreas && data.affectedAreas.length > 0) {
      parts.push(`Affected Areas: ${data.affectedAreas.join(', ')}`);
    }
    if (data.sqft) parts.push(`Est. SF: ${data.sqft}`);
    if (data.activeLeak) parts.push(`Active Leak: ${data.activeLeak}`);

    return parts.join(' | ');
  },

  /**
   * Build internal notes from intake data
   */
  _buildInternalNotes(data) {
    const notes = [];

    notes.push(`=== INTAKE INFORMATION ===`);
    notes.push(`Division: ${data.division}`);
    notes.push(`Urgency: ${data.urgency || 'Not specified'}`);
    notes.push(`Arrival Window: ${data.arrival || 'Not specified'}`);

    if (data.carrier || data.claim) {
      notes.push(`\n=== INSURANCE ===`);
      if (data.carrier) notes.push(`Carrier: ${data.carrier}`);
      if (data.claim) notes.push(`Claim #: ${data.claim}`);
      if (data.adjName) notes.push(`Adjuster: ${data.adjName}`);
      if (data.adjEmail) notes.push(`Adjuster Email: ${data.adjEmail}`);
      if (data.adjPhone) notes.push(`Adjuster Phone: ${data.adjPhone}`);
      if (data.deductible) notes.push(`Deductible: ${data.deductible}`);
      if (data.coverage) notes.push(`Coverage: ${data.coverage}`);
    }

    if (data.authReq || data.payMethod) {
      notes.push(`\n=== AUTHORIZATION ===`);
      if (data.authReq) notes.push(`Auth Required: ${data.authReq}`);
      if (data.payMethod) notes.push(`Payment Method: ${data.payMethod}`);
      if (data.authSigner) notes.push(`Authorized Signer: ${data.authSigner}`);
      if (data.authPhone) notes.push(`Auth Contact: ${data.authPhone}`);
    }

    if (data.branch || data.assigned) {
      notes.push(`\n=== ASSIGNMENT ===`);
      if (data.branch) notes.push(`Branch: ${data.branch}`);
      if (data.assigned) notes.push(`Assigned To: ${data.assigned}`);
    }

    if (data.notes) {
      notes.push(`\n=== ADDITIONAL NOTES ===`);
      notes.push(data.notes);
    }

    return notes.join('\n');
  },

  /**
   * Build internal notes for Referral intake
   */
  _buildReferralNotes(data) {
    const notes = [];

    notes.push(`=== REFERRAL INTAKE ===`);
    notes.push(`Division: Referral`);
    notes.push(`Date: ${new Date().toLocaleDateString()}`);
    if (data.jobName) notes.push(`Job Name: ${data.jobName}`);

    notes.push(`\n=== CUSTOMER INFORMATION ===`);
    if (data.customerName) notes.push(`Customer: ${data.customerName}`);
    if (data.customerPhone) notes.push(`Phone: ${data.customerPhone}`);
    if (data.customerEmail) notes.push(`Email: ${data.customerEmail}`);

    notes.push(`\n=== PROPERTY & ACCESS ===`);
    if (data.address) notes.push(`Address: ${data.address}`);
    if (data.city || data.state || data.zip) {
      notes.push(`Location: ${data.city || ''}, ${data.state || ''} ${data.zip || ''}`);
    }
    if (data.access) notes.push(`Access: ${data.access}`);
    if (data.onsiteName) notes.push(`Onsite Contact: ${data.onsiteName}`);
    if (data.onsitePhone) notes.push(`Onsite Phone: ${data.onsitePhone}`);

    if (data.insuranceCompany || data.insurancePolicyNumber || data.insuranceAdjusterName) {
      notes.push(`\n=== INSURANCE COMPANY ===`);
      if (data.insuranceCompany) notes.push(`Company: ${data.insuranceCompany}`);
      if (data.insurancePolicyNumber) notes.push(`Policy #: ${data.insurancePolicyNumber}`);
      if (data.insuranceAdjusterName) notes.push(`Adjuster: ${data.insuranceAdjusterName}`);
      if (data.insuranceAdjusterPhone) notes.push(`Adjuster Phone: ${data.insuranceAdjusterPhone}`);
      if (data.insuranceAdjusterEmail) notes.push(`Adjuster Email: ${data.insuranceAdjusterEmail}`);
    }

    if (data.restorationCompany || data.restorationContact) {
      notes.push(`\n=== RESTORATION COMPANY EXECUTING REFERRAL ===`);
      if (data.restorationCompany) notes.push(`Company: ${data.restorationCompany}`);
      if (data.restorationContact) notes.push(`Contact: ${data.restorationContact}`);
      if (data.restorationPhone) notes.push(`Phone: ${data.restorationPhone}`);
      if (data.restorationEmail) notes.push(`Email: ${data.restorationEmail}`);
    }

    if (data.notes) {
      notes.push(`\n=== ADDITIONAL NOTES ===`);
      notes.push(data.notes);
    }

    return notes.join('\n');
  }
};

export default intakeService;
