// Peças comuns dos documentos Word (Aconselhamento e Memorial de cálculo).
import { AlignmentType, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, type Document } from 'docx'

/** Texto seguro para o documento: vazio em vez de "undefined" ou "null" (CA-47). */
export function texto(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : ''
  return valor
}

export function titulo(conteudo: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: conteudo, bold: true, size: 28 })],
  })
}

export function subtitulo(conteudo: string): Paragraph {
  return new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: conteudo, bold: true, size: 24 })] })
}

export function paragrafo(conteudo: string, opcoes: { negrito?: boolean } = {}): Paragraph {
  return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: texto(conteudo), bold: opcoes.negrito ?? false })] })
}

/** Célula com rótulo em negrito seguido do valor, como no modelo do estágio ("Nome: ..."). */
export function celulaRotulo(rotulo: string, valor: string, colunas = 1): TableCell {
  return new TableCell({
    columnSpan: colunas,
    children: [new Paragraph({ children: [new TextRun({ text: `${rotulo} `, bold: true }), new TextRun({ text: texto(valor) })] })],
  })
}

export function celula(valor: string, opcoes: { negrito?: boolean; colunas?: number } = {}): TableCell {
  return new TableCell({
    columnSpan: opcoes.colunas ?? 1,
    children: [new Paragraph({ children: [new TextRun({ text: texto(valor), bold: opcoes.negrito ?? false })] })],
  })
}

export function tabela(linhas: TableRow[]): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: linhas })
}

export function linha(celulas: TableCell[]): TableRow {
  return new TableRow({ children: celulas })
}

export function formatarNumeroDocx(valor: number | null, casas = 1): string {
  if (valor === null || !Number.isFinite(valor)) return ''
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor)
}

/** Gera o arquivo: `Blob` no navegador (para baixar) ou `Uint8Array` em testes. */
export async function gerarBytes(documento: Document): Promise<Uint8Array> {
  const buffer = await Packer.toArrayBuffer(documento)
  return new Uint8Array(buffer)
}

export async function gerarBlob(documento: Document): Promise<Blob> {
  return Packer.toBlob(documento)
}
