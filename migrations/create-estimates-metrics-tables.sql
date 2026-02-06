-- Create Estimates table to match your database structure
-- Run this in SQL Server Management Studio or another SQL client

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Estimates')
BEGIN
    CREATE TABLE Estimates (
        EstimateID INT IDENTITY(1,1) PRIMARY KEY,
        CustomerID INT,
        JobID INT NULL,
        EstimateName NVARCHAR(255),
        EstimateDescription NVARCHAR(MAX),
        PropertyAddress NVARCHAR(500),
        EstimateData NVARCHAR(MAX), -- JSON data for rooms, line items, etc.
        TotalAmount DECIMAL(10, 2) DEFAULT 0,
        Status NVARCHAR(50) DEFAULT 'Draft',
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        CreatedByUserID INT NULL,
        UpdatedByUserID INT NULL,
        FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID),
        FOREIGN KEY (JobID) REFERENCES Jobs(JobID)
    );
    
    CREATE INDEX IDX_Estimates_CustomerID ON Estimates(CustomerID);
    CREATE INDEX IDX_Estimates_JobID ON Estimates(JobID);
    CREATE INDEX IDX_Estimates_CreatedAt ON Estimates(CreatedAt DESC);
    
    PRINT '✅ Estimates table created successfully!';
END
ELSE
    PRINT '⏭️  Estimates table already exists';

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
    
    CREATE INDEX IDX_Metrics_Division ON Metrics(Division);
    CREATE INDEX IDX_Metrics_Priority ON Metrics(Priority);
    
    PRINT '✅ Metrics table created successfully!';
END
ELSE
    PRINT '⏭️  Metrics table already exists';

-- Create Labor Pricing table if it doesn't exist (for T&M Estimate Schedule A)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborPricing')
BEGIN
    CREATE TABLE LaborPricing (
        LaborPricingID INT IDENTITY(1,1) PRIMARY KEY,
        LaborType NVARCHAR(255) NOT NULL,
        Category NVARCHAR(100),
        HourlyRate DECIMAL(10, 2) NOT NULL,
        Description NVARCHAR(MAX),
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX IDX_LaborPricing_IsActive ON LaborPricing(IsActive);
    CREATE INDEX IDX_LaborPricing_Category ON LaborPricing(Category);
    
    -- Insert sample labor pricing data
    INSERT INTO LaborPricing (LaborType, Category, HourlyRate, Description) VALUES
        ('Project Manager', 'Management', 75.00, 'Project management and oversight'),
        ('Lead Technician', 'Field', 65.00, 'Lead field technician'),
        ('Technician', 'Field', 55.00, 'Field technician'),
        ('Helper/Laborer', 'Field', 45.00, 'General labor and assistance'),
        ('Estimator', 'Office', 70.00, 'Estimate preparation and review'),
        ('Office Admin', 'Office', 50.00, 'Administrative support'),
        ('Supervisor', 'Management', 80.00, 'Field supervision'),
        ('Specialist', 'Field', 70.00, 'Specialized technician');
    
    PRINT '✅ Labor Pricing table created successfully!';
END
ELSE
    PRINT '⏭️  Labor Pricing table already exists';

PRINT '';
PRINT '✅ All tables ready!';
PRINT '';
PRINT '📊 Your database now has:';
PRINT '   - Jobs table (existing with your data)';
PRINT '   - Customers table (existing with your data)';
PRINT '   - Estimates table (new - ready for use)';
PRINT '   - Metrics table (new - ready for use)';
PRINT '   - Labor Pricing table (new - for T&M estimates)';
