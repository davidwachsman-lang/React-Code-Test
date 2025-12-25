-- RestoreLogic.AI Database Schema for SQL Server
-- Run this script against your SQL Server database

-- Create Estimates table
CREATE TABLE Estimates (
    EstimateID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    JobDetails NVARCHAR(MAX), -- JSON data
    Rooms NVARCHAR(MAX), -- JSON array
    LineItems NVARCHAR(MAX), -- JSON array
    Total DECIMAL(10, 2) DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Create Jobs table
CREATE TABLE Jobs (
    JobID INT IDENTITY(1,1) PRIMARY KEY,
    JobNumber NVARCHAR(50) UNIQUE NOT NULL,
    Customer NVARCHAR(255) NOT NULL,
    Address NVARCHAR(500),
    Type NVARCHAR(50), -- Water, Fire, Mold, etc.
    Priority NVARCHAR(20), -- high, normal, low
    Estimate DECIMAL(10, 2),
    Division NVARCHAR(50), -- mit, recon, etc.
    Status NVARCHAR(50), -- pending, wip, complete
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Create Customers table
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

-- Create Metrics table (for Daily War Room)
CREATE TABLE Metrics (
    MetricID INT IDENTITY(1,1) PRIMARY KEY,
    Division NVARCHAR(50) NOT NULL,
    Subdivision NVARCHAR(50),
    Description NVARCHAR(500) NOT NULL,
    CurrentValue INT DEFAULT 0,
    TargetValue INT DEFAULT 0,
    Priority NVARCHAR(20), -- urgent, normal
    IsChecked BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Create indexes for better performance
CREATE INDEX IDX_Estimates_CreatedAt ON Estimates(CreatedAt DESC);
CREATE INDEX IDX_Jobs_Status ON Jobs(Status);
CREATE INDEX IDX_Jobs_Division ON Jobs(Division);
CREATE INDEX IDX_Customers_Name ON Customers(Name);
CREATE INDEX IDX_Metrics_Division ON Metrics(Division);
CREATE INDEX IDX_Metrics_Priority ON Metrics(Priority);

-- Add missing columns to Jobs table if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Customer')
    ALTER TABLE Jobs ADD Customer NVARCHAR(255);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Address')
    ALTER TABLE Jobs ADD Address NVARCHAR(500);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Type')
    ALTER TABLE Jobs ADD Type NVARCHAR(50);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'Estimate')
    ALTER TABLE Jobs ADD Estimate DECIMAL(10, 2);

-- Insert sample data for testing (only if table is empty)
IF NOT EXISTS (SELECT * FROM Jobs WHERE JobNumber = 'MIT-001')
BEGIN
    INSERT INTO Jobs (JobNumber, Customer, Address, Type, Priority, Estimate, Division, Status)
    VALUES 
        ('MIT-001', 'ABC Corp', '123 Main St', 'Water', 'high', 12500.00, 'mit', 'pending'),
        ('RECON-001', 'XYZ Inc', '456 Oak Ave', 'Fire', 'normal', 45000.00, 'recon', 'wip');
END

-- Insert sample metrics (only if table has data)
IF EXISTS (SELECT * FROM Metrics) AND NOT EXISTS (SELECT * FROM Metrics WHERE Description = 'Forms signed')
BEGIN
    INSERT INTO Metrics (Division, Subdivision, Description, CurrentValue, TargetValue, Priority, IsChecked)
    VALUES 
        ('mit', 'mit', 'Forms signed', 10, 50, 'urgent', 0),
        ('recon', 'recon', 'Estimates', 6, 35, 'urgent', 0);
END

PRINT 'Database schema updated successfully!';
PRINT 'Tables: Estimates, Jobs, Customers, Metrics';
