-- Simple list of all columns in your tables

-- JOBS TABLE
SELECT 'JOBS' AS TableName, name AS ColumnName 
FROM sys.columns 
WHERE object_id = OBJECT_ID('Jobs')
ORDER BY column_id;

-- CUSTOMERS TABLE  
SELECT 'CUSTOMERS' AS TableName, name AS ColumnName
FROM sys.columns
WHERE object_id = OBJECT_ID('Customers')
ORDER BY column_id;

-- ESTIMATES TABLE
SELECT 'ESTIMATES' AS TableName, name AS ColumnName
FROM sys.columns
WHERE object_id = OBJECT_ID('Estimates')
ORDER BY column_id;

-- METRICS TABLE
SELECT 'METRICS' AS TableName, name AS ColumnName
FROM sys.columns
WHERE object_id = OBJECT_ID('Metrics')
ORDER BY column_id;
