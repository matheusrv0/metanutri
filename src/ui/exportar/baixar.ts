/** Nome de arquivo seguro: sem acentos nem caracteres proibidos no Windows. */
export function nomeDeArquivo(base: string, sufixo: string): string {
  const limpo = base
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return `${limpo || 'caso'}-${sufixo}.docx`
}

/** Baixa um arquivo gerado no navegador. */
export function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Copia a tabela como HTML (o Word mantém linhas e colunas) com texto simples de reserva (CA-48).
 * Devolve `false` quando o navegador não deixa copiar.
 */
export async function copiarTabela(html: string, texto: string): Promise<boolean> {
  try {
    const areaDeTransferencia = navigator.clipboard
    if (areaDeTransferencia && 'write' in areaDeTransferencia && typeof ClipboardItem !== 'undefined') {
      await areaDeTransferencia.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([texto], { type: 'text/plain' }),
        }),
      ])
      return true
    }
    if (areaDeTransferencia?.writeText) {
      await areaDeTransferencia.writeText(texto)
      return true
    }
    return false
  } catch {
    return false
  }
}
