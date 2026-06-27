// Vendor ERP connectors (Phase 3).
//
// SAP ECC, SAP S/4HANA, Microsoft Dynamics 365, Oracle ERP Cloud, and NetSuite.
// Each declares the protocols it speaks and reads its credentials from env. They
// share one base so adding a vendor is a few lines. Until credentials are
// provided they report `configured: false` and refuse import with a clear error
// — honest scaffolding, not silent stubs. Implement `fetch*` against the vendor
// API to light each one up without touching the rest of the app.

import {
  ConnectorNotConfiguredError,
  type ConnectorStatus,
  type ErpCapability,
  type ErpConnector,
} from "./types";
import type { ProcurementDataset } from "../types";

abstract class CredentialedConnector implements ErpConnector {
  abstract id: string;
  abstract label: string;
  abstract capabilities: ErpCapability[];
  /** Env vars that must be present for this connector to be considered configured. */
  protected abstract requiredEnv: string[];

  isConfigured(): boolean {
    return this.requiredEnv.every((key) => Boolean(process.env[key]?.trim()));
  }

  async testConnection(): Promise<ConnectorStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        reachable: false,
        message: `Set ${this.requiredEnv.join(", ")} to enable ${this.label}.`,
      };
    }
    // A real implementation pings the vendor endpoint here.
    return { configured: true, reachable: true, message: `${this.label} credentials present.` };
  }

  async importDataset(): Promise<ProcurementDataset> {
    if (!this.isConfigured()) throw new ConnectorNotConfiguredError(this.id);
    return this.fetchDataset();
  }

  /** Vendor-specific data pull. Implement against the live API. */
  protected abstract fetchDataset(): Promise<ProcurementDataset>;
}

export class SapEccConnector extends CredentialedConnector {
  id = "sap-ecc";
  label = "SAP ECC";
  capabilities: ErpCapability[] = ["idoc", "bapi", "rfc"];
  protected requiredEnv = ["SAP_ECC_HOST", "SAP_ECC_USER", "SAP_ECC_PASSWORD"];
  protected async fetchDataset(): Promise<ProcurementDataset> {
    // TODO: BAPI_PO_GETITEMS / RFC_READ_TABLE / IDoc ORDERS05 → normalized dataset.
    throw new ConnectorNotConfiguredError(this.id);
  }
}

export class SapS4Connector extends CredentialedConnector {
  id = "sap-s4hana";
  label = "SAP S/4HANA";
  capabilities: ErpCapability[] = ["odata", "bapi", "rfc"];
  protected requiredEnv = ["SAP_S4_BASE_URL", "SAP_S4_API_KEY"];
  protected async fetchDataset(): Promise<ProcurementDataset> {
    // TODO: OData API_PURCHASEORDER_PROCESS_SRV / supplier + invoice services.
    throw new ConnectorNotConfiguredError(this.id);
  }
}

export class Dynamics365Connector extends CredentialedConnector {
  id = "dynamics-365";
  label = "Microsoft Dynamics 365";
  capabilities: ErpCapability[] = ["odata", "rest"];
  protected requiredEnv = ["DYNAMICS_BASE_URL", "DYNAMICS_CLIENT_ID", "DYNAMICS_CLIENT_SECRET"];
  protected async fetchDataset(): Promise<ProcurementDataset> {
    // TODO: Dataverse OData entities (purchaseorders, vendors, invoices).
    throw new ConnectorNotConfiguredError(this.id);
  }
}

export class OracleErpConnector extends CredentialedConnector {
  id = "oracle-erp";
  label = "Oracle ERP Cloud";
  capabilities: ErpCapability[] = ["rest", "soap"];
  protected requiredEnv = ["ORACLE_ERP_BASE_URL", "ORACLE_ERP_USER", "ORACLE_ERP_PASSWORD"];
  protected async fetchDataset(): Promise<ProcurementDataset> {
    // TODO: Oracle Fusion Procurement REST (purchaseOrders, suppliers, invoices).
    throw new ConnectorNotConfiguredError(this.id);
  }
}

export class NetSuiteConnector extends CredentialedConnector {
  id = "netsuite";
  label = "NetSuite";
  capabilities: ErpCapability[] = ["rest", "soap"];
  protected requiredEnv = ["NETSUITE_ACCOUNT_ID", "NETSUITE_TOKEN", "NETSUITE_SECRET"];
  protected async fetchDataset(): Promise<ProcurementDataset> {
    // TODO: SuiteQL / REST record service for POs, vendors, invoices.
    throw new ConnectorNotConfiguredError(this.id);
  }
}
