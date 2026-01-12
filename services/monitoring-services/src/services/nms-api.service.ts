import axios, { AxiosError } from "axios";
import { config } from "../config/env";
import { nmsLogger } from "../utils/logger";
import type { NmsLoginResponse, NmsRefreshResponse, NmsSiteDownItem, NmsSiteDownResponse } from "../types/site-down.types";

export class NmsApiService {
    private refreshToken: string | null = null;
    private accessToken: string | null = null;
    private accessTokenExpiry: number | null = null;

    /**
     * Login to NMS API and get refresh token
     */
    async login(): Promise<string> {
        try {
            const response = await axios.post<NmsLoginResponse>(
                `${config.nms.apiUrl}/user/login`,
                {
                    username: config.nms.username,
                    password: config.nms.password,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            this.refreshToken = response.data.refresh_token;
            nmsLogger.info("Successfully logged in to NMS API");
            return response.data.refresh_token;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                const errorMessage = axiosError.response?.data 
                    ? JSON.stringify(axiosError.response.data)
                    : axiosError.message;
                nmsLogger.error({ 
                    error: errorMessage, 
                    status: axiosError.response?.status 
                }, "Failed to login to NMS API");
                throw new Error(`NMS login failed: ${axiosError.response?.status || 'Unknown'} ${errorMessage}`);
            }
            nmsLogger.error({ error }, "Failed to login to NMS API");
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(): Promise<string> {
        try {
            if (!this.refreshToken) {
                await this.login();
            }

            const response = await axios.post<NmsRefreshResponse>(
                `${config.nms.apiUrl}/user/refresh`,
                {},
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this.refreshToken}`,
                    },
                }
            );

            this.accessToken = response.data.access_token;
            
            // Parse JWT to get expiry (basic parsing, assuming exp is in payload)
            try {
                const payload = JSON.parse(Buffer.from(response.data.access_token.split('.')[1], 'base64').toString());
                this.accessTokenExpiry = payload.exp * 1000; // Convert to milliseconds
            } catch {
                // If parsing fails, set expiry to 1 hour from now (default)
                this.accessTokenExpiry = Date.now() + 60 * 60 * 1000;
            }

            nmsLogger.info("Successfully refreshed access token");
            return response.data.access_token;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                // If refresh fails, try to login again
                if (axiosError.response?.status === 401) {
                    nmsLogger.warn("Refresh token expired, logging in again");
                    await this.login();
                    return this.refreshAccessToken();
                }
                const errorMessage = axiosError.response?.data 
                    ? JSON.stringify(axiosError.response.data)
                    : axiosError.message;
                nmsLogger.error({ 
                    error: errorMessage, 
                    status: axiosError.response?.status 
                }, "Failed to refresh access token");
                throw new Error(`NMS refresh token failed: ${axiosError.response?.status || 'Unknown'} ${errorMessage}`);
            }
            nmsLogger.error({ error }, "Failed to refresh access token");
            throw error;
        }
    }

    /**
     * Get valid access token (refresh if needed)
     */
    async getAccessToken(): Promise<string> {
        // Check if token is expired or will expire in next 5 minutes
        if (!this.accessToken || !this.accessTokenExpiry || this.accessTokenExpiry < Date.now() + 5 * 60 * 1000) {
            await this.refreshAccessToken();
        }
        return this.accessToken!;
    }

    /**
     * Fetch site down data from NMS API
     */
    async fetchSiteDownData(): Promise<NmsSiteDownItem[]> {
        try {
            const accessToken = await this.getAccessToken();

            const response = await axios.get<NmsSiteDownResponse>(
                `${config.nms.apiUrl}/inventory/site`,
                {
                    params: {
                        limit: "100",
                        include_exclusions: "false",
                        site_status: "down",
                        avg_traffic_bts_lt: "1000000",
                        avg_traffic_modem_lt: "1000000",
                    },
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            // Response structure: { message: "Success", total: null, result: [...] }
            const sites = response.data.result || [];
            
            nmsLogger.info({ count: sites.length }, "Successfully fetched site down data from NMS");
            return sites;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                const errorMessage = axiosError.response?.data 
                    ? JSON.stringify(axiosError.response.data)
                    : axiosError.message;
                nmsLogger.error({ 
                    error: errorMessage, 
                    status: axiosError.response?.status 
                }, "Failed to fetch site down data from NMS");
                throw new Error(`NMS fetch site down failed: ${axiosError.response?.status || 'Unknown'} ${errorMessage}`);
            }
            nmsLogger.error({ error }, "Failed to fetch site down data from NMS");
            throw error;
        }
    }
}

// Export singleton instance
export const nmsApiService = new NmsApiService();

