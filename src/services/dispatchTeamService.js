// Dispatch Team Service — CRUD for PM → Crew Chief hierarchy
// Replaces the hardcoded DEFAULT_PM_GROUPS
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'dispatch_teams';

const LANE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16',
  '#f43f5e', '#fb923c', '#a3e635', '#2dd4bf',
];
const PM_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Fallback if the dispatch_teams table doesn't exist yet
const DEFAULT_PM_GROUPS = [
  { pm: 'Kevin', title: 'Sr. Production Manager', color: PM_COLORS[0], crews: ['Gabriel', 'David', 'Michael'] },
  { pm: 'Leo', title: 'Production Manager', color: PM_COLORS[1], crews: ['Ramon', 'Roger'] },
  { pm: 'Aaron', title: 'Production Manager', color: PM_COLORS[2], crews: ['Pedro', 'Monica'] },
];

const dispatchTeamService = {
  /**
   * Load all active teams, grouped by PM.
   * Returns { pmGroups, lanes } ready for the dispatch board.
   */
  async loadTeams() {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return this.getDefaults();

      // Group by PM
      const pmMap = new Map();
      data.forEach((row) => {
        const key = row.pm_name;
        if (!pmMap.has(key)) {
          pmMap.set(key, {
            pm: row.pm_name,
            title: row.pm_title || '',
            color: row.color || PM_COLORS[pmMap.size % PM_COLORS.length],
            crews: [],
          });
        }
        pmMap.get(key).crews.push(row.crew_name);
      });
      const pmGroups = Array.from(pmMap.values());

      // Build lanes
      let laneIdx = 0;
      const lanes = [];
      pmGroups.forEach((group) => {
        group.crews.forEach((crewName) => {
          lanes.push({
            id: `crew-${laneIdx}`,
            name: crewName,
            color: LANE_COLORS[laneIdx % LANE_COLORS.length],
          });
          laneIdx++;
        });
      });

      return { pmGroups, lanes };
    } catch (err) {
      console.warn('Failed to load dispatch teams from DB, using defaults:', err.message);
      return this.getDefaults();
    }
  },

  /**
   * Returns the hardcoded defaults (used as fallback)
   */
  getDefaults() {
    const pmGroups = DEFAULT_PM_GROUPS.map((g) => ({ ...g, crews: [...g.crews] }));
    let laneIdx = 0;
    const lanes = [];
    pmGroups.forEach((group) => {
      group.crews.forEach((crewName) => {
        lanes.push({
          id: `crew-${laneIdx}`,
          name: crewName,
          color: LANE_COLORS[laneIdx % LANE_COLORS.length],
        });
        laneIdx++;
      });
    });
    return { pmGroups, lanes };
  },

  /**
   * Save PM groups back to the database (replaces all active records)
   */
  async saveTeams(pmGroups) {
    // Deactivate all existing
    await supabase.from(TABLE).update({ active: false }).eq('active', true);

    // Insert new records
    let sortOrder = 0;
    const rows = [];
    pmGroups.forEach((group, pmIdx) => {
      group.crews.forEach((crewName) => {
        rows.push({
          pm_name: group.pm,
          pm_title: group.title || '',
          crew_name: crewName,
          color: group.color || PM_COLORS[pmIdx % PM_COLORS.length],
          sort_order: sortOrder++,
          active: true,
        });
      });
    });

    if (rows.length > 0) {
      // Upsert by crew_name
      const { error } = await supabase
        .from(TABLE)
        .upsert(rows, { onConflict: 'crew_name' });
      if (error) throw new Error(error.message);
    }

    return this.loadTeams();
  },

  /**
   * Add a crew member under a PM
   */
  async addCrew(pmName, pmTitle, crewName) {
    const response = await supabase
      .from(TABLE)
      .insert([{
        pm_name: pmName,
        pm_title: pmTitle || '',
        crew_name: crewName,
        active: true,
        sort_order: 99,
      }])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  /**
   * Remove a crew member (deactivate)
   */
  async removeCrew(crewName) {
    const response = await supabase
      .from(TABLE)
      .update({ active: false })
      .eq('crew_name', crewName);
    return handleSupabaseResult(response);
  },
};

export default dispatchTeamService;
