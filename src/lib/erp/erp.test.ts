import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvRecords, buildDatasetFromCsv, CsvConnector } from "./csv";
import { getConnector, getConnectors } from "./index";
import { ConnectorNotConfiguredError } from "./types";
import { computeSpendSummary } from "../analytics";

describe("CSV parser", () => {
  it("handles quoted fields, embedded commas, and escaped quotes", () => {
    const rows = parseCsv('a,b,c\n"hello, world","say ""hi""",3\n');
    expect(rows[0]).toEqual(["a", "b", "c"]);
    expect(rows[1]).toEqual(["hello, world", 'say "hi"', "3"]);
  });

  it("maps rows to header-keyed records", () => {
    const recs = parseCsvRecords("id,name\nS1,Acme\nS2,Globex");
    expect(recs).toEqual([
      { id: "S1", name: "Acme" },
      { id: "S2", name: "Globex" },
    ]);
  });
});

describe("CSV connector import", () => {
  const suppliers =
    "id,name,category,country,deliveryScore,qualityScore,financialScore,complianceScore\n" +
    "S1,Acme,Raw Materials,USA,80,80,80,80";
  const purchaseOrders =
    "id,supplierId,category,amount,status,orderDate,expectedDate\n" +
    "PO1,S1,Raw Materials,1000,received,2025-01-01,2025-01-10\n" +
    "PO2,S1,Raw Materials,500,open,2025-02-01,2025-02-10";
  const invoices =
    "id,supplierId,poId,amount,issueDate,dueDate,status\n" +
    "INV1,S1,PO1,1000,2025-01-11,2025-02-11,unpaid";
  const deliveries =
    "id,poId,expectedDate,actualDate\n" +
    "DEL1,PO1,2025-01-10,2025-01-12\nDEL2,PO2,2025-02-10,";

  it("builds a typed, analysis-ready dataset", async () => {
    const conn = new CsvConnector({ suppliers, purchaseOrders, invoices, deliveries });
    expect(conn.isConfigured()).toBe(true);
    const data = await conn.importDataset();
    expect(data.suppliers).toHaveLength(1);
    expect(data.purchaseOrders).toHaveLength(2);
    expect(data.deliveries[1].actualDate).toBeNull(); // empty -> pending
    // Realized spend = received PO only (1000), open PO excluded.
    expect(computeSpendSummary(data).total).toBe(1000);
  });

  it("coerces numerics and rejects invalid rows with a clear error", () => {
    expect(() =>
      buildDatasetFromCsv({ suppliers: "id,name,category,country,deliveryScore,qualityScore,financialScore,complianceScore\nS1,Acme,Spaceships,USA,80,80,80,80" }),
    ).toThrow(/category/);
  });
});

describe("connector registry", () => {
  it("lists vendor + REST connectors with capability metadata", () => {
    const ids = getConnectors().map((c) => c.id);
    expect(ids).toContain("sap-s4hana");
    expect(ids).toContain("dynamics-365");
    expect(ids).toContain("oracle-erp");
    expect(ids).toContain("netsuite");
    expect(ids).toContain("rest");
    expect(getConnector("sap-s4hana")?.capabilities).toContain("odata");
  });

  it("reports unconfigured vendors and refuses import until wired", async () => {
    const sap = getConnector("sap-s4hana")!;
    expect(sap.isConfigured()).toBe(false);
    const status = await sap.testConnection();
    expect(status.configured).toBe(false);
    await expect(sap.importDataset()).rejects.toBeInstanceOf(ConnectorNotConfiguredError);
  });
});
