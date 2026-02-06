-- Fix Activity Tracking Dates - With Duplicate Handling
-- Run each numbered section one at a time in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECTION 1: View all current data to understand the situation
-- ============================================================================
SELECT 
    id,
    week_start_date,
    sales_rep,
    cold_calls,
    insight_meetings,
    initial_commitments,
    referral_jobs,
    CASE EXTRACT(DOW FROM week_start_date)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name
FROM activity_tracking
ORDER BY week_start_date, sales_rep;


-- ============================================================================
-- SECTION 2: Find all duplicates (same week, same sales_rep on different days)
-- ============================================================================
SELECT 
    date_trunc('week', week_start_date)::date as correct_monday,
    sales_rep,
    COUNT(*) as record_count,
    array_agg(week_start_date ORDER BY week_start_date) as dates_found,
    SUM(cold_calls) as total_cold_calls,
    SUM(insight_meetings) as total_insight_meetings,
    SUM(initial_commitments) as total_initial_commitments,
    SUM(referral_jobs) as total_referral_jobs
FROM activity_tracking
GROUP BY date_trunc('week', week_start_date)::date, sales_rep
HAVING COUNT(*) > 1;


-- ============================================================================
-- SECTION 3: Merge duplicates for Paige (week of 2026-01-12)
-- This takes the MAX value from both records and keeps the Monday record
-- ============================================================================
UPDATE activity_tracking
SET 
    cold_calls = GREATEST(cold_calls, COALESCE((SELECT cold_calls FROM activity_tracking WHERE sales_rep = 'paige' AND week_start_date = '2026-01-13'), 0)),
    insight_meetings = GREATEST(insight_meetings, COALESCE((SELECT insight_meetings FROM activity_tracking WHERE sales_rep = 'paige' AND week_start_date = '2026-01-13'), 0)),
    initial_commitments = GREATEST(initial_commitments, COALESCE((SELECT initial_commitments FROM activity_tracking WHERE sales_rep = 'paige' AND week_start_date = '2026-01-13'), 0)),
    referral_jobs = GREATEST(referral_jobs, COALESCE((SELECT referral_jobs FROM activity_tracking WHERE sales_rep = 'paige' AND week_start_date = '2026-01-13'), 0))
WHERE sales_rep = 'paige' AND week_start_date = '2026-01-12';


-- ============================================================================
-- SECTION 4: Delete Paige's duplicate record (the wrong date)
-- ============================================================================
DELETE FROM activity_tracking
WHERE sales_rep = 'paige' AND week_start_date = '2026-01-13';


-- ============================================================================
-- SECTION 5: Merge duplicates for Tony (if exists)
-- ============================================================================
UPDATE activity_tracking
SET 
    cold_calls = GREATEST(cold_calls, COALESCE((SELECT cold_calls FROM activity_tracking WHERE sales_rep = 'tony' AND week_start_date = '2026-01-13'), 0)),
    insight_meetings = GREATEST(insight_meetings, COALESCE((SELECT insight_meetings FROM activity_tracking WHERE sales_rep = 'tony' AND week_start_date = '2026-01-13'), 0)),
    initial_commitments = GREATEST(initial_commitments, COALESCE((SELECT initial_commitments FROM activity_tracking WHERE sales_rep = 'tony' AND week_start_date = '2026-01-13'), 0)),
    referral_jobs = GREATEST(referral_jobs, COALESCE((SELECT referral_jobs FROM activity_tracking WHERE sales_rep = 'tony' AND week_start_date = '2026-01-13'), 0))
WHERE sales_rep = 'tony' AND week_start_date = '2026-01-12';


-- ============================================================================
-- SECTION 6: Delete Tony's duplicate record (if exists)
-- ============================================================================
DELETE FROM activity_tracking
WHERE sales_rep = 'tony' AND week_start_date = '2026-01-13';


-- ============================================================================
-- SECTION 7: Check for any remaining duplicates before final fix
-- This should return 0 rows if all duplicates are resolved
-- ============================================================================
SELECT 
    date_trunc('week', week_start_date)::date as correct_monday,
    sales_rep,
    COUNT(*) as record_count
FROM activity_tracking
GROUP BY date_trunc('week', week_start_date)::date, sales_rep
HAVING COUNT(*) > 1;


-- ============================================================================
-- SECTION 8: Normalize ALL remaining non-Monday dates to Monday
-- Only run this after SECTION 7 returns 0 rows
-- ============================================================================
UPDATE activity_tracking
SET week_start_date = date_trunc('week', week_start_date)::date
WHERE EXTRACT(DOW FROM week_start_date) != 1;


-- ============================================================================
-- SECTION 9: Verify - All dates should now be Mondays
-- This should return 0 rows (no non-Monday dates)
-- ============================================================================
SELECT id, week_start_date, sales_rep
FROM activity_tracking
WHERE EXTRACT(DOW FROM week_start_date) != 1;


-- ============================================================================
-- SECTION 10: Final verification - View all clean data
-- ============================================================================
SELECT 
    week_start_date,
    sales_rep,
    cold_calls,
    insight_meetings,
    initial_commitments,
    referral_jobs
FROM activity_tracking
ORDER BY week_start_date DESC, sales_rep;
