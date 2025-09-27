import * as React from "react"
import { cn } from "@/lib/utils"

export function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full caption-bottom text-sm",
        // Tema uyumu
        "bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        // Alt çizgiler ve başlık arkaplanı
        "[&_tr]:border-b border-border",
        "bg-muted/40",
        className
      )}
      {...props}
    />
  )
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        // Son satır alt çizgiyi kaldır
        "[&_tr:last-child]:border-0",
        className
      )}
      {...props}
    />
  )
}

export function TableFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        "bg-muted font-medium",
        "[&_tr]:border-t border-border",
        className
      )}
      {...props}
    />
  )
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors",
        "hover:bg-muted/40 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle text-sm font-medium",
        "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "p-3 align-middle",
        // İçerik rengi
        "text-foreground",
        className
      )}
      {...props}
    />
  )
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}
