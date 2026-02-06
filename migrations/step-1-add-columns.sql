-- STEP 1: ADD MISSING COLUMNS TO JOBS TABLE
-- Run this FIRST, then run step 2

PRINT 'Step 1: Adding missing columns to Jobs table...';
PRINT '';

-- Add missing columns to Jobs table
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Jobs')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Customer')
    BEGIN
        ALTER TABLE Jobs ADD Customer NVARCHAR(255);
        PRINT '✅ Added Customer column to Jobs';
    END
    ELSE
        PRINT '⏭️  Customer column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Address')
    BEGIN
        ALTER TABLE Jobs ADD Address NVARCHAR(500);
        PRINT '✅ Added Address column to Jobs';
    END
    ELSE
        PRINT '⏭️  Address column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Type')
    BEGIN
        ALTER TABLE Jobs ADD Type NVARCHAR(50);
        PRINT '✅ Added Type column to Jobs';
    END
    ELSE
        PRINT '⏭️  Type column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Estimate')
    BEGIN
        ALTER TABLE Jobs ADD Estimate DECIMAL(10, 2);
        PRINT '✅ Added Estimate column to Jobs';
    END
    ELSE
        PRINT '⏭️  Estimate column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Priority')
    BEGIN
        ALTER TABLE Jobs ADD Priority NVARCHAR(20);
        PRINT '✅ Added Priority column to Jobs';
    END
    ELSE
        PRINT '⏭️  Priority column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Division')
    BEGIN
        ALTER TABLE Jobs ADD Division NVARCHAR(50);
        PRINT '✅ Added Division column to Jobs';
    END
    ELSE
        PRINT '⏭️  Division column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Status')
    BEGIN
        ALTER TABLE Jobs ADD Status NVARCHAR(50);
        PRINT '✅ Added Status column to Jobs';
    END
    ELSE
        PRINT '⏭️  Status column already exists';

    PRINT '';
    PRINT '✅ Step 1 Complete!';
    PRINT '📋 Next: Run step-2-insert-sample-data.sql';
END
ELSE
BEGIN
    PRINT '❌ Jobs table does not exist!';
    PRINT '📋 Run database-schema-safe.sql first';
END
