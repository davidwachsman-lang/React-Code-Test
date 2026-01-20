// Storm Intake Service - Handles saving storm intake form data to jobs table
import { supabase, handleSupabaseResult } from './supabaseClient';
import customerService from './customerService';
import propertyService from './propertyService';
import jobService from './jobService';

const TABLE = 'jobs';

const stormIntakeService = {
  /**
   * Create a job from storm intake form data
   * Creates customer and property records if they don't exist, then creates job
   * @param {Object} intakeData - The storm intake form data
   * @returns {Object} Created records { customer, property, job }
   */
  async createStormIntake(intakeData) {
    try {
      // 1. Create or find customer
      let customer;
      try {
        // Try to find existing customer by phone AND name (more precise match)
        const existingCustomers = await customerService.search(intakeData.customerPhone);
        if (existingCustomers && existingCustomers.length > 0) {
          // Look for exact match on both phone and name
          const exactMatch = existingCustomers.find(c => 
            c.phone === intakeData.customerPhone && 
            c.name?.toLowerCase() === intakeData.customerName?.toLowerCase()
          );
          
          if (exactMatch) {
            customer = exactMatch;
            // Only update email if it's different and provided
            if (intakeData.customerEmail && intakeData.customerEmail !== customer.email) {
              await customerService.update(customer.id, {
                email: intakeData.customerEmail
              });
            }
          } else {
            // Phone matches but name doesn't - create new customer to avoid overwriting
            customer = await customerService.create({
              name: intakeData.customerName,
              email: intakeData.customerEmail || null,
              phone: intakeData.customerPhone
            });
          }
        } else {
          // No existing customer found - create new one
          customer = await customerService.create({
            name: intakeData.customerName,
            email: intakeData.customerEmail || null,
            phone: intakeData.customerPhone
          });
        }
      } catch (error) {
        // If customer creation fails, create directly
        customer = await customerService.create({
          name: intakeData.customerName,
          email: intakeData.customerEmail || null,
          phone: intakeData.customerPhone
        });
      }

      // 2. Create property
      // For storm intake, always create a new property record
      // Ensure required fields have values (city is required by database)
      console.log('Creating property with data:', {
        address1: intakeData.propertyAddress,
        city: intakeData.city,
        state: intakeData.state,
        zip: intakeData.zip,
        latitude: intakeData.latitude,
        longitude: intakeData.longitude
      });

      const property = await propertyService.create({
        customer_id: customer.id,
        address1: intakeData.propertyAddress || '',
        city: intakeData.city || 'Unknown',
        state: intakeData.state || '',
        postal_code: intakeData.zip || '',
        latitude: intakeData.latitude || null,
        longitude: intakeData.longitude || null
      });
      
      console.log('Property created:', property);

      // 3. Generate property reference if storm event is provided
      let propertyReference = null;
      if (intakeData.storm_event_id) {
        try {
          propertyReference = await jobService.generatePropertyReference(intakeData.storm_event_id);
        } catch (error) {
          console.warn('Failed to generate property reference:', error);
          // Fallback: use simple sequential number
          const { count } = await supabase
            .from(TABLE)
            .select('id', { count: 'exact', head: true })
            .eq('storm_event_id', intakeData.storm_event_id);
          const sequentialNumber = ((count || 0) + 1).toString().padStart(3, '0');
          propertyReference = `SE-${sequentialNumber}`;
        }
      }

      // 4. Prepare job data - map form fields to database columns
      const jobData = {
        customer_id: customer.id,
        property_id: property.id,
        storm_event_id: intakeData.storm_event_id || null,
        property_reference: propertyReference,
        property_type: intakeData.propertyType 
          ? (intakeData.propertyType.charAt(0).toUpperCase() + intakeData.propertyType.slice(1).toLowerCase())
          : 'Residential',
        status: 'pending',
        date_opened: new Date().toISOString().split('T')[0],
        // Property information fields
        cause_of_loss: intakeData.causeOfLoss || null,
        cause_fixed: intakeData.causeFixed || false,
        sqft_affected: intakeData.sqftAffected ? parseInt(intakeData.sqftAffected.toString().replace(/,/g, '')) : null,
        power_at_location: intakeData.powerAtLocation || null,
        tarping_needed: intakeData.tarpingNeeded || false,
        boardup_needed: intakeData.boardupNeeded || false,
        // Onsite contact fields
        onsite_contact_name: intakeData.onsiteContactName || null,
        onsite_contact_phone: intakeData.onsiteContactPhone || null,
        // Payment method fields
        payment_method: intakeData.paymentMethod || null,
        deposit_explained: intakeData.depositExplained || false,
        insurance_provider: intakeData.insuranceProvider || null,
        insurance_claim_number: intakeData.insuranceClaimNumber || null,
        // Internal notes
        internal_notes: intakeData.notes || null
      };

      // Add conditional fields based on property type
      if (intakeData.propertyType === 'residential') {
        if (intakeData.roomsAffected) {
          jobData.rooms_affected = parseInt(intakeData.roomsAffected);
        }
        if (intakeData.foundationType) {
          jobData.foundation_type = intakeData.foundationType;
        }
        // basement_type column may not exist yet - only include if value is provided
        // Will be added via SQL migration: update-jobs-table-for-storm-intake.sql
        if (intakeData.basementType) {
          // Try to include it, but if column doesn't exist, it will fail
          // User needs to run: update-jobs-table-for-storm-intake.sql
          jobData.basement_type = intakeData.basementType;
        }
      } else if (intakeData.propertyType === 'commercial') {
        if (intakeData.unitsAffected) {
          jobData.units_affected = parseInt(intakeData.unitsAffected);
        }
        if (intakeData.floorsAffected) {
          jobData.floors_affected = parseInt(intakeData.floorsAffected);
        }
        if (intakeData.parkingLocation) {
          jobData.parking_location = intakeData.parkingLocation;
        }
        jobData.msa_on_file = intakeData.msaOnFile || false;
      }

      // 5. Create job
      // Try to insert - if any columns don't exist, remove them and retry
      let response = await supabase
        .from(TABLE)
        .insert(jobData)
        .select()
        .single();
      
      // Check for error before calling handleSupabaseResult
      if (response.error) {
        const errorMessage = response.error.message || '';
        const missingColumns = [];
        const columnMap = {
          'basement_type': 'basement_type',
          'boardup_needed': 'boardup_needed',
          'tarping_needed': 'tarping_needed',
          'rooms_affected': 'rooms_affected',
          'foundation_type': 'foundation_type',
          'units_affected': 'units_affected',
          'floors_affected': 'floors_affected',
          'parking_location': 'parking_location',
          'msa_on_file': 'msa_on_file',
          'cause_of_loss': 'cause_of_loss',
          'cause_fixed': 'cause_fixed',
          'sqft_affected': 'sqft_affected',
          'power_at_location': 'power_at_location',
          'onsite_contact_name': 'onsite_contact_name',
          'onsite_contact_phone': 'onsite_contact_phone',
          'payment_method': 'payment_method',
          'deposit_explained': 'deposit_explained',
          'insurance_provider': 'insurance_provider',
          'insurance_claim_number': 'insurance_claim_number',
          'property_type': 'property_type',
          'property_reference': 'property_reference'
        };

        // Check which columns might be missing
        // Try multiple patterns to catch column name in error message
        for (const [key, columnName] of Object.entries(columnMap)) {
          const patterns = [
            columnName,
            `'${columnName}'`,
            `"${columnName}"`,
            `column "${columnName}"`,
            `column '${columnName}'`
          ];
          if (patterns.some(pattern => errorMessage.toLowerCase().includes(pattern.toLowerCase()))) {
            missingColumns.push(key);
          }
        }

        // If we found missing columns, remove them and retry
        if (missingColumns.length > 0) {
          console.warn(`Columns not found in database: ${missingColumns.join(', ')}. Removing them from insert. Please run: update-jobs-table-for-storm-intake.sql`);
          
          // Create a new object without the missing columns
          const cleanedJobData = { ...jobData };
          missingColumns.forEach(col => {
            delete cleanedJobData[columnMap[col]];
          });

          response = await supabase
            .from(TABLE)
            .insert(cleanedJobData)
            .select()
            .single();
          
          if (response.error) {
            // If it still fails, throw the error
            throw new Error(response.error.message || 'Failed to create job');
          }
          console.warn(`Job created successfully without: ${missingColumns.join(', ')}. Please add these columns to save these fields in the future.`);
        } else {
          // Other error - throw it
          throw new Error(errorMessage || 'Failed to create job');
        }
      }
      
      const job = response.data;

      return {
        success: true,
        customer,
        property,
        job
      };

    } catch (error) {
      console.error('Storm intake submission error:', error);
      throw new Error(error.message || 'Failed to submit storm intake form');
    }
  }
};

export default stormIntakeService;
