import net from "net";
import { config } from "../config/env.js";
import { probeLogger } from "../utils/logger.js";
import type { ConnectivitySnapshot } from "../types/index.js";

async function tcpProbe(host: string, port: number, timeoutMs: number): Promise<{ latencyMs: number; reachable: boolean }> {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();

        const timer = setTimeout(() => {
            socket.destroy();
            resolve({ latencyMs: -1, reachable: false });
        }, timeoutMs);

        socket.connect(port, host, () => {
            clearTimeout(timer);
            const latencyMs = Date.now() - start;
            socket.destroy();
            resolve({ latencyMs, reachable: true });
        });

        socket.on("error", () => {
            clearTimeout(timer);
            socket.destroy();
            resolve({ latencyMs: -1, reachable: false });
        });
    });
}

async function icmpProbe(host: string, timeoutMs: number): Promise<{ latencyMs: number; reachable: boolean }> {
    // ICMP requires raw sockets / external binary; fallback to TCP with common port
    probeLogger.warn({ host }, "ICMP not natively supported in Node, falling back to TCP port 80");
    return tcpProbe(host, 80, timeoutMs);
}

export const connectivityProbeService = {
    async probe(ip: string): Promise<ConnectivitySnapshot> {
        const mode = config.probe.mode;
        const timeout = config.probe.timeoutMs;

        let result: { latencyMs: number; reachable: boolean };
        if (mode === "tcp") {
            result = await tcpProbe(ip, config.probe.tcpPort, timeout);
        } else {
            result = await icmpProbe(ip, timeout);
        }

        return {
            latencyMs: result.reachable ? result.latencyMs : null,
            reachable: result.reachable,
            probedAt: new Date().toISOString(),
            targetIp: ip,
            probeMethod: mode,
        };
    },

    resolveTargetIp(ipSnmp: string | null | undefined, ipGwGs: string | null | undefined): string | null {
        if (ipSnmp && ipSnmp.trim()) return ipSnmp.trim();
        if (ipGwGs && ipGwGs.trim()) return ipGwGs.trim();
        return null;
    },
};
