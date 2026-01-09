// Storm Event Service - Supabase queries for storm events
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'storm_events';

const stormEventService = {
  // Get all events (ordered by date desc)
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get single event by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    return handleSupabaseResult(response);
  },

  // Get active events only
  async getActive() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('is_active', true)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Create new event
  async create(eventData) {
    const data = {
      event_name: eventData.event_name,
      event_date: eventData.event_date,
      location: eventData.location,
      storm_type: eventData.storm_type,
      storm_type_other: eventData.storm_type_other || null,
      is_active: eventData.is_active !== undefined ? eventData.is_active : true
    };

    const response = await supabase
      .from(TABLE)
      .insert(data)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update event
  async update(id, eventData) {
    const data = {};
    if (eventData.event_name !== undefined) data.event_name = eventData.event_name;
    if (eventData.event_date !== undefined) data.event_date = eventData.event_date;
    if (eventData.location !== undefined) data.location = eventData.location;
    if (eventData.storm_type !== undefined) data.storm_type = eventData.storm_type;
    if (eventData.storm_type_other !== undefined) data.storm_type_other = eventData.storm_type_other;
    if (eventData.is_active !== undefined) data.is_active = eventData.is_active;

    const response = await supabase
      .from(TABLE)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete event (soft delete by setting is_active=false)
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  }
};

export default stormEventService;
