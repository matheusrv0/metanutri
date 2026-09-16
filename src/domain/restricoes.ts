// Restrições do paciente aplicadas às sugestões de alimento.

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Verdadeiro quando a descrição do alimento contém alguma palavra da lista de restrições. */
export function casaRestricao(descricao: string, restricoes: readonly string[]): boolean {
  const alvo = semAcento(descricao)
  return restricoes.some((r) => {
    const termo = semAcento(r).trim()
    return termo.length >= 3 && alvo.includes(termo)
  })
}
