// Role Expectations Notes Service - Supabase queries for role expectations notes
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'role_expectations_notes';

const roleExpectationsNotesService = {
  // Get the most recent notes for a role and note type
  async getLatestNote(role, noteType) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('role', role)
      .eq('note_type', noteType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Get all notes for a role (both manager and self)
  async getNotesByRole(role) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get all notes for a role and note type (with history)
  async getNoteHistory(role, noteType) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('role', role)
      .eq('note_type', noteType)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Save a new note (creates a new entry with timestamp)
  async saveNote(role, noteType, noteContent, createdBy = null) {
    const response = await supabase
      .from(TABLE)
      .insert([{
        role,
        note_type: noteType,
        note_content: noteContent,
        created_by: createdBy,
        updated_by: createdBy
      }])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update the most recent note (or create if doesn't exist)
  async upsertLatestNote(role, noteType, noteContent, updatedBy = null) {
    // First, try to get the latest note
    const latestNote = await this.getLatestNote(role, noteType);
    
    if (latestNote && latestNote.note_content === noteContent) {
      // No change, don't create a new entry
      return latestNote;
    }

    // Create a new entry with timestamp (maintains history)
    return this.saveNote(role, noteType, noteContent, updatedBy);
  },

  // Delete a note by ID
  async deleteNote(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  }
};

export default roleExpectationsNotesService;

