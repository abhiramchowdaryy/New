// CSV ingestion + connector (Phase 3).
//
// A dependency-free RFC-4180-ish parser (handles quoted fields, embedded commas,
// quotes, and CRLF/LF) plus zod-validated mappers from rows to typed entities.
// This is the reference "flat file" connector and the easiest path to real data.

import { z } from "zod";
import { getAsOfDate } from "../clock";
import {
  ConnectorImportError,
  type ConnectorStatus,
  type ErpCapability,
  type ErpConnector,
} from "./types";
import type {
  Delivery,
  Invoice,
  ProcurementDataset,
  PurchaseOrder,
  Supplier,
} from "../types";

/** Parse CSV text into rows of string cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  // Flush trailing cell/row if the file doesn't end in a newline.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
}

/** Parse CSV into header-keyed objects. */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = (cells[idx] ?? "").trim();
    });
    return rec;
  });
}

const num = z.coerce.number();
const SpendCategoryEnum = z.enum([
  "Raw Materials",
  "Logistics",
  "IT & Software",
  "Facilities",
  "Professional Services",
  "Packaging",
  "Marketing",
]);

const SupplierRow = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: SpendCategoryEnum,
  country: z.string().min(1),
  deliveryScore: num,
  qualityScore: num,
  financialScore: num,
  complianceScore: num,
});

const PoRow = z.object({
  id: z.string().min(1),
  supplierId: z.string().min(1),
  category: SpendCategoryEnum,
  amount: num,
  status: z.enum(["open", "received", "closed", "cancelled"]),
  orderDate: z.string().min(1),
  expectedDate: z.string().min(1),
});

const InvoiceRow = z.object({
  id: z.string().min(1),
  supplierId: z.string().min(1),
  poId: z.string().min(1),
  amount: num,
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  status: z.enum(["paid", "unpaid"]),
});

const DeliveryRow = z.object({
  id: z.string().min(1),
  poId: z.string().min(1),
  expectedDate: z.string().min(1),
  actualDate: z.string().optional().transform((v) => (v && v.length > 0 ? v : null)),
});

function mapRows<T>(label: string, text: string | undefined, schema: z.ZodType<T>): T[] {
  if (!text || text.trim() === "") return [];
  const records = parseCsvRecords(text);
  return records.map((rec, i) => {
    const parsed = schema.safeParse(rec);
    if (!parsed.success) {
      throw new ConnectorImportError(
        "csv",
        `${label} row ${i + 2}: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`,
      );
    }
    return parsed.data;
  });
}

export interface CsvSources {
  suppliers?: string;
  purchaseOrders?: string;
  invoices?: string;
  deliveries?: string;
  asOfDate?: string;
}

/** Build a ProcurementDataset from CSV text sources (validated). */
export function buildDatasetFromCsv(sources: CsvSources): ProcurementDataset {
  return {
    suppliers: mapRows<Supplier>("suppliers", sources.suppliers, SupplierRow),
    purchaseOrders: mapRows<PurchaseOrder>("purchaseOrders", sources.purchaseOrders, PoRow),
    invoices: mapRows<Invoice>("invoices", sources.invoices, InvoiceRow),
    deliveries: mapRows<Delivery>("deliveries", sources.deliveries, DeliveryRow),
    budgets: [],
    contracts: [],
    asOfDate: sources.asOfDate ?? getAsOfDate(),
  };
}

export class CsvConnector implements ErpConnector {
  readonly id = "csv";
  readonly label = "CSV / Flat file";
  readonly capabilities: ErpCapability[] = ["file"];

  constructor(private readonly sources: CsvSources) {}

  isConfigured(): boolean {
    return Boolean(
      this.sources.suppliers ||
        this.sources.purchaseOrders ||
        this.sources.invoices ||
        this.sources.deliveries,
    );
  }

  async testConnection(): Promise<ConnectorStatus> {
    const configured = this.isConfigured();
    return {
      configured,
      reachable: configured,
      message: configured ? "CSV sources present." : "No CSV sources provided.",
    };
  }

  async importDataset(): Promise<ProcurementDataset> {
    return buildDatasetFromCsv(this.sources);
  }
}
