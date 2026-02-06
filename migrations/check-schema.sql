-- Check existing table structures in RestorationDB
-- Run this to see what columns already exist

-- Check if tables exist and their columns
SELECT 
    t.name AS TableName,
    c.name AS ColumnName,
    ty.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM 
    sys.tables t
    INNER JOIN sys.columns c ON t.object_id = c.object_id
    INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE 
    t.name IN ('Jobs', 'Estimates', 'Customers', 'Metrics')
ORDER BY 
    t.name, c.column_id;

-- List all tables in the database
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
