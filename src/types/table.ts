import { ReactNode } from "react";

export type ColumnType = "date" | "number" | "currency" | "string";

export interface Column<T = Record<string, unknown>> {
  id: string;
  name: string;
  type?: ColumnType;
  render?: (value: unknown, item: T) => ReactNode;
}

export interface CustomTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  rowKey: keyof T;
  total?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  rowsPerPage?: number;
  paginated?: boolean;
  emptyText?: string;
  onClick?: () => void;
  className?: string;
  tableClassName?: string;
  rowClassName?: string;
}
