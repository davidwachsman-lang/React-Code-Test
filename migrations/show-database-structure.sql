-- DIAGNOSTIC: Show all columns in your existing tables
-- Run this to see what columns you actually have

PRINT '========================================';
PRINT 'CHECKING YOUR DATABASE STRUCTURE';
PRINT '========================================';
PRINT '';

-- Show Jobs table columns
PRINT '--- JOBS TABLE COLUMNS ---';
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM 
    sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE 
    c.object_id = OBJECT_ID('Jobs')
ORDER BY 
    c.column_id;

PRINT '';
PRINT '--- CUSTOMERS TABLE COLUMNS ---';
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM 
    sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE 
    c.object_id = OBJECT_ID('Customers')
ORDER BY 
    c.column_id;

PRINT '';
PRINT '--- ESTIMATES TABLE COLUMNS ---';
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM 
    sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE 
    c.object_id = OBJECT_ID('Estimates')
ORDER BY 
    c.column_id;

PRINT '';
PRINT '--- METRICS TABLE COLUMNS ---';
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM 
    sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE 
    c.object_id = OBJECT_ID('Metrics')
ORDER BY 
    c.column_id;

PRINT '';
PRINT '========================================';
PRINT 'DIAGNOSTIC COMPLETE';
PRINT '========================================';
