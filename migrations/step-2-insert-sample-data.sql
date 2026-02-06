-- STEP 2: INSERT SAMPLE DATA
-- Run this AFTER step-1-add-columns.sql

PRINT 'Step 2: Inserting sample data...';
PRINT '';

-- First, create sample customers (needed for CustomerID foreign key)
IF NOT EXISTS (SELECT * FROM Customers WHERE Name = 'ABC Corp')
BEGIN
    INSERT INTO Customers (Name, Email, Phone, Address)
    VALUES ('ABC Corp', 'contact@abccorp.com', '555-0100', '123 Main St');
    PRINT '✅ Added customer: ABC Corp';
END

IF NOT EXISTS (SELECT * FROM Customers WHERE Name = 'XYZ Inc')
BEGIN
    INSERT INTO Customers (Name, Email, Phone, Address)
    VALUES ('XYZ Inc', 'info@xyzinc.com', '555-0200', '456 Oak Ave');
    PRINT '✅ Added customer: XYZ Inc';
END

-- Get CustomerIDs
DECLARE @CustomerID_ABC INT = (SELECT CustomerID FROM Customers WHERE Name = 'ABC Corp');
DECLARE @CustomerID_XYZ INT = (SELECT CustomerID FROM Customers WHERE Name = 'XYZ Inc');

-- Insert sample jobs with CustomerID
IF NOT EXISTS (SELECT * FROM Jobs WHERE JobNumber = 'MIT-001')
BEGIN
    INSERT INTO Jobs (JobNumber, CustomerID, Customer, Address, Type, Priority, Estimate, Division, Status)
    VALUES 
        ('MIT-001', @CustomerID_ABC, 'ABC Corp', '123 Main St', 'Water', 'high', 12500.00, 'mit', 'pending');
    PRINT '✅ Added job MIT-001';
END
ELSE
    PRINT '⏭️  Job MIT-001 already exists';

IF NOT EXISTS (SELECT * FROM Jobs WHERE JobNumber = 'RECON-001')
BEGIN
    INSERT INTO Jobs (JobNumber, CustomerID, Customer, Address, Type, Priority, Estimate, Division, Status)
    VALUES 
        ('RECON-001', @CustomerID_XYZ, 'XYZ Inc', '456 Oak Ave', 'Fire', 'normal', 45000.00, 'recon', 'wip');
    PRINT '✅ Added job RECON-001';
END
ELSE
    PRINT '⏭️  Job RECON-001 already exists';

-- Insert sample metrics (if Metrics table exists)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Metrics')
BEGIN
    IF NOT EXISTS (SELECT * FROM Metrics WHERE Description = 'Forms signed')
    BEGIN
        INSERT INTO Metrics (Division, Subdivision, Description, CurrentValue, TargetValue, Priority, IsChecked)
        VALUES 
            ('mit', 'mit', 'Forms signed', 10, 50, 'urgent', 0);
        PRINT '✅ Added metric: Forms signed';
    END
    ELSE
        PRINT '⏭️  Metric "Forms signed" already exists';

    IF NOT EXISTS (SELECT * FROM Metrics WHERE Description = 'Estimates')
    BEGIN
        INSERT INTO Metrics (Division, Subdivision, Description, CurrentValue, TargetValue, Priority, IsChecked)
        VALUES 
            ('recon', 'recon', 'Estimates', 6, 35, 'urgent', 0);
        PRINT '✅ Added metric: Estimates';
    END
    ELSE
        PRINT '⏭️  Metric "Estimates" already exists';
END

PRINT '';
PRINT '✅ Step 2 Complete!';
PRINT '🎉 Sample data inserted successfully!';
PRINT '';
PRINT '📊 You now have:';
PRINT '   - 2 sample jobs in the Jobs table';
PRINT '   - 2 sample metrics in the Metrics table';
