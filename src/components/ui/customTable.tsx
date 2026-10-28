"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import Text from "./customText";
import { formatNumber } from "@/config/numberFormat";
import { dateFormat } from "@/config/dateFormat";
import { Column, CustomTableProps } from "@/types/table";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
        if (acc == null || typeof acc !== "object") return undefined;
        return (acc as Record<string, unknown>)[key];
    }, obj);
}

export default function CustomTable<T extends Record<string, unknown>>({
    columns,
    rows,
    rowKey,
    total,
    page = 1,
    onPageChange,
    rowsPerPage = 10,
    paginated = false,
    emptyText = "No data available",
    onClick,
    className,
    tableClassName,
    rowClassName,
}: CustomTableProps<T>) {
    const tableRows = useMemo(
        () => (Array.isArray(rows) ? rows : []),
        [rows],
    );
    const itemTotal = paginated
        ? (total ?? tableRows.length)
        : tableRows.length;
    const totalPages = paginated ? Math.ceil(itemTotal / rowsPerPage) : 1;

    const items = useMemo(() => {
        if (!paginated) return tableRows;
        const start = (page - 1) * rowsPerPage;
        return tableRows.slice(start, start + rowsPerPage);
    }, [paginated, page, tableRows, rowsPerPage]);

    const rangeStart = itemTotal === 0 ? 0 : (page - 1) * rowsPerPage + 1;
    const rangeEnd = Math.min(page * rowsPerPage, itemTotal);

    function renderCell(item: T, column: Column<T>): React.ReactNode {
        const value = column.id.includes(".")
            ? getNestedValue(item, column.id)
            : item[column.id as keyof T];

        if (column.render) {
            return column.render(value, item);
        }

        if (value == null) return "-";

        switch (column.type) {
            case "date":
                return dateFormat(String(value));
            case "number":
                return formatNumber(Number(value), "");
            case "currency":
                return formatNumber(Number(value));
            default:
                return String(value);
        }
    }

    return (
        <div
            className={cn(
                "overflow-hidden rounded-2xl border border-grey-02 bg-white",
                className,
            )}
        >
            <div className="overflow-x-auto">
                <table
                    className={cn("min-w-full border-collapse", tableClassName)}
                >
                    <thead>
                        <tr className="border-b border-grey-02 bg-white">
                            {columns.map((column: Column<T>) => (
                                <th
                                    key={column.id}
                                    scope="col"
                                    className="px-4 py-4 text-left text-sm font-medium text-grey-03"
                                >
                                    {column.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map((row) => (
                                <tr
                                    key={String(row[rowKey])}
                                    className={cn(
                                        "border-b border-grey-02 last:border-b-0",
                                        onClick && "cursor-pointer",
                                        rowClassName,
                                    )}
                                    onClick={onClick}
                                >
                                    {columns.map((column: Column<T>) => (
                                        <td
                                            key={column.id}
                                            className="px-4 py-4 text-sm text-grey-04"
                                        >
                                            {renderCell(row, column)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-16 text-center"
                                >
                                    <Text className="text-sm text-grey-03">
                                        {emptyText}
                                    </Text>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {paginated && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-grey-02 px-4 py-3">
                    <Text className="text-sm text-grey-03">
                        {rangeStart} to {rangeEnd} of {itemTotal} results
                    </Text>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="rounded-lg border border-grey-02 px-3 py-1.5 text-sm text-grey-05 disabled:opacity-40"
                            disabled={page <= 1}
                            onClick={() =>
                                onPageChange?.(Math.max(1, page - 1))
                            }
                        >
                            Prev
                        </button>
                        {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1,
                        ).map((p) => (
                            <button
                                key={p}
                                type="button"
                                className={cn(
                                    "rounded-lg px-3 py-1.5 text-sm",
                                    p === page
                                        ? "bg-grey-05 text-white"
                                        : "border border-grey-02 text-grey-05",
                                )}
                                onClick={() => onPageChange?.(p)}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="rounded-lg border border-grey-02 px-3 py-1.5 text-sm text-grey-05 disabled:opacity-40"
                            disabled={page >= totalPages}
                            onClick={() =>
                                onPageChange?.(Math.min(totalPages, page + 1))
                            }
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
