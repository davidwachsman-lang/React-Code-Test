import React, { useState } from 'react';
import playbookService from '../../services/playbookService';
import { jsPDF } from 'jspdf';

function PlaybookTab() {
  const [playbookFormData, setPlaybookFormData] = useState({
    // Contact Section
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    contactCompany: '',
    insuranceProvider: '',
    agentName: '',
    agentEmail: '',
    agentPhone: '',

    // Property Section
    propertyAddress: '',
    propertyType: '',
    propertySize: '',
    propertyAge: '',
    numberOfBuildings: '',
    numberOfUnits: '',
    currentChallenges: '',

    // Process Section
    currentProcess: '',
    processChallenges: '',

    // Current Providers Section
    currentProviders: '',
    providerSatisfaction: '',
    providerImprovements: '',

    // Maintenance / Management Section
    numberOfMaintenanceEngineers: '',
    lastTraining: '',
    equipment: '',

    // Loss History Section
    recentLosses: '',
    lastEvent: '',
    eventType24Months: [],
    outsourcingScale: '',
    protocolForCallout: '',
    eventsAnnually: '',

    // Organization Structure Section
    portfolioManagers: '',
    regionalManagers: '',
    propertyManagers: '',
    maintenanceSupervisors: '',
    directorEngineeringMaintenance: '',

    // Commitment Section
    projectedJobDate: '',
    interactionPlanStrategy: ''
  });

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 5;

    const checkPageBreak = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    const addText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text || 'N/A', maxWidth);
      doc.text(lines, x, y);
      return lines.length * lineHeight;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Insight Meeting Playbook', margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += sectionSpacing + 5;

    // Section 1: Contact
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('1. Contact', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Name: ${playbookFormData.contactName}`, margin, yPosition, 170);
    yPosition += addText(`Title: ${playbookFormData.contactTitle}`, margin, yPosition, 170);
    yPosition += addText(`Email: ${playbookFormData.contactEmail}`, margin, yPosition, 170);
    yPosition += addText(`Phone: ${playbookFormData.contactPhone}`, margin, yPosition, 170);
    yPosition += addText(`Company: ${playbookFormData.contactCompany}`, margin, yPosition, 170);
    yPosition += addText(`Insurance Provider: ${playbookFormData.insuranceProvider}`, margin, yPosition, 170);
    yPosition += addText(`Agent Name: ${playbookFormData.agentName}`, margin, yPosition, 170);
    yPosition += addText(`Agent Email: ${playbookFormData.agentEmail}`, margin, yPosition, 170);
    yPosition += addText(`Agent Phone: ${playbookFormData.agentPhone}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 2: Property
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('2. Property', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Property Address: ${playbookFormData.propertyAddress}`, margin, yPosition, 170);
    yPosition += addText(`Property Type: ${playbookFormData.propertyType}`, margin, yPosition, 170);
    yPosition += addText(`Property Size: ${playbookFormData.propertySize}`, margin, yPosition, 170);
    yPosition += addText(`Property Age: ${playbookFormData.propertyAge}`, margin, yPosition, 170);
    yPosition += addText(`Number of Buildings: ${playbookFormData.numberOfBuildings}`, margin, yPosition, 170);
    yPosition += addText(`Number of Units: ${playbookFormData.numberOfUnits}`, margin, yPosition, 170);
    yPosition += addText(`Current Challenges: ${playbookFormData.currentChallenges}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 3: Process
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('3. Process', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Current Process: ${playbookFormData.currentProcess}`, margin, yPosition, 170);
    yPosition += addText(`Process Challenges: ${playbookFormData.processChallenges}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 4: Current Providers
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('4. Current Providers', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Current Providers: ${playbookFormData.currentProviders}`, margin, yPosition, 170);
    yPosition += addText(`Provider Satisfaction: ${playbookFormData.providerSatisfaction}`, margin, yPosition, 170);
    yPosition += addText(`How/What could they improve?: ${playbookFormData.providerImprovements}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 5: Maintenance / Management
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('5. Maintenance / Management', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Number of maintenance / engineers: ${playbookFormData.numberOfMaintenanceEngineers}`, margin, yPosition, 170);
    yPosition += addText(`Last Training (What/When): ${playbookFormData.lastTraining}`, margin, yPosition, 170);
    yPosition += addText(`Equipment (Dehus, air movers, moister readers): ${playbookFormData.equipment}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 6: Loss History
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('6. Loss History', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Recent Losses: ${playbookFormData.recentLosses}`, margin, yPosition, 170);
    yPosition += addText(`Last Event (When / Details): ${playbookFormData.lastEvent}`, margin, yPosition, 170);
    const eventTypes = playbookFormData.eventType24Months.length > 0
      ? playbookFormData.eventType24Months.join(', ')
      : 'None';
    yPosition += addText(`Event Type in last 24 months: ${eventTypes}`, margin, yPosition, 170);
    yPosition += addText(`Emergency event Outsourcing Scale: ${playbookFormData.outsourcingScale}`, margin, yPosition, 170);
    yPosition += addText(`Protocol for deciding what gets called out: ${playbookFormData.protocolForCallout}`, margin, yPosition, 170);
    yPosition += addText(`Number of events annually: ${playbookFormData.eventsAnnually}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 7: Organization Structure
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('7. Organization Structure', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Portfolio Managers: ${playbookFormData.portfolioManagers}`, margin, yPosition, 170);
    yPosition += addText(`Regional Managers: ${playbookFormData.regionalManagers}`, margin, yPosition, 170);
    yPosition += addText(`Property Managers: ${playbookFormData.propertyManagers}`, margin, yPosition, 170);
    yPosition += addText(`Maintenance Supervisors: ${playbookFormData.maintenanceSupervisors}`, margin, yPosition, 170);
    yPosition += addText(`Director of Engineering / Maintenance: ${playbookFormData.directorEngineeringMaintenance}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 8: Commitment
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('8. Commitment', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition += addText(`Projected Job Date: ${playbookFormData.projectedJobDate}`, margin, yPosition, 170);
    yPosition += addText(`Initial Commitment Interaction Plan / Strategy: ${playbookFormData.interactionPlanStrategy}`, margin, yPosition, 170);

    // Save the PDF
    const fileName = `Insight_Meeting_Playbook_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="customers-container">
      <div className="customers-header">
        <h2>Insight Meeting Playbook</h2>
      </div>
      <div className="playbook-form-container">
        <form className="playbook-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            const savedPlaybook = await playbookService.create(playbookFormData);
            console.log('Playbook saved:', savedPlaybook);
            alert('Playbook saved successfully!');
          } catch (error) {
            console.error('Error saving playbook:', error);
            alert(`Error saving playbook: ${error.message}`);
          }
        }}>
          {/* Section 1: Contact */}
          <div className="form-section-header">1. Contact</div>
          <div className="form-row">
            <div className="form-group">
              <label>Contact Name</label>
              <input
                type="text"
                name="contactName"
                value={playbookFormData.contactName}
                onChange={(e) => setPlaybookFormData({...playbookFormData, contactName: e.target.value})}
                placeholder="Full name"
              />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="contactTitle"
                value={playbookFormData.contactTitle}
                onChange={(e) => setPlaybookFormData({...playbookFormData, contactTitle: e.target.value})}
                placeholder="Job title"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="contactEmail"
                value={playbookFormData.contactEmail}
                onChange={(e) => setPlaybookFormData({...playbookFormData, contactEmail: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="contactPhone"
                value={playbookFormData.contactPhone}
                onChange={(e) => setPlaybookFormData({...playbookFormData, contactPhone: formatPhoneNumber(e.target.value)})}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Company</label>
            <input
              type="text"
              name="contactCompany"
              value={playbookFormData.contactCompany}
              onChange={(e) => setPlaybookFormData({...playbookFormData, contactCompany: e.target.value})}
              placeholder="Company name"
            />
          </div>
          <div className="form-group">
            <label>Insurance Provider</label>
            <input
              type="text"
              name="insuranceProvider"
              value={playbookFormData.insuranceProvider}
              onChange={(e) => setPlaybookFormData({...playbookFormData, insuranceProvider: e.target.value})}
              placeholder="Insurance company name"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Agent Name</label>
              <input
                type="text"
                name="agentName"
                value={playbookFormData.agentName}
                onChange={(e) => setPlaybookFormData({...playbookFormData, agentName: e.target.value})}
                placeholder="Insurance agent name"
              />
            </div>
            <div className="form-group">
              <label>Agent Email</label>
              <input
                type="email"
                name="agentEmail"
                value={playbookFormData.agentEmail}
                onChange={(e) => setPlaybookFormData({...playbookFormData, agentEmail: e.target.value})}
                placeholder="agent@email.com"
              />
            </div>
            <div className="form-group">
              <label>Agent Phone</label>
              <input
                type="tel"
                name="agentPhone"
                value={playbookFormData.agentPhone}
                onChange={(e) => setPlaybookFormData({...playbookFormData, agentPhone: formatPhoneNumber(e.target.value)})}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div className="form-section-divider"></div>

          {/* Section 2: Property */}
          <div className="form-section-header">2. Property</div>
          <div className="form-group">
            <label>Property Address</label>
            <input
              type="text"
              name="propertyAddress"
              value={playbookFormData.propertyAddress}
              onChange={(e) => setPlaybookFormData({...playbookFormData, propertyAddress: e.target.value})}
              placeholder="Full property address"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Property Type</label>
              <select
                name="propertyType"
                value={playbookFormData.propertyType}
                onChange={(e) => setPlaybookFormData({...playbookFormData, propertyType: e.target.value})}
              >
                <option value="">Select type...</option>
                <option value="multi-family">Multi-Family (Apts)</option>
                <option value="condos">Condos</option>
                <option value="office">Office</option>
                <option value="education">Education</option>
                <option value="industrial">Industrial</option>
                <option value="medical">Medical</option>
                <option value="retail">Retail</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Property Size (sq ft)</label>
              <input
                type="text"
                name="propertySize"
                value={playbookFormData.propertySize}
                onChange={(e) => setPlaybookFormData({...playbookFormData, propertySize: e.target.value})}
                placeholder="Square footage"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Property Age</label>
              <input
                type="text"
                name="propertyAge"
                value={playbookFormData.propertyAge}
                onChange={(e) => setPlaybookFormData({...playbookFormData, propertyAge: e.target.value})}
                placeholder="Years or year built"
              />
            </div>
            <div className="form-group">
              <label>Number of Buildings</label>
              <input
                type="text"
                name="numberOfBuildings"
                value={playbookFormData.numberOfBuildings}
                onChange={(e) => setPlaybookFormData({...playbookFormData, numberOfBuildings: e.target.value})}
                placeholder="Total buildings"
              />
            </div>
            <div className="form-group">
              <label>Number of Units</label>
              <input
                type="text"
                name="numberOfUnits"
                value={playbookFormData.numberOfUnits}
                onChange={(e) => setPlaybookFormData({...playbookFormData, numberOfUnits: e.target.value})}
                placeholder="Total units"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Current Challenges at Property</label>
            <textarea
              name="currentChallenges"
              value={playbookFormData.currentChallenges}
              onChange={(e) => setPlaybookFormData({...playbookFormData, currentChallenges: e.target.value})}
              placeholder="Describe current challenges at the property"
              rows="3"
            />
          </div>

          <div className="form-section-divider"></div>

          {/* Section 3: Process */}
          <div className="form-section-header">3. Process</div>
          <div className="form-group">
            <label>Current Process</label>
            <textarea
              name="currentProcess"
              value={playbookFormData.currentProcess}
              onChange={(e) => setPlaybookFormData({...playbookFormData, currentProcess: e.target.value})}
              placeholder="Describe their current process for handling restoration/maintenance"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Process Challenges</label>
            <textarea
              name="processChallenges"
              value={playbookFormData.processChallenges}
              onChange={(e) => setPlaybookFormData({...playbookFormData, processChallenges: e.target.value})}
              placeholder="What challenges do they face with their current process?"
              rows="3"
            />
          </div>

          <div className="form-section-divider"></div>

          {/* Section 4: Current Providers */}
          <div className="form-section-header">4. Current Providers</div>
          <div className="form-group">
            <label>Current Providers</label>
            <textarea
              name="currentProviders"
              value={playbookFormData.currentProviders}
              onChange={(e) => setPlaybookFormData({...playbookFormData, currentProviders: e.target.value})}
              placeholder="List current service providers, vendors, or contractors"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Provider Satisfaction Level</label>
            <select
              name="providerSatisfaction"
              value={playbookFormData.providerSatisfaction}
              onChange={(e) => setPlaybookFormData({...playbookFormData, providerSatisfaction: e.target.value})}
            >
              <option value="">Select...</option>
              <option value="very-satisfied">Very Satisfied</option>
              <option value="satisfied">Satisfied</option>
              <option value="neutral">Neutral</option>
              <option value="dissatisfied">Dissatisfied</option>
              <option value="very-dissatisfied">Very Dissatisfied</option>
            </select>
          </div>
          <div className="form-group">
            <label>How/What could they improve?</label>
            <textarea
              name="providerImprovements"
              value={playbookFormData.providerImprovements}
              onChange={(e) => setPlaybookFormData({...playbookFormData, providerImprovements: e.target.value})}
              placeholder="What improvements could be made with current providers?"
              rows="2"
            />
          </div>

          <div className="form-section-divider"></div>

          {/* Section 5: Maintenance / Management */}
          <div className="form-section-header">5. Maintenance / Management</div>
          <div className="form-group">
            <label>Number of maintenance / engineers</label>
            <input
              type="text"
              name="numberOfMaintenanceEngineers"
              value={playbookFormData.numberOfMaintenanceEngineers}
              onChange={(e) => setPlaybookFormData({...playbookFormData, numberOfMaintenanceEngineers: e.target.value})}
              placeholder="Number of maintenance staff/engineers"
            />
          </div>
          <div className="form-group">
            <label>Last Training (What/When)</label>
            <textarea
              name="lastTraining"
              value={playbookFormData.lastTraining}
              onChange={(e) => setPlaybookFormData({...playbookFormData, lastTraining: e.target.value})}
              placeholder="What training was provided and when?"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>Equipment (Dehus, air movers, moisture readers)</label>
            <textarea
              name="equipment"
              value={playbookFormData.equipment}
              onChange={(e) => setPlaybookFormData({...playbookFormData, equipment: e.target.value})}
              placeholder="List equipment available (dehumidifiers, air movers, moisture readers, etc.)"
              rows="2"
            />
          </div>

          <div className="form-section-divider"></div>

          {/* Section 6: Loss History */}
          <div className="form-section-header">6. Loss History</div>
          <div className="form-group">
            <label>Recent Losses</label>
            <textarea
              name="recentLosses"
              value={playbookFormData.recentLosses}
              onChange={(e) => setPlaybookFormData({...playbookFormData, recentLosses: e.target.value})}
              placeholder="Describe recent losses or incidents"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Last Event (When / Details)</label>
            <textarea
              name="lastEvent"
              value={playbookFormData.lastEvent}
              onChange={(e) => setPlaybookFormData({...playbookFormData, lastEvent: e.target.value})}
              placeholder="When was the last event and what were the details?"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>Event Type in last 24 months</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={playbookFormData.eventType24Months.includes('water')}
                  onChange={(e) => {
                    const current = playbookFormData.eventType24Months;
                    const updated = e.target.checked
                      ? [...current, 'water']
                      : current.filter(t => t !== 'water');
                    setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                  }}
                />
                Water
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={playbookFormData.eventType24Months.includes('fire')}
                  onChange={(e) => {
                    const current = playbookFormData.eventType24Months;
                    const updated = e.target.checked
                      ? [...current, 'fire']
                      : current.filter(t => t !== 'fire');
                    setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                  }}
                />
                Fire
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={playbookFormData.eventType24Months.includes('mold')}
                  onChange={(e) => {
                    const current = playbookFormData.eventType24Months;
                    const updated = e.target.checked
                      ? [...current, 'mold']
                      : current.filter(t => t !== 'mold');
                    setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                  }}
                />
                Mold
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={playbookFormData.eventType24Months.includes('bio')}
                  onChange={(e) => {
                    const current = playbookFormData.eventType24Months;
                    const updated = e.target.checked
                      ? [...current, 'bio']
                      : current.filter(t => t !== 'bio');
                    setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                  }}
                />
                Bio
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Emergency event Outsourcing Scale (1-10)</label>
            <select
              name="outsourcingScale"
              value={playbookFormData.outsourcingScale}
              onChange={(e) => setPlaybookFormData({...playbookFormData, outsourcingScale: e.target.value})}
            >
              <option value="">Select scale...</option>
              <option value="1">1 - They only call if floors and walls are penetrated and multiple units are affected</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10 - They don't clean up anything themselves</option>
            </select>
          </div>
          <div className="form-group">
            <label>Protocol for deciding what gets called out</label>
            <textarea
              name="protocolForCallout"
              value={playbookFormData.protocolForCallout}
              onChange={(e) => setPlaybookFormData({...playbookFormData, protocolForCallout: e.target.value})}
              placeholder="What is their protocol for deciding when to call out external help?"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>Number of events annually</label>
            <input
              type="text"
              name="eventsAnnually"
              value={playbookFormData.eventsAnnually}
              onChange={(e) => setPlaybookFormData({...playbookFormData, eventsAnnually: e.target.value})}
              placeholder="Average number of events per year"
            />
          </div>

          <div className="form-section-divider"></div>

          {/* Section 7: Organization Structure */}
          <div className="form-section-header">7. Organization Structure</div>
          <div className="form-group">
            <label>Portfolio Managers</label>
            <textarea
              name="portfolioManagers"
              value={playbookFormData.portfolioManagers}
              onChange={(e) => setPlaybookFormData({...playbookFormData, portfolioManagers: e.target.value})}
              placeholder="Portfolio managers information"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>Regional Managers</label>
            <textarea
              name="regionalManagers"
              value={playbookFormData.regionalManagers}
              onChange={(e) => setPlaybookFormData({...playbookFormData, regionalManagers: e.target.value})}
              placeholder="Regional managers information"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>Property Managers</label>
            <textarea
              name="propertyManagers"
              value={playbookFormData.propertyManagers}
              onChange={(e) => setPlaybookFormData({...playbookFormData, propertyManagers: e.target.value})}
              placeholder="Property managers information"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>Maintenance Supervisors</label>
            <textarea
              name="maintenanceSupervisors"
              value={playbookFormData.maintenanceSupervisors}
              onChange={(e) => setPlaybookFormData({...playbookFormData, maintenanceSupervisors: e.target.value})}
              placeholder="Maintenance supervisors information"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>Director of Engineering / Maintenance</label>
            <textarea
              name="directorEngineeringMaintenance"
              value={playbookFormData.directorEngineeringMaintenance}
              onChange={(e) => setPlaybookFormData({...playbookFormData, directorEngineeringMaintenance: e.target.value})}
              placeholder="Director of Engineering / Maintenance information"
              rows="2"
            />
          </div>

          <div className="form-section-divider"></div>

          {/* Section 8: Commitment */}
          <div className="form-section-header">8. Commitment</div>
          <div className="form-group">
            <label>Projected Job Date</label>
            <input
              type="text"
              name="projectedJobDate"
              value={playbookFormData.projectedJobDate}
              onChange={(e) => setPlaybookFormData({...playbookFormData, projectedJobDate: e.target.value})}
              placeholder="Enter projected job date"
            />
          </div>
          <div className="form-group">
            <label>Initial Commitment Interaction Plan / Strategy</label>
            <textarea
              name="interactionPlanStrategy"
              value={playbookFormData.interactionPlanStrategy}
              onChange={(e) => setPlaybookFormData({...playbookFormData, interactionPlanStrategy: e.target.value})}
              placeholder="Describe the interaction plan and strategy for initial commitment"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={generatePDF}>
              Print to PDF
            </button>
            <button type="submit" className="btn-primary">
              Save / Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlaybookTab;
