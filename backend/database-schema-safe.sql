-- SAFE DATABASE UPDATE SCRIPT
-- This will work with existing tables and only add what's missing

-- ============================================
-- 1. CREATE TABLES IF THEY DON'T EXIST
-- ============================================

-- Create Estimates table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Estimates')
BEGIN
    CREATE TABLE Estimates (
        EstimateID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        JobDetails NVARCHAR(MAX),
        Rooms NVARCHAR(MAX),
        LineItems NVARCHAR(MAX),
        Total DECIMAL(10, 2) DEFAULT 0,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created Estimates table';
END
ELSE
    PRINT 'Estimates table already exists';

-- Create Jobs table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Jobs')
BEGIN
    CREATE TABLE Jobs (
        JobID INT IDENTITY(1,1) PRIMARY KEY,
        JobNumber NVARCHAR(50) UNIQUE NOT NULL,
        Customer NVARCHAR(255) NOT NULL,
        Address NVARCHAR(500),
        Type NVARCHAR(50),
        Priority NVARCHAR(20),
        Estimate DECIMAL(10, 2),
        Division NVARCHAR(50),
        Status NVARCHAR(50),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created Jobs table';
END
ELSE
    PRINT 'Jobs table already exists';

-- Create Customers table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE Customers (
        CustomerID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255),
        Phone NVARCHAR(50),
        Address NVARCHAR(500),
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created Customers table';
END
ELSE
    PRINT 'Customers table already exists';

-- Create Metrics table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Metrics')
BEGIN
    CREATE TABLE Metrics (
        MetricID INT IDENTITY(1,1) PRIMARY KEY,
        Division NVARCHAR(50) NOT NULL,
        Subdivision NVARCHAR(50),
        Description NVARCHAR(500) NOT NULL,
        CurrentValue INT DEFAULT 0,
        TargetValue INT DEFAULT 0,
        Priority NVARCHAR(20),
        IsChecked BIT DEFAULT 0,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created Metrics table';
END
ELSE
    PRINT 'Metrics table already exists';

-- ============================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add missing columns to Jobs table
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Jobs')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Customer')
    BEGIN
        ALTER TABLE Jobs ADD Customer NVARCHAR(255);
        PRINT 'Added Customer column to Jobs';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Address')
    BEGIN
        ALTER TABLE Jobs ADD Address NVARCHAR(500);
        PRINT 'Added Address column to Jobs';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Type')
    BEGIN
        ALTER TABLE Jobs ADD Type NVARCHAR(50);
        PRINT 'Added Type column to Jobs';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Estimate')
    BEGIN
        ALTER TABLE Jobs ADD Estimate DECIMAL(10, 2);
        PRINT 'Added Estimate column to Jobs';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Priority')
    BEGIN
        ALTER TABLE Jobs ADD Priority NVARCHAR(20);
        PRINT 'Added Priority column to Jobs';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Division')
    BEGIN
        ALTER TABLE Jobs ADD Division NVARCHAR(50);
        PRINT 'Added Division column to Jobs';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Status')
    BEGIN
        ALTER TABLE Jobs ADD Status NVARCHAR(50);
        PRINT 'Added Status column to Jobs';
    END
END

-- ============================================
-- 3. CREATE INDEXES (if they don't exist)
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Estimates_CreatedAt')
    CREATE INDEX IDX_Estimates_CreatedAt ON Estimates(CreatedAt DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Jobs_Status')
    CREATE INDEX IDX_Jobs_Status ON Jobs(Status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Jobs_Division')
    CREATE INDEX IDX_Jobs_Division ON Jobs(Division);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Customers_Name')
    CREATE INDEX IDX_Customers_Name ON Customers(Name);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Metrics_Division')
    CREATE INDEX IDX_Metrics_Division ON Metrics(Division);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Metrics_Priority')
    CREATE INDEX IDX_Metrics_Priority ON Metrics(Priority);

-- ============================================
-- 4. INSERT SAMPLE DATA (only if tables are empty AND columns exist)
-- ============================================

-- Sample jobs (only if Customer column exists - meaning table is properly structured)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Customer')
   AND NOT EXISTS (SELECT * FROM Jobs WHERE JobNumber = 'MIT-001')
BEGIN
    INSERT INTO Jobs (JobNumber, Customer, Address, Type, Priority, Estimate, Division, Status)
    VALUES 
        ('MIT-001', 'ABC Corp', '123 Main St', 'Water', 'high', 12500.00, 'mit', 'pending'),
        ('RECON-001', 'XYZ Inc', '456 Oak Ave', 'Fire', 'normal', 45000.00, 'recon', 'wip');
    PRINT 'Added sample jobs';
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Customer')
BEGIN
    PRINT 'Skipped sample jobs - Customer column not found. Run this script again.';
END

-- Sample metrics (only if table exists and has proper structure)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Metrics')
   AND NOT EXISTS (SELECT * FROM Metrics WHERE Description = 'Forms signed')
BEGIN
    INSERT INTO Metrics (Division, Subdivision, Description, CurrentValue, TargetValue, Priority, IsChecked)
    VALUES 
        ('mit', 'mit', 'Forms signed', 10, 50, 'urgent', 0),
        ('recon', 'recon', 'Estimates', 6, 35, 'urgent', 0);
    PRINT 'Added sample metrics';
END

PRINT '';
PRINT '✅ Database setup complete!';
PRINT 'Tables ready: Estimates, Jobs, Customers, Metrics';
PRINT '';
PRINT 'If you see errors about missing columns, please run this script ONE MORE TIME.';
PRINT 'This is because SQL Server needs to refresh its schema cache after ALTER TABLE.';
