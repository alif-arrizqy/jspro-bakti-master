export const siteResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    data: {
      type: "object",
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};

export const siteArrayResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
  additionalProperties: false,
};

export const paginatedResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    data: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        pagination: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            totalPages: { type: "number" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const queryStringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    limit: { type: "number", default: 20 },
    search: { type: "string", description: "Search in siteName, siteId, or prCode" },
    isActive: { type: "boolean" },
    sortBy: {
      type: "string",
      enum: ["siteName", "siteId", "createdAt", "updatedAt"],
    },
    sortOrder: { type: "string", enum: ["asc", "desc"] },
    status: {
      type: "string",
      enum: ["terestrial", "non_terestrial", "non-terestrial"],
      description: "Filter by site status",
    },
    province: {
      type: "string",
      description: "Filter by province name or region (papua/maluku)",
    },
    sccType: {
      type: "string",
      enum: ["scc_srne", "scc_epever", "scc-srne", "scc-epever"],
      description: "Filter by SCC type",
    },
    batteryVersion: {
      type: "string",
      enum: ["talis5", "mix", "jspro"],
      description: "Filter by battery version",
    },
    siteId: {
      type: "string",
      description: "Exact match for siteId (takes priority over search)",
    },
    prCode: {
      type: "string",
      description: "Exact match for prCode (takes priority over search)",
    },
  },
};

export const siteBodySchema = {
  type: "object",
  required: ["siteId", "siteName"],
  properties: {
    prCode: { type: "string", nullable: true },
    siteId: { type: "string" },
    clusterId: { type: "string", nullable: true },
    terminalId: { type: "string", nullable: true },
    siteName: { type: "string" },
    ipSnmp: { type: "string", nullable: true },
    ipMiniPc: { type: "string", nullable: true },
    webappUrl: { type: "string", nullable: true },
    ehubVersion: { type: "string", enum: ["new", "old"], nullable: true },
    panel2Type: { type: "string", enum: ["new", "old"], nullable: true },
    sccType: {
      type: "string",
      enum: ["scc_srne", "scc_epever"],
      nullable: true,
    },
    batteryVersion: {
      type: "string",
      enum: ["talis5", "mix", "jspro"],
      nullable: true,
    },
    totalBattery: { type: "number", nullable: true },
    statusSites: {
      type: "string",
      enum: ["terestrial", "non_terestrial"],
    },
    isActive: { type: "boolean" },
    detail: {
      type: "object",
      properties: {
        village: { type: "string", nullable: true },
        subdistrict: { type: "string", nullable: true },
        regency: { type: "string", nullable: true },
        province: { type: "string" },
        longitude: { type: "number", nullable: true },
        latitude: { type: "number", nullable: true },
        ipGatewayGs: { type: "string", nullable: true },
        ipGatewayLc: { type: "string", nullable: true },
        subnet: { type: "string", nullable: true },
        batteryList: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
        cabinetList: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
        buildYear: { type: "string", nullable: true },
        projectPhase: { type: "string", nullable: true },
        onairDate: { type: "string", nullable: true },
        gsSustainDate: { type: "string", nullable: true },
        topoSustainDate: { type: "string", nullable: true },
        providerGs: { type: "string", nullable: true },
        beamProvider: { type: "string", nullable: true },
        cellularOperator: { type: "string", nullable: true },
        contactPerson: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string", nullable: true },
            },
          },
          nullable: true,
        },
      },
    },
  },
};

