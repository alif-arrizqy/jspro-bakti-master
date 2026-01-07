import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { cacheService, CacheService } from "./cache.service.js";
import type {
  SiteFullRead,
  SiteFullCreate,
  SiteFullUpdate,
  SiteQuery,
} from "../schemas/sites.schema.js";
import {
  parseDate,
  buildOrderBy,
  toPlainObject,
  filterSiteFullRead,
  removeUndefined,
  emptyStringToNull,
  validateLongitude,
  validateLatitude,
} from "../utils/helper.util.js";

const siteInclude = {
  detail: true,
} as const;

const getProvincesByRegion = (region: string): string[] => {
  const regionMap: Record<string, string[]> = {
    maluku: ["MALUKU", "MALUKU UTARA"],
    papua: ["PAPUA BARAT", "PAPUA BARAT DAYA", "PAPUA SELATAN"],
  };

  return regionMap[region] || [];
};

export class SitesService {
  async getAllSites(query: SiteQuery) {
    const cacheKey = CacheService.getAllSitesKey(query);
    const ttl = CacheService.calculateTTL(query);

    return cacheService.get(
      cacheKey,
      async () => {
        const {
          page,
          limit,
          search,
          isActive,
          sortBy,
          sortOrder,
          status,
          province,
          sccType,
          batteryVersion,
          siteId,
          prCode,
        } = query;

        const skip = (page - 1) * limit;

        // Transform query params to database format
        const transformedStatus = status
          ? (status === "non-terestrial" || status === "non_terestrial"
              ? "non_terestrial"
              : "terestrial")
          : undefined;

        const transformedSccType = sccType
          ? (sccType === "scc-srne" || sccType === "scc_srne"
              ? "scc_srne"
              : "scc_epever")
          : undefined;

        const where: Prisma.SiteInfoWhereInput = {
          ...(isActive !== undefined && { isActive }),
          ...(transformedStatus && { statusSites: transformedStatus }),
          ...(transformedSccType && { sccType: transformedSccType }),
          ...(batteryVersion && { batteryVersion }),
          // Handle exact match for siteId or prCode (priority over search)
          ...((siteId || prCode) && {
            OR: [
              ...(siteId ? [{ siteId }] : []),
              ...(prCode ? [{ prCode }] : []),
            ],
          }),
          // Handle search (only if siteId/prCode not provided)
          ...(!siteId && !prCode && search && {
            OR: [
              { siteName: { contains: search, mode: "insensitive" } },
              { siteId: { contains: search, mode: "insensitive" } },
              { prCode: { contains: search, mode: "insensitive" } },
            ],
          }),
        };

        // Handle province filter (can be region or specific province)
        let provinceCondition: Prisma.SiteInfoDetailWhereInput | undefined;
        if (province) {
          const normalizedProvince = province.toLowerCase().trim();
          const regionProvinces = getProvincesByRegion(normalizedProvince);
          
          if (regionProvinces.length > 0) {
            // It's a region (papua/maluku)
            provinceCondition = {
              province: {
                in: regionProvinces,
              },
            };
          } else {
            // It's a specific province name
            provinceCondition = {
              province: {
                contains: province,
                mode: "insensitive",
              },
            };
          }
        }

        const orderBy = buildOrderBy(sortBy, sortOrder);

        // Only get sites that have detail, and apply province filter if provided
        const whereWithDetail: Prisma.SiteInfoWhereInput = {
          ...where,
          detail: provinceCondition
            ? {
                // If province filter exists, use it and ensure detail is not null
                is: {
                  ...provinceCondition,
                },
              }
            : {
                // If no province filter, just check that detail exists
                isNot: null,
              },
        };

        const [sites, total] = await Promise.all([
          prisma.siteInfo.findMany({
            where: whereWithDetail,
            include: siteInclude,
            skip,
            take: limit,
            orderBy,
          }),
          prisma.siteInfo.count({ where: whereWithDetail }),
        ]);

        const plainSites = sites.map((site) => toPlainObject(site));
        const filteredSites = plainSites.map((site) => filterSiteFullRead(site)) as SiteFullRead[];

        return {
          data: filteredSites,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      ttl
    );
  }

  async getSiteById(id: string) {
    const cacheKey = CacheService.getSiteByIdKey(id);
    const ttl = 60 * 60; // 1 hour

    return cacheService.get(
      cacheKey,
      async () => {
        const site = await prisma.siteInfo.findFirst({
          where: {
            OR: [
              { siteId: id },
              { prCode: id },
              { id: isNaN(Number(id)) ? undefined : Number(id) },
            ],
          },
          include: siteInclude,
        });

        if (!site) return null;
        const plainSite = toPlainObject(site);
        return filterSiteFullRead(plainSite) as SiteFullRead;
      },
      ttl
    );
  }


  async createSite(data: SiteFullCreate) {
    const { detail, ...siteData } = data;

    // Prepare site data with proper null handling
    const siteInfoData: Prisma.SiteInfoCreateInput = {
      prCode: siteData.prCode ? emptyStringToNull(siteData.prCode) : null,
      siteId: siteData.siteId,
      clusterId: siteData.clusterId ? emptyStringToNull(siteData.clusterId) : null,
      terminalId: siteData.terminalId ? emptyStringToNull(siteData.terminalId) : null,
      siteName: siteData.siteName,
      ipSnmp: siteData.ipSnmp ? emptyStringToNull(siteData.ipSnmp) : null,
      ipMiniPc: siteData.ipMiniPc ? emptyStringToNull(siteData.ipMiniPc) : null,
      webappUrl: siteData.webappUrl ? emptyStringToNull(siteData.webappUrl) : null,
      ehubVersion: siteData.ehubVersion ?? null,
      panel2Type: siteData.panel2Type ?? null,
      sccType: siteData.sccType ?? null,
      batteryVersion: siteData.batteryVersion ?? null,
      totalBattery: siteData.totalBattery ?? null,
      statusSites: siteData.statusSites ?? undefined,
      isActive: siteData.isActive ?? true,
    };

    // Prepare detail data if provided
    if (detail) {
      siteInfoData.detail = {
        create: {
          village: detail.village ? emptyStringToNull(detail.village) : null,
          subdistrict: detail.subdistrict ? emptyStringToNull(detail.subdistrict) : null,
          regency: detail.regency ? emptyStringToNull(detail.regency) : null,
          province: detail.province,
          longitude: validateLongitude(detail.longitude),
          latitude: validateLatitude(detail.latitude),
          ipGatewayGs: detail.ipGatewayGs ? emptyStringToNull(detail.ipGatewayGs) : null,
          ipGatewayLc: detail.ipGatewayLc ? emptyStringToNull(detail.ipGatewayLc) : null,
          subnet: detail.subnet ? emptyStringToNull(detail.subnet) : null,
          batteryList: detail.batteryList ?? [],
          cabinetList: detail.cabinetList ?? [],
          buildYear: detail.buildYear ? emptyStringToNull(detail.buildYear) : null,
          projectPhase: detail.projectPhase ? emptyStringToNull(detail.projectPhase) : null,
          onairDate: parseDate(detail.onairDate),
          gsSustainDate: parseDate(detail.gsSustainDate),
          topoSustainDate: parseDate(detail.topoSustainDate),
          providerGs: detail.providerGs ? emptyStringToNull(detail.providerGs) : null,
          beamProvider: detail.beamProvider ? emptyStringToNull(detail.beamProvider) : null,
          cellularOperator: detail.cellularOperator ? emptyStringToNull(detail.cellularOperator) : null,
          contactPerson: detail.contactPerson ?? [],
        },
      };
    }

    const site = await prisma.siteInfo.create({
      data: siteInfoData,
      include: siteInclude,
    });

    const plainSite = toPlainObject(site);
    const result = filterSiteFullRead(plainSite) as SiteFullRead;

    // Invalidate cache after create - invalidate all related caches
    await this.invalidateCache({
      siteId: result.siteId,
      batteryVersion: result.batteryVersion,
      statusSites: result.statusSites,
      sccType: result.sccType,
      province: result.detail?.province,
      isActive: result.isActive,
    });

    return result;
  }

  async updateSite(id: string, data: SiteFullUpdate) {
    const { detail, ...siteData } = data;

    // Get site with id before filtering - include detail for cache invalidation
    const existingSiteRaw = await prisma.siteInfo.findFirst({
      where: {
        OR: [
          { siteId: id },
          { prCode: id },
          { id: isNaN(Number(id)) ? undefined : Number(id) },
        ],
      },
      include: {
        detail: true,
      },
    });

    if (!existingSiteRaw) {
      return null;
    }

    // Remove undefined values from siteData to avoid overwriting with undefined
    const cleanedSiteData = removeUndefined(siteData);

    // Build update data for siteInfo - only include fields that are actually provided
    const updateData: Prisma.SiteInfoUpdateInput = {};

    if (cleanedSiteData.prCode !== undefined) updateData.prCode = emptyStringToNull(cleanedSiteData.prCode ?? null);
    if (cleanedSiteData.siteId !== undefined) updateData.siteId = cleanedSiteData.siteId;
    if (cleanedSiteData.clusterId !== undefined) updateData.clusterId = emptyStringToNull(cleanedSiteData.clusterId ?? null);
    if (cleanedSiteData.terminalId !== undefined) updateData.terminalId = emptyStringToNull(cleanedSiteData.terminalId ?? null);
    if (cleanedSiteData.siteName !== undefined) updateData.siteName = cleanedSiteData.siteName;
    if (cleanedSiteData.ipSnmp !== undefined) updateData.ipSnmp = emptyStringToNull(cleanedSiteData.ipSnmp ?? null);
    if (cleanedSiteData.ipMiniPc !== undefined) updateData.ipMiniPc = emptyStringToNull(cleanedSiteData.ipMiniPc ?? null);
    if (cleanedSiteData.webappUrl !== undefined) updateData.webappUrl = emptyStringToNull(cleanedSiteData.webappUrl ?? null);
    if (cleanedSiteData.ehubVersion !== undefined) updateData.ehubVersion = cleanedSiteData.ehubVersion;
    if (cleanedSiteData.panel2Type !== undefined) updateData.panel2Type = cleanedSiteData.panel2Type;
    if (cleanedSiteData.sccType !== undefined) updateData.sccType = cleanedSiteData.sccType;
    if (cleanedSiteData.batteryVersion !== undefined) updateData.batteryVersion = cleanedSiteData.batteryVersion;
    if (cleanedSiteData.totalBattery !== undefined) updateData.totalBattery = cleanedSiteData.totalBattery;
    if (cleanedSiteData.statusSites !== undefined) updateData.statusSites = cleanedSiteData.statusSites;
    if (cleanedSiteData.isActive !== undefined) updateData.isActive = cleanedSiteData.isActive;

    // Build update data for detail if provided
    if (detail) {
      const cleanedDetail = removeUndefined(detail);
      const detailUpdateData: Prisma.SiteInfoDetailUpdateInput = {};

      if (cleanedDetail.village !== undefined) detailUpdateData.village = emptyStringToNull(cleanedDetail.village ?? null);
      if (cleanedDetail.subdistrict !== undefined) detailUpdateData.subdistrict = emptyStringToNull(cleanedDetail.subdistrict ?? null);
      if (cleanedDetail.regency !== undefined) detailUpdateData.regency = emptyStringToNull(cleanedDetail.regency ?? null);
      if (cleanedDetail.province !== undefined) detailUpdateData.province = cleanedDetail.province;
      if (cleanedDetail.longitude !== undefined) {
        detailUpdateData.longitude = validateLongitude(cleanedDetail.longitude);
      }
      if (cleanedDetail.latitude !== undefined) {
        detailUpdateData.latitude = validateLatitude(cleanedDetail.latitude);
      }
      if (cleanedDetail.ipGatewayGs !== undefined) detailUpdateData.ipGatewayGs = emptyStringToNull(cleanedDetail.ipGatewayGs ?? null);
      if (cleanedDetail.ipGatewayLc !== undefined) detailUpdateData.ipGatewayLc = emptyStringToNull(cleanedDetail.ipGatewayLc ?? null);
      if (cleanedDetail.subnet !== undefined) detailUpdateData.subnet = emptyStringToNull(cleanedDetail.subnet ?? null);
      if (cleanedDetail.batteryList !== undefined) detailUpdateData.batteryList = cleanedDetail.batteryList ?? [];
      if (cleanedDetail.cabinetList !== undefined) detailUpdateData.cabinetList = cleanedDetail.cabinetList ?? [];
      if (cleanedDetail.buildYear !== undefined) detailUpdateData.buildYear = emptyStringToNull(cleanedDetail.buildYear ?? null);
      if (cleanedDetail.projectPhase !== undefined) detailUpdateData.projectPhase = emptyStringToNull(cleanedDetail.projectPhase ?? null);
      if (cleanedDetail.onairDate !== undefined) detailUpdateData.onairDate = parseDate(cleanedDetail.onairDate);
      if (cleanedDetail.gsSustainDate !== undefined) detailUpdateData.gsSustainDate = parseDate(cleanedDetail.gsSustainDate);
      if (cleanedDetail.topoSustainDate !== undefined) detailUpdateData.topoSustainDate = parseDate(cleanedDetail.topoSustainDate);
      if (cleanedDetail.providerGs !== undefined) detailUpdateData.providerGs = emptyStringToNull(cleanedDetail.providerGs ?? null);
      if (cleanedDetail.beamProvider !== undefined) detailUpdateData.beamProvider = emptyStringToNull(cleanedDetail.beamProvider ?? null);
      if (cleanedDetail.cellularOperator !== undefined) detailUpdateData.cellularOperator = emptyStringToNull(cleanedDetail.cellularOperator ?? null);
      if (cleanedDetail.contactPerson !== undefined) detailUpdateData.contactPerson = cleanedDetail.contactPerson ?? [];

      updateData.detail = {
        upsert: {
          create: {
            province: cleanedDetail.province || '',
            village: emptyStringToNull(cleanedDetail.village ?? null),
            subdistrict: emptyStringToNull(cleanedDetail.subdistrict ?? null),
            regency: emptyStringToNull(cleanedDetail.regency ?? null),
            longitude: validateLongitude(cleanedDetail.longitude),
            latitude: validateLatitude(cleanedDetail.latitude),
            ipGatewayGs: emptyStringToNull(cleanedDetail.ipGatewayGs ?? null),
            ipGatewayLc: emptyStringToNull(cleanedDetail.ipGatewayLc ?? null),
            subnet: emptyStringToNull(cleanedDetail.subnet ?? null),
            batteryList: cleanedDetail.batteryList ?? [],
            cabinetList: cleanedDetail.cabinetList ?? [],
            buildYear: emptyStringToNull(cleanedDetail.buildYear ?? null),
            projectPhase: emptyStringToNull(cleanedDetail.projectPhase ?? null),
            onairDate: parseDate(cleanedDetail.onairDate),
            gsSustainDate: parseDate(cleanedDetail.gsSustainDate),
            topoSustainDate: parseDate(cleanedDetail.topoSustainDate),
            providerGs: emptyStringToNull(cleanedDetail.providerGs ?? null),
            beamProvider: emptyStringToNull(cleanedDetail.beamProvider ?? null),
            cellularOperator: emptyStringToNull(cleanedDetail.cellularOperator ?? null),
            contactPerson: cleanedDetail.contactPerson ?? [],
          },
          update: detailUpdateData,
        },
      };
    }

    const site = await prisma.siteInfo.update({
      where: { id: existingSiteRaw.id },
      data: updateData,
      include: siteInclude,
    });

    const plainSite = toPlainObject(site);
    const result = filterSiteFullRead(plainSite) as SiteFullRead;

    // Get old values for comparison
    const oldBatteryVersion = existingSiteRaw.batteryVersion;
    const newBatteryVersion = data.batteryVersion || existingSiteRaw.batteryVersion;
    const oldStatusSites = existingSiteRaw.statusSites;
    const newStatusSites = data.statusSites || existingSiteRaw.statusSites;
    const oldSccType = existingSiteRaw.sccType;
    const newSccType = data.sccType || existingSiteRaw.sccType;
    const oldIsActive = existingSiteRaw.isActive;
    const newIsActive = data.isActive !== undefined ? data.isActive : existingSiteRaw.isActive;

    // Get old and new province values
    const oldProvince = existingSiteRaw.detail?.province || null;
    const newProvince = detail?.province !== undefined 
      ? (detail.province || null)
      : (result.detail?.province || null);

    // Invalidate cache after update - invalidate based on changed fields
    await this.invalidateCache({
      siteId: result.siteId,
      oldBatteryVersion,
      newBatteryVersion,
      oldStatusSites,
      newStatusSites,
      oldSccType,
      newSccType,
      oldProvince,
      newProvince,
      oldIsActive,
      newIsActive,
    });

    return result;
  }

  async deleteSite(id: string, hardDelete = false) {
    // Get site with id before filtering - need more fields for cache invalidation
    const existingSiteRaw = await prisma.siteInfo.findFirst({
      where: {
        OR: [
          { siteId: id },
          { prCode: id },
          { id: isNaN(Number(id)) ? undefined : Number(id) },
        ],
      },
      include: {
        detail: true,
      },
    });

    if (!existingSiteRaw) {
      return false;
    }

    if (hardDelete) {
      await prisma.siteInfo.delete({
        where: { id: existingSiteRaw.id },
      });
    } else {
      await prisma.siteInfo.update({
        where: { id: existingSiteRaw.id },
        data: { isActive: false },
      });
    }

    // Invalidate cache after delete - invalidate all related caches
    await this.invalidateCache({
      siteId: existingSiteRaw.siteId,
      batteryVersion: existingSiteRaw.batteryVersion,
      statusSites: existingSiteRaw.statusSites,
      sccType: existingSiteRaw.sccType,
      province: existingSiteRaw.detail?.province || null,
      isActive: existingSiteRaw.isActive,
    });

    return true;
  }

  async getStatistics() {
    const cacheKey = CacheService.getStatisticsKey();
    const ttl = 60 * 60; // 1 hour

    return cacheService.get(
      cacheKey,
      async () => {
        const regions = ["maluku", "papua"];
        const result: Record<string, any> = {};

        let totalAllSites = 0;
        let totalTalis5Count = 0;
        let totalMixCount = 0;
        let totalJsproCount = 0;

    for (const region of regions) {
      const provinces = getProvincesByRegion(region);

      const whereRegion: Prisma.SiteInfoWhereInput = {
        detail: {
          province: {
            in: provinces,
          },
        },
      };

      const [
        totalSites,
        totalActiveSites,
        byStatusSites,
        bySccType,
        byBatteryVersion,
        sitesWithBattery,
        byProvince,
      ] = await Promise.all([
        prisma.siteInfo.count({ where: whereRegion }),
        prisma.siteInfo.count({ where: { ...whereRegion, isActive: true } }),
        prisma.siteInfo.groupBy({
          by: ["statusSites"],
          where: { ...whereRegion, isActive: true },
          _count: { _all: true },
        }),
        prisma.siteInfo.groupBy({
          by: ["sccType"],
          where: {
            ...whereRegion,
            isActive: true,
            sccType: { not: null }
          },
          _count: { _all: true },
        }),
        prisma.siteInfo.groupBy({
          by: ["batteryVersion"],
          where: {
            ...whereRegion,
            isActive: true,
            batteryVersion: { not: null },
          },
          _count: { _all: true },
        }),
        prisma.siteInfo.findMany({
          where: {
            ...whereRegion,
            isActive: true,
            batteryVersion: { not: null },
          },
          select: {
            siteId: true,
            siteName: true,
            batteryVersion: true,
          },
        }),
        prisma.siteInfoDetail.groupBy({
          by: ["province"],
          where: {
            province: { in: provinces },
          },
          _count: { _all: true },
          orderBy: { _count: { province: "desc" } },
        }),
      ]);

      const byStatusSitesObj: Record<string, number> = {};
      byStatusSites.forEach((item) => {
        if (item.statusSites) {
          byStatusSitesObj[item.statusSites] = item._count._all;
        }
      });

      const bySccTypeObj: Record<string, number> = {};
      bySccType.forEach((item) => {
        if (item.sccType) {
          bySccTypeObj[item.sccType] = item._count._all;
        }
      });

      const byBatteryVersionObj: Record<string, any> = {};
      byBatteryVersion.forEach((item) => {
        if (item.batteryVersion) {
          const sites = sitesWithBattery
            .filter((site) => site.batteryVersion === item.batteryVersion)
            .map((site) => ({
              siteId: site.siteId,
              siteName: site.siteName,
            }));

          byBatteryVersionObj[item.batteryVersion] = {
            summary: {
              total: item._count._all,
            },
            sites: sites,
          };
        }
      });

      const talis5Count = byBatteryVersion.find((item) => item.batteryVersion === "talis5")?._count._all || 0;
      const mixCount = byBatteryVersion.find((item) => item.batteryVersion === "mix")?._count._all || 0;
      const jsproCount = byBatteryVersion.find((item) => item.batteryVersion === "jspro")?._count._all || 0;

      totalAllSites += totalSites;
      totalTalis5Count += talis5Count;
      totalMixCount += mixCount;
      totalJsproCount += jsproCount;

      result[region] = {
        totalSite: {
          all: totalSites,
          active: totalActiveSites,
          inactive: totalSites - totalActiveSites,
        },
        byProvince: byProvince.map((item) => ({
          province: item.province,
          count: item._count._all,
        })),
        byBatteryVersion: byBatteryVersionObj,
        byStatusSites: byStatusSitesObj,
        bySccType: bySccTypeObj,
      };
    }

    const summary = {
      talis5: {
        totalSites: totalTalis5Count,
      },
      mix: {
        totalSites: totalMixCount,
      },
      jspro: {
        totalSites: totalJsproCount,
      },
    };

        return {
          summary,
          ...result,
        };
      },
      ttl
    );
  }

  async getDistinctProvinces() {
    const cacheKey = CacheService.getDistinctProvincesKey();
    const ttl = 60 * 60; // 1 hour

    return cacheService.get(
      cacheKey,
      async () => {
        const provinces = await prisma.siteInfoDetail.findMany({
          select: { province: true },
          distinct: ["province"],
          orderBy: { province: "asc" },
        });

        return provinces.map((p) => p.province);
      },
      ttl
    );
  }

  /**
   * Invalidate cache for sites based on changed fields
   * Best practice: Only invalidate cache that is affected by the changes
   * 
   * @param params Object containing site information and changed fields
   */
  private async invalidateCache(params: {
    siteId?: string | null;
    batteryVersion?: string | null;
    oldBatteryVersion?: string | null;
    newBatteryVersion?: string | null;
    statusSites?: string | null;
    oldStatusSites?: string | null;
    newStatusSites?: string | null;
    sccType?: string | null;
    oldSccType?: string | null;
    newSccType?: string | null;
    province?: string | null;
    oldProvince?: string | null;
    newProvince?: string | null;
    isActive?: boolean | null;
    oldIsActive?: boolean | null;
    newIsActive?: boolean | null;
  }): Promise<void> {
    const patterns: string[] = [];

    // Always invalidate general caches that might be affected
    patterns.push("sites:all:*"); // All list queries with different filters
    patterns.push("sites:statistics"); // Statistics might change
    patterns.push("sites:provinces:distinct"); // Province list might change if province updated

    // Invalidate specific site cache
    if (params.siteId) {
      patterns.push(`sites:id:${params.siteId}`);
    }

    // All filter-based caches are now under sites:all:* pattern, so no need for specific patterns
    // The sites:all:* pattern will invalidate all queries with any combination of filters

    // If isActive changed, it affects all queries with isActive filter
    const isActive = params.newIsActive !== undefined ? params.newIsActive : params.isActive;
    const oldIsActive = params.oldIsActive;
    
    if (oldIsActive !== undefined && isActive !== undefined && oldIsActive !== isActive) {
      // isActive changed, all queries with isActive filter need to be invalidated
      // This is already covered by "sites:all:*" pattern
    }

    // Remove duplicates
    const uniquePatterns = [...new Set(patterns)];

    try {
      if (uniquePatterns.length > 0) {
        await cacheService.invalidate(uniquePatterns);
      }
    } catch (error) {
      // Log error but don't throw - cache invalidation failure shouldn't break the operation
      console.error("Failed to invalidate cache:", error);
    }
  }
}

export const sitesService = new SitesService();
