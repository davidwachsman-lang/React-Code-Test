// Map Service - Geolocation and filtering operations for Storm Jobs map
import { supabase, handleSupabaseResult } from './supabaseClient';

const mapService = {
  // Get jobs with location data for map display
  async getJobsWithLocations(stormEventId = null, filters = {}) {
    let query = supabase
      .from('jobs')
      .select(`
        id,
        property_reference,
        status,
        priority,
        storm_event_id,
        damage_types,
        inspection_date,
        inspection_completed,
        estimate_value,
        created_at,
        properties!inner(
          id,
          address1,
          address2,
          city,
          state,
          postal_code,
          latitude,
          longitude
        ),
        customers!inner(
          id,
          name,
          phone
        ),
        storm_events(
          id,
          event_name,
          event_date,
          location
        )
      `)
      .not('properties.latitude', 'is', null)
      .not('properties.longitude', 'is', null);

    // Filter by storm event
    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    // Filter by priority
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    // Filter by damage types (array overlap)
    if (filters.damageTypes && filters.damageTypes.length > 0) {
      query = query.overlaps('damage_types', filters.damageTypes);
    }

    // Filter by date range
    if (filters.dateStart) {
      query = query.gte('created_at', filters.dateStart);
    }
    if (filters.dateEnd) {
      query = query.lte('created_at', filters.dateEnd);
    }

    const response = await query;
    if (response.error) {
      throw new Error(response.error.message || 'Failed to get jobs with locations');
    }

    // Transform data to flat structure for map markers
    if (response.data) {
      return response.data.map(job => ({
        id: job.id,
        propertyReference: job.property_reference,
        status: job.status,
        priority: job.priority,
        stormEventId: job.storm_event_id,
        stormEventName: job.storm_events?.event_name || 'Unknown',
        damageTypes: job.damage_types || [],
        inspectionDate: job.inspection_date,
        inspectionCompleted: job.inspection_completed,
        estimateValue: job.estimate_value,
        createdAt: job.created_at,
        customerName: job.customers?.name || 'Unknown',
        customerPhone: job.customers?.phone || '',
        address: [
          job.properties?.address1,
          job.properties?.address2,
          job.properties?.city,
          job.properties?.state,
          job.properties?.postal_code
        ].filter(Boolean).join(', '),
        latitude: parseFloat(job.properties?.latitude) || 0,
        longitude: parseFloat(job.properties?.longitude) || 0,
        zipCode: job.properties?.postal_code || ''
      })).filter(job => job.latitude !== 0 && job.longitude !== 0);
    }

    return [];
  },

  // Get jobs within radius (in miles) from a center point
  async getJobsInRadius(centerLat, centerLng, radiusMiles, stormEventId = null) {
    // PostGIS extension would be ideal for this, but for now we'll use a simple bounding box
    // and filter in-memory for accuracy. For production, use PostGIS ST_DWithin function.
    
    // Convert miles to approximate degrees (rough approximation)
    // 1 degree latitude ≈ 69 miles
    // 1 degree longitude ≈ 69 * cos(latitude) miles
    const latRadius = radiusMiles / 69;
    const lngRadius = radiusMiles / (69 * Math.cos(centerLat * Math.PI / 180));

    const minLat = centerLat - latRadius;
    const maxLat = centerLat + latRadius;
    const minLng = centerLng - lngRadius;
    const maxLng = centerLng + lngRadius;

    let query = supabase
      .from('jobs')
      .select(`
        id,
        property_reference,
        status,
        priority,
        storm_event_id,
        properties!inner(
          latitude,
          longitude,
          address1,
          city,
          state,
          postal_code
        ),
        customers!inner(name, phone)
      `)
      .not('properties.latitude', 'is', null)
      .not('properties.longitude', 'is', null)
      .gte('properties.latitude', minLat)
      .lte('properties.latitude', maxLat)
      .gte('properties.longitude', minLng)
      .lte('properties.longitude', maxLng);

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    if (response.error) {
      throw new Error(response.error.message || 'Failed to get jobs in radius');
    }

    // Filter by actual distance (Haversine formula)
    const jobs = response.data || [];
    const filteredJobs = jobs.filter(job => {
      const lat = parseFloat(job.properties?.latitude);
      const lng = parseFloat(job.properties?.longitude);
      if (!lat || !lng) return false;

      const distance = this.calculateDistance(centerLat, centerLng, lat, lng);
      return distance <= radiusMiles;
    });

    return filteredJobs;
  },

  // Calculate distance between two points using Haversine formula (returns miles)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Get bounding box for all jobs in a storm event
  async getBoundingBox(stormEventId) {
    const response = await supabase
      .from('jobs')
      .select(`
        properties!inner(latitude, longitude)
      `)
      .eq('storm_event_id', stormEventId)
      .not('properties.latitude', 'is', null)
      .not('properties.longitude', 'is', null);

    if (response.error) {
      throw new Error(response.error.message || 'Failed to get bounding box');
    }

    const jobs = response.data || [];
    if (jobs.length === 0) {
      return null;
    }

    const lats = jobs.map(job => parseFloat(job.properties?.latitude)).filter(Boolean);
    const lngs = jobs.map(job => parseFloat(job.properties?.longitude)).filter(Boolean);

    if (lats.length === 0 || lngs.length === 0) {
      return null;
    }

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  },

  // Get jobs by zip code
  async getJobsByZipCode(zipCode, stormEventId = null) {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        properties!inner(postal_code, latitude, longitude, address1, city, state),
        customers!inner(name, phone)
      `)
      .eq('properties.postal_code', zipCode)
      .not('properties.latitude', 'is', null)
      .not('properties.longitude', 'is', null);

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    return handleSupabaseResult(response);
  }
};

export default mapService;
