// Pagination helper for large tables (Phase 9/14).
//
// Pure and side-effect free. Pair with virtualized rendering on the client for
// datasets in the hundreds of thousands of rows.

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate<T>(items: T[], page = 1, pageSize = 50): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (clamped - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: clamped,
    pageSize,
    total,
    totalPages,
    hasNext: clamped < totalPages,
    hasPrev: clamped > 1,
  };
}
