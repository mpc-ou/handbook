"use client";

import React from "react";
import {
  Column,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortableHeader<TData, TValue>({
  column,
  label,
}: {
  column: Column<TData, TValue>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
    >
      <span>{label}</span>
      <ArrowUpDown className="size-3" />
    </button>
  );
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  pageSize?: number;
  toolbar?: React.ReactNode;
  bulkActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode;
  emptyState?: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData, index: number) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  pageSize = 20,
  toolbar,
  bulkActions,
  emptyState,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((r) => r.original);

  const clearSelection = () => setRowSelection({});

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div className="space-y-3">
      {/* Toolbar or Bulk Selection Bar */}
      {selectedRows.length > 0 && bulkActions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-foreground">
              Selected {selectedRows.length} items
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Deselect
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions(selectedRows, clearSelection)}
          </div>
        </div>
      ) : (
        toolbar
      )}

      {/* Flat 1px Table Container */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent border-b border-border"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-9 px-3 text-xs font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  {columns.map((_, colIdx) => (
                    <TableCell key={colIdx} className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-[180px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(e) => {
                    // Ignore click if target is a button, input, checkbox, or dropdown trigger
                    const target = e.target as HTMLElement;
                    if (
                      target.closest(
                        "button, a, input, [role='checkbox'], [role='menuitem'], [data-radix-collection-item]"
                      )
                    ) {
                      return;
                    }
                    onRowClick?.(row.original);
                  }}
                  className={cn(
                    "border-b border-border/60 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/40"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="py-12 text-center"
                >
                  <div className="mx-auto max-w-sm space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {emptyTitle || emptyState?.title || "No data available"}
                    </p>
                    {(emptyDescription || emptyState?.description) && (
                      <p className="text-xs text-muted-foreground">
                        {emptyDescription || emptyState?.description}
                      </p>
                    )}
                    {(emptyAction || emptyState?.action) && (
                      <div className="pt-2">
                        {emptyAction || emptyState?.action}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-3">
          <span>
            Showing{" "}
            <strong className="font-mono text-foreground">
              {data.length === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1}–
              {Math.min((pageIndex + 1) * table.getState().pagination.pageSize, data.length)}
            </strong>{" "}
            of <strong className="font-mono text-foreground">{data.length}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Rows / page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-7 text-xs rounded-md border border-border bg-background px-1.5 py-0.5 text-foreground cursor-pointer"
            >
              {[20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </div>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </Button>
            <span className="px-2 font-mono text-foreground">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
