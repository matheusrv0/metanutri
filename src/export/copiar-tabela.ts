// Tabela de adequação em HTML (reconhecida pelo Word ao colar) e em texto com tabulação (SPEC CA-48).
import type { EstadoAdequacao, LinhaAdequacao, ResultadoAdequacao } from '../domain/adequacao.ts'

const formatadores = new Map<number, Intl.NumberFormat>()

export function formatarNumero(valor: number, casas: number): string {
  let f = formatadores.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    formatadores.set(casas, f)
  }
  return f.format(valor)
}

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const casasPara = (unidade: string, valor: number) => (unidade === 'mg' && valor < 1 ? 2 : 1)

const TIPO: Readonly<Record<LinhaAdequacao['referencia']['tipo'], string>> = { rda: 'RDA', ear: 'EAR', ai: 'AI' }

function textoEstado(l: LinhaAdequacao): string {
  const nomes: Readonly<Record<EstadoAdequacao, string>> = {
    abaixo: 'Abaixo da meta',
    adequado: 'Adequado',
    'acima-limite': 'Acima do limite',
  }
  if (l.estado === 'acima-limite' && l.limite) {
    return `${nomes[l.estado]} (${l.limite.tipo.toUpperCase()} ${formatarNumero(l.limite.valor, casasPara(l.unidade, l.limite.valor))} ${l.unidade})`
  }
  return nomes[l.estado]
}

const CABECALHO = ['Nutriente', 'Total', 'Referência', 'Tipo', 'Adequação', 'Estado'] as const

function celulas(l: LinhaAdequacao): string[] {
  return [
    l.rotulo,
    `${formatarNumero(l.total, casasPara(l.unidade, l.total))} ${l.unidade}${l.subestimado ? ' *' : ''}`,
    `${formatarNumero(l.referencia.valor, casasPara(l.unidade, l.referencia.valor))} ${l.unidade}`,
    TIPO[l.referencia.tipo],
    `${formatarNumero(l.adequacaoPct, 0)}%`,
    textoEstado(l),
  ]
}

export function tabelaAdequacaoParaCopiar(resultado: ResultadoAdequacao): { readonly html: string; readonly texto: string } {
  if (!resultado.estagio || resultado.linhas.length === 0) {
    const motivo = resultado.motivoSemCalculo ?? 'Sem dados de adequação.'
    return { html: `<p>${escapar(motivo)}</p>`, texto: motivo }
  }

  const linhas = resultado.linhas.map(celulas)
  const temSubestimado = resultado.linhas.some((l) => l.subestimado)
  const nota = temSubestimado ? '* 1 ou mais alimentos sem dado para este nutriente: o total pode estar subestimado.' : ''

  const tr = (tag: 'th' | 'td', valores: readonly string[]) => `<tr>${valores.map((v) => `<${tag}>${escapar(v)}</${tag}>`).join('')}</tr>`
  const html =
    `<table border="1" cellspacing="0" cellpadding="4">` +
    `<thead>${tr('th', CABECALHO)}</thead>` +
    `<tbody>${linhas.map((c) => tr('td', c)).join('')}</tbody>` +
    `</table>` +
    (nota ? `<p>${escapar(nota)}</p>` : '') +
    `<p>${escapar(`Referências: ${resultado.fonte}`)}</p>`

  const texto = [CABECALHO.join('\t'), ...linhas.map((c) => c.join('\t')), ...(nota ? ['', nota] : [])].join('\n')

  return { html, texto }
}
