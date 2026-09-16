import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Tabela no padrão da composição impressa: cabeçalho em versalete sobre fio forte,
 * linhas separadas por fio fino e numeral tabular em toda a grade.
 */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('numeros w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:fio-regra', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  // Tinta alternada: o recurso que a tabela impressa usa para o olho não pular de linha.
  return <tbody className={cn('[&_tr:last-child]:border-0 [&_tr:nth-child(even)]:bg-muted/50', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-fio transition-colors hover:bg-muted/60', className)} {...props} />
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('rotulo h-8 px-3 pb-2 text-left align-bottom whitespace-nowrap', className)} {...props} />
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-2.5 align-middle', className)} {...props} />
}

/**
 * Nota de rodapé da folha: a legenda da notação, como no pé da tabela impressa.
 * Mantém a promessa do produto de nunca esconder falta de dado.
 */
export function TableFootnotes({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-fioforte pt-3 text-xs leading-relaxed text-muted-foreground', className)} {...props}>
      {children}
    </div>
  )
}
