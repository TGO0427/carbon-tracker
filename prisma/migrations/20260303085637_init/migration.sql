-- CreateTable
CREATE TABLE "ReportingPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" INTEGER NOT NULL,
    "factor" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'UK DEFRA',
    "year" INTEGER NOT NULL DEFAULT 2024,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmissionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" INTEGER NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "activityData" REAL NOT NULL,
    "activityUnit" TEXT NOT NULL,
    "customFactor" REAL,
    "totalEmissions" REAL NOT NULL,
    "notes" TEXT,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emissionFactorId" TEXT,
    "reportingPeriodId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmissionEntry_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "EmissionFactor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmissionEntry_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT,
    "direction" TEXT NOT NULL,
    "productDescription" TEXT,
    "totalWeightTonnes" REAL NOT NULL,
    "totalEmissions" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "shipmentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierId" TEXT,
    "reportingPeriodId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransportLeg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legOrder" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "origin" TEXT,
    "destination" TEXT,
    "distanceKm" REAL NOT NULL,
    "emissionFactor" REAL NOT NULL,
    "emissions" REAL NOT NULL,
    "notes" TEXT,
    "shipmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransportLeg_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
