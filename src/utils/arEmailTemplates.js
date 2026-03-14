// AR Email Templates - mailto: URI builders for collection communications

function fmt(amount) {
  return '$' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Customer AR Reminder — friendly tone, references job #, invoice amount, balance, days outstanding
 */
export function buildCustomerReminderMailto(job) {
  const subject = encodeURIComponent(
    `Payment Reminder: Invoice for Job ${job.display_job_number} — ${fmt(job.ar_balance)} Outstanding`
  );
  const body = encodeURIComponent(
    `Dear ${job.billing_contact || job.customer_name},\n\n` +
    `I hope this message finds you well. I'm reaching out regarding an outstanding balance on your account.\n\n` +
    `Job #: ${job.display_job_number}\n` +
    `Property: ${job.property_address}\n` +
    `Invoice Amount: ${fmt(job.invoiced_amount)}\n` +
    `Outstanding Balance: ${fmt(job.ar_balance)}\n` +
    `Date Invoiced: ${job.date_invoiced || 'N/A'}\n` +
    `Days Outstanding: ${job.days_outstanding || 'N/A'}\n\n` +
    `We would appreciate your prompt attention to this matter. If you have already submitted payment, please disregard this notice.\n\n` +
    `If you have any questions regarding the invoice or need to discuss payment arrangements, please don't hesitate to reach out.\n\n` +
    `Thank you for your business.\n\n` +
    `Best regards`
  );
  const to = job.customer_email ? encodeURIComponent(job.customer_email) : '';
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Adjuster Follow-Up — references claim info, requests payment status
 */
export function buildAdjusterFollowUpMailto(job) {
  const subject = encodeURIComponent(
    `Payment Status Inquiry: Job ${job.display_job_number} — ${job.customer_name}`
  );
  const body = encodeURIComponent(
    `Hello,\n\n` +
    `I'm following up on the payment status for the following claim:\n\n` +
    `Job #: ${job.display_job_number}\n` +
    `Insured: ${job.customer_name}\n` +
    `Property: ${job.property_address}\n` +
    `Insurance Company: ${job.insurance_company || 'N/A'}\n` +
    `Adjuster: ${job.insurance_adjuster_name || 'N/A'}\n` +
    `Invoice Amount: ${fmt(job.invoiced_amount)}\n` +
    `Outstanding Balance: ${fmt(job.ar_balance)}\n` +
    `Date Invoiced: ${job.date_invoiced || 'N/A'}\n` +
    `Days Outstanding: ${job.days_outstanding || 'N/A'}\n\n` +
    `Could you please provide an update on the payment status for this claim? We'd appreciate any information on the expected timeline for payment.\n\n` +
    `Thank you for your assistance.\n\n` +
    `Best regards`
  );
  const to = job.insurance_adjuster_email ? encodeURIComponent(job.insurance_adjuster_email) : '';
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Escalation (90+ days) — firmer tone for severely aged balances
 */
export function buildEscalationMailto(job) {
  const subject = encodeURIComponent(
    `URGENT: Past Due Balance — Job ${job.display_job_number} (${job.days_outstanding}+ Days)`
  );
  const body = encodeURIComponent(
    `Dear ${job.billing_contact || job.customer_name},\n\n` +
    `This is a follow-up regarding a significantly past-due balance on your account that requires immediate attention.\n\n` +
    `Job #: ${job.display_job_number}\n` +
    `Property: ${job.property_address}\n` +
    `Invoice Amount: ${fmt(job.invoiced_amount)}\n` +
    `Outstanding Balance: ${fmt(job.ar_balance)}\n` +
    `Date Invoiced: ${job.date_invoiced || 'N/A'}\n` +
    `Days Outstanding: ${job.days_outstanding || 'N/A'}\n\n` +
    `This balance is now over ${job.days_outstanding || 90} days past due. We have made previous attempts to resolve this matter and would like to work with you to bring this account current.\n\n` +
    `Please contact us at your earliest convenience to discuss payment options. If payment has already been submitted, please provide confirmation so we can update our records.\n\n` +
    `Thank you for your prompt attention to this matter.\n\n` +
    `Regards`
  );
  const to = job.customer_email ? encodeURIComponent(job.customer_email) : '';
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Bulk email — BCC all selected customer emails
 */
export function buildBulkReminderMailto(jobs) {
  const emails = jobs
    .map(j => j.customer_email)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  const subject = encodeURIComponent('Payment Reminder: Outstanding Balance');
  const body = encodeURIComponent(
    `Dear Valued Customer,\n\n` +
    `This is a friendly reminder that you have an outstanding balance on your account. ` +
    `Please review your most recent invoice and submit payment at your earliest convenience.\n\n` +
    `If you have already submitted payment, please disregard this notice.\n\n` +
    `Thank you for your business.\n\n` +
    `Best regards`
  );
  const bcc = encodeURIComponent(emails.join(','));
  return `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
}

/**
 * Bulk email — BCC all selected adjuster emails
 */
export function buildBulkAdjusterMailto(jobs) {
  const emails = jobs
    .map(j => j.insurance_adjuster_email)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  const subject = encodeURIComponent('Payment Status Inquiry: Outstanding Claims');
  const body = encodeURIComponent(
    `Hello,\n\n` +
    `I'm following up on the payment status for outstanding claims associated with your office. ` +
    `We have several invoices pending payment and would appreciate an update on the expected timeline.\n\n` +
    `Please let us know if you need any additional documentation to process these payments.\n\n` +
    `Thank you for your assistance.\n\n` +
    `Best regards`
  );
  const bcc = encodeURIComponent(emails.join(','));
  return `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
}
