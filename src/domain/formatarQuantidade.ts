// Números da tabela de adequação: só a precisão que serve para decidir (spec pdf-e-telas-limpas, CA-339).
const formatadores = new Map<string, Intl.NumberFormat>()

function formato(minimo: number, maximo: number): Intl.NumberFormat {
  const chave = `${minimo}-${maximo}`
  let f = formatadores.get(chave)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: minimo, maximumFractionDigits: maximo })
    formatadores.set(chave, f)
  }
  return f
}

/** "8,7", "656", "2.748". Positivo que arredondaria para 0,0 vira "< 0,1": não pode parecer zero. */
export function quantidadeNoPlano(valor: number): string {
  if (valor > 0 && valor < 0.05) return '< 0,1'
  return Math.abs(valor) < 100 ? formato(1, 1).format(valor) : formato(0, 0).format(valor)
}

/** A referência como foi publicada, sem zeros à direita: "0,9", "1,1", "18", "1.000". */
export function valorDeReferencia(valor: number): string {
  return formato(0, 2).format(valor)
}
