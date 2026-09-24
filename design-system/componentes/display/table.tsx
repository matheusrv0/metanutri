import * as React from 'react'
import { cn } from '@ds/lib/cn.ts'

/**
 * Tabela de dado: faixa cinza de cabeçalho com canto arredondado, linhas separadas
 * por fio fino e numeral tabular em toda a grade. A legenda da notação (†, ‡, —)
 * vai no rodapé, em `TableFootnotes` — é a promessa do produto de nunca esconder
 * falta de dado.
 */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('numeros w-full caption-bottom border-separate border-spacing-0 text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child>td]:border-b-0', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors [&:has(td)]:hover:bg-muted/60', className)} {...props} />
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 whitespace-nowrap bg-surfacesunken px-3 text-left align-middle text-xs font-medium text-muted-foreground first:rounded-l-sm last:rounded-r-sm',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-border px-3 py-3 align-middle', className)} {...props} />
}

/** Legenda da notação, no pé da tabela. */
export function TableFootnotes({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground', className)} {...props}>
      {children}
    </div>
  )
}
