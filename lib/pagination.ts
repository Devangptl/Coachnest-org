/**
 * Shared pagination helpers for server-side (Prisma) list queries.
 *
 * Tables across the app load records page-by-page instead of fetching the
 * whole dataset. Services accept a `PaginationParams` and return a
 * `Paginated<T>` envelope so pages and API routes stay consistent.
 */

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Normalize raw (often string) page/pageSize input into safe values plus the
 * Prisma `skip`/`take` to apply. `pageSize` is clamped to an allowed option.
 */
export function parsePagination(
  input: { page?: string | number | null; pageSize?: string | number | null } | undefined,
  defaultPageSize: number = DEFAULT_PAGE_SIZE,
): { page: number; pageSize: number; skip: number; take: number } {
  const rawSize = Number(input?.pageSize);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize)
    ? rawSize
    : defaultPageSize;

  const rawPage = Math.floor(Number(input?.page));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Wrap a fetched page slice + total count into the standard envelope. */
export function buildPaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
