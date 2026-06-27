// Generic REST connector (Phase 3).
//
// Fetches a JSON ProcurementDataset (or partial) from a configured base URL.
// Useful for custom middleware/integration platforms that already expose
// normalized procurement data over HTTP.

import { getAsOfDate } from "../clock";
import {
  ConnectorImportError,
  ConnectorNotConfiguredError,
  type ConnectorStatus,
  type ErpCapability,
  type ErpConnector,
} from "./types";
import type { ProcurementDataset } from "../types";

export class RestConnector implements ErpConnector {
  readonly id = "rest";
  readonly label = "Generic REST API";
  readonly capabilities: ErpCapability[] = ["rest"];

  private baseUrl = process.env.ERP_REST_BASE_URL?.trim();
  private apiKey = process.env.ERP_REST_API_KEY?.trim();

  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  async testConnection(): Promise<ConnectorStatus> {
    if (!this.isConfigured()) {
      return { configured: false, reachable: false, message: "ERP_REST_BASE_URL not set." };
    }
    try {
      const res = await fetch(`${this.baseUrl}/health`, { headers: this.headers() });
      return {
        configured: true,
        reachable: res.ok,
        message: res.ok ? "Reachable." : `Health check returned ${res.status}.`,
      };
    } catch (err) {
      return { configured: true, reachable: false, message: `Unreachable: ${String(err)}` };
    }
  }

  async importDataset(): Promise<ProcurementDataset> {
    if (!this.isConfigured()) throw new ConnectorNotConfiguredError(this.id);
    try {
      const res = await fetch(`${this.baseUrl}/dataset`, { headers: this.headers() });
      if (!res.ok) throw new ConnectorImportError(this.id, `HTTP ${res.status}`);
      const json = (await res.json()) as Partial<ProcurementDataset>;
      return {
        suppliers: json.suppliers ?? [],
        purchaseOrders: json.purchaseOrders ?? [],
        invoices: json.invoices ?? [],
        deliveries: json.deliveries ?? [],
        budgets: json.budgets ?? [],
        contracts: json.contracts ?? [],
        asOfDate: json.asOfDate ?? getAsOfDate(),
      };
    } catch (err) {
      if (err instanceof ConnectorImportError) throw err;
      throw new ConnectorImportError(this.id, String(err));
    }
  }

  private headers(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }
}
