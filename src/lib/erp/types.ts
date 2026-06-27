// ERP integration layer (Phase 3).
//
// One common interface every connector implements, so the app can ingest a
// ProcurementDataset from SAP, Dynamics, Oracle, NetSuite, REST, or flat files
// without the rest of the system knowing which source it came from. Vendor
// connectors that require credentials report `configured: false` until wired,
// rather than failing silently.

import type { ProcurementDataset } from "../types";

/** Transport/protocol a connector speaks (informational + UI hints). */
export type ErpCapability =
  | "odata"
  | "idoc"
  | "bapi"
  | "rfc"
  | "rest"
  | "soap"
  | "file";

export interface ConnectorStatus {
  configured: boolean;
  reachable: boolean;
  message: string;
}

export interface ErpConnector {
  /** Stable id, e.g. "sap-s4hana". */
  id: string;
  /** Human label, e.g. "SAP S/4HANA". */
  label: string;
  capabilities: ErpCapability[];
  /** True when the required configuration/credentials are present. */
  isConfigured(): boolean;
  /** Lightweight connectivity/config check; never throws. */
  testConnection(): Promise<ConnectorStatus>;
  /** Pull a full procurement dataset from the source. */
  importDataset(): Promise<ProcurementDataset>;
}

export class ConnectorNotConfiguredError extends Error {
  constructor(connectorId: string) {
    super(
      `Connector "${connectorId}" is not configured. Set its credentials to enable import.`,
    );
    this.name = "ConnectorNotConfiguredError";
  }
}

export class ConnectorImportError extends Error {
  constructor(connectorId: string, detail: string) {
    super(`Import from "${connectorId}" failed: ${detail}`);
    this.name = "ConnectorImportError";
  }
}
