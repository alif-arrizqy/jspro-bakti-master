import { Prisma } from '@prisma/client';

const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

const buildOrderBy = (
  sortBy?: string,
  sortOrder?: string
): Prisma.SiteInfoOrderByWithRelationInput => {
  if (!sortBy || !sortOrder) return { createdAt: "desc" };

  const orderMap: Record<string, Prisma.SiteInfoOrderByWithRelationInput> = {
    siteName: { siteName: sortOrder as Prisma.SortOrder },
    siteId: { siteId: sortOrder as Prisma.SortOrder },
    createdAt: { createdAt: sortOrder as Prisma.SortOrder },
    updatedAt: { updatedAt: sortOrder as Prisma.SortOrder },
  };

  return orderMap[sortBy] || { createdAt: "desc" };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPlainObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toPlainObject);

  // Handle Prisma Decimal - convert to string to preserve exact value
  if (
    typeof obj === "object" &&
    typeof obj.toString === "function" &&
    typeof obj.toNumber === "function"
  ) {
    return obj.toString();
  }

  // Handle Date
  if (obj instanceof Date) return obj.toISOString();

  // Handle bigint
  if (typeof obj === "bigint") return obj.toString();

  // For objects, recursively process all properties
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = toPlainObject(obj[key]);
    }
    return result;
  }

  return obj;
};

/**
 * Filter site data to match SiteFullRead schema
 * Excludes: id, createdAt, updatedAt from siteInfo and detail
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterSiteFullRead = (site: any): any => {
  if (!site) return site;

  const { id, createdAt, updatedAt, detail, ...siteInfo } = site;

  const filteredDetail = detail
    ? (() => {
      const { id: detailId, siteInfoId, createdAt: detailCreatedAt, updatedAt: detailUpdatedAt, ...detailData } = detail;
      return detailData;
    })()
    : null;

  return {
    ...siteInfo,
    detail: filteredDetail,
  };
};

/**
 * Remove undefined values from object (for partial updates)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
        result[key] = removeUndefined(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
};

/**
 * Convert empty strings to null for nullable fields
 * Prisma doesn't accept empty strings for nullable String fields
 */
const emptyStringToNull = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  return value.trim() === '' ? null : value;
};

/**
 * Validate and convert longitude to Prisma Decimal
 * Database constraint: Decimal(11, 8) = max 3 digits before decimal, 8 digits after
 * Valid geographic range: -180 to 180
 * @throws Error if value is out of range
 */
const validateLongitude = (value: number | null | undefined): Prisma.Decimal | null => {
  if (value === null || value === undefined) return null;
  
  // Check geographic validity
  if (value < -180 || value > 180) {
    throw new Error(`Longitude must be between -180 and 180. Received: ${value}`);
  }
  
  // Check database constraint: Decimal(11, 8) allows max 3 digits before decimal
  // Max value: 999.99999999, Min value: -999.99999999
  if (value < -999.99999999 || value > 999.99999999) {
    throw new Error(`Longitude value ${value} exceeds database limit. Maximum allowed: ±999.99999999`);
  }
  
  return new Prisma.Decimal(value);
};

/**
 * Validate and convert latitude to Prisma Decimal
 * Database constraint: Decimal(10, 8) = max 2 digits before decimal, 8 digits after
 * Valid geographic range: -90 to 90
 * @throws Error if value is out of range
 */
const validateLatitude = (value: number | null | undefined): Prisma.Decimal | null => {
  if (value === null || value === undefined) return null;
  
  // Check geographic validity
  if (value < -90 || value > 90) {
    throw new Error(`Latitude must be between -90 and 90. Received: ${value}`);
  }
  
  // Check database constraint: Decimal(10, 8) allows max 2 digits before decimal
  // Max value: 99.99999999, Min value: -99.99999999
  if (value < -99.99999999 || value > 99.99999999) {
    throw new Error(`Latitude value ${value} exceeds database limit. Maximum allowed: ±99.99999999`);
  }
  
  return new Prisma.Decimal(value);
};

export { parseDate, buildOrderBy, toPlainObject, filterSiteFullRead, removeUndefined, emptyStringToNull, validateLongitude, validateLatitude };