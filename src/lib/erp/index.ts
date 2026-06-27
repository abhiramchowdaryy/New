// ERP connector registry (Phase 3).
//
// Single place to enumerate available connectors and look one up by id. The
// app/UI can list connectors, show their capabilities and configuration status,
// and trigger an import — all through the common ErpConnector interface.

import { RestConnector } from "./rest-connector";
import {
  Dynamics365Connector,
  NetSuiteConnector,
  OracleErpConnector,
  SapEccConnector,
  SapS4Connector,
} from "./vendor-connectors";
import type { ErpConnector } from "./types";

/** Connectors that don't need per-request construction (no file inputs). */
export function getConnectors(): ErpConnector[] {
  return [
    new SapEccConnector(),
    new SapS4Connector(),
    new Dynamics365Connector(),
    new OracleErpConnector(),
    new NetSuiteConnector(),
    new RestConnector(),
  ];
}

export function getConnector(id: string): ErpConnector | undefined {
  return getConnectors().find((c) => c.id === id);
}

export * from "./types";
export { CsvConnector, buildDatasetFromCsv, parseCsv, parseCsvRecords } from "./csv";
export { RestConnector } from "./rest-connector";
