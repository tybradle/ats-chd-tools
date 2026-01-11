"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function DenseTable({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="dense-table-container"
      className={cn("border rounded-md overflow-hidden flex flex-col max-h-[600px]", className)}
    >
      <div className="overflow-auto">
        <table
          data-slot="dense-table"
          className="w-full caption-bottom text-sm"
          {...props}
        />
      </div>
    </div>
  )
}

function DenseTableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="dense-table-header"
      className={cn("[&_tr]:border-b sticky top-0 bg-background z-10", className)}
      {...props}
    />
  )
}

function DenseTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="dense-table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function DenseTableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="dense-table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function DenseTableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="dense-table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function DenseTableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="dense-table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function DenseTableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="dense-table-cell"
      className={cn(
        "p-1 px-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function DenseTableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="dense-table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  DenseTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableFooter,
  DenseTableHead,
  DenseTableRow,
  DenseTableCell,
  DenseTableCaption,
}