// O formulário de "Meus alimentos" e o item guardado, nos dois sentidos (spec alimentos-e-gramaturas, D-383 a D-385).
// Puro: a tela lê e escreve por aqui.
import { medidasDoAlimento } from './busca.ts'
import {
  energiaIncoerente,
  GRUPOS_PROPRIOS,
  type DadosAlimentoProprio,
  type DadosParaSalvar,
  type FonteAlimentoProprio,
  type MedidaDoProprio,
  type PreparoProprio,
  type Produto,
} from './produtos.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

/** "1 pote" → "pote" (A11). */
const nomeDaPorcaoDoTexto = (texto: string): string => /^1\s+([^\d].*)$/.exec(texto.trim())?.[1]?.trim() ?? ''

/** Só números de verdade; o resto é "não informado" (nulo). */
function valoresLimpos(v: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>): Partial<Record<ChaveNutrienteAlimento, number | null>> {
  return Object.fromEntries(Object.entries(v).map(([chave, n]) => [chave, typeof n === 'number' && Number.isFinite(n) ? n : null]))
}

/** O formulário em branco, no tipo escolhido. */
export function dadosEmBranco(tipo: DadosAlimentoProprio['tipo'] = 'alimento'): DadosAlimentoProprio {
  return {
    tipo,
    nome: '',
    nomeParaPaciente: '',
    marca: '',
    codigoBarras: '',
    grupo: '',
    preparo: null,
    unidade: 'g',
    base: tipo === 'rotulo' ? 'porcao' : 'por100',
    porcaoG: null,
    nomeDaPorcao: '',
    valores: {},
    medidas: [],
    fonte: tipo === 'rotulo' ? { tipo: 'rotulo' } : null,
    observacoes: '',
    sugerirAutomaticamente: false,
  }
}

/** O item guardado no formulário (para editar). Item antigo, sem os campos novos, abre como rótulo na porção. */
export function dadosDoProduto(p: Produto): DadosAlimentoProprio {
  const base = p.base ?? 'porcao'
  const nomeDaPorcao = base === 'porcao' ? nomeDaPorcaoDoTexto(p.medidaCaseira) : ''
  const fonte: FonteAlimentoProprio = p.fonte ?? (p.codigoBarras ? { tipo: 'open-food-facts', codigo: p.codigoBarras, data: p.criadoEm.slice(0, 10) } : { tipo: 'rotulo' })
  return {
    tipo: p.tipo ?? 'rotulo',
    nome: p.nome,
    nomeParaPaciente: p.nomeParaPaciente ?? '',
    marca: p.marca,
    codigoBarras: p.codigoBarras,
    grupo: p.grupo ?? '',
    preparo: p.preparo ?? null,
    unidade: p.unidade ?? 'g',
    base,
    porcaoG: base === 'por100' ? 100 : p.porcaoG,
    nomeDaPorcao,
    valores: valoresLimpos(p.porPorcao),
    medidas: (p.medidas ?? []).filter((m) => m.nome !== nomeDaPorcao),
    fonte,
    observacoes: p.observacoes ?? '',
    sugerirAutomaticamente: p.sugerirAutomaticamente === true,
  }
}

/**
 * O formulário como o repositório grava (D-383): a porção dos valores (100 na base "por 100 g"), a porção do rótulo
 * como medida (A11) e os campos novos. `porcaoG` e `porPorcao` ficam sempre, para a versão de antes ler.
 */
export function produtoDosDados(d: DadosAlimentoProprio, id?: number): DadosParaSalvar {
  const porcaoG = d.base === 'por100' ? 100 : (d.porcaoG ?? 0)
  const nomeDaPorcao = d.base === 'porcao' ? d.nomeDaPorcao.trim() : ''
  const medidas: MedidaDoProprio[] = []
  for (const m of [...d.medidas, ...(nomeDaPorcao ? [{ nome: nomeDaPorcao, gramas: porcaoG }] : [])]) {
    const nome = m.nome.trim()
    if (nome !== '' && m.gramas > 0 && !medidas.some((x) => x.nome === nome)) medidas.push({ nome, gramas: m.gramas })
  }
  const rotulo = d.tipo === 'rotulo'
  const preparo: PreparoProprio = d.preparo ?? 'pronto para consumo'
  return {
    ...(id === undefined ? {} : { id }),
    tipo: d.tipo,
    nome: d.nome.trim(),
    nomeParaPaciente: d.nomeParaPaciente.trim(),
    marca: rotulo ? d.marca.trim() : '',
    codigoBarras: rotulo ? d.codigoBarras.replace(/\D/g, '') : '',
    grupo: d.grupo,
    preparo,
    unidade: d.unidade,
    base: d.base,
    porcaoG,
    medidaCaseira: nomeDaPorcao ? `1 ${nomeDaPorcao}` : '',
    porPorcao: valoresLimpos(d.valores),
    medidas,
    ...(d.fonte ? { fonte: d.fonte } : {}),
    observacoes: d.observacoes.trim(),
    // D-384: com a energia incoerente, o alimento não é sugerido automaticamente.
    sugerirAutomaticamente: d.sugerirAutomaticamente && !energiaIncoerente(d.valores),
  }
}

/** O preparo da base no formulário (D-383): "cru", "cozido"… o que a TACO não diz vira "pronto para consumo". */
function preparoDaBase(a: Alimento): PreparoProprio {
  const p = (a.preparo ?? '').toLowerCase()
  if (p.startsWith('cru')) return 'cru'
  if (p.startsWith('cozid')) return 'cozido'
  if (p.startsWith('assad')) return 'assado'
  if (p.startsWith('grelhad')) return 'grelhado'
  if (p.startsWith('frit')) return 'frito'
  return 'pronto para consumo'
}

/**
 * "Copiar para Meus alimentos" (D-385, o "Duplicar alimentos" do WebDiet): a composição por 100 g, as medidas e a fonte
 * "cópia da base", para ajustar.
 */
export function dadosDaCopiaDaBase(a: Alimento): DadosAlimentoProprio {
  return {
    ...dadosEmBranco('alimento'),
    nome: a.descricao.trim(),
    grupo: GRUPOS_PROPRIOS.includes(a.categoria) ? a.categoria : '',
    preparo: preparoDaBase(a),
    base: 'por100',
    porcaoG: 100,
    valores: valoresLimpos(a.nutrientes),
    medidas: medidasDoAlimento(a.id).map((m) => ({ nome: m.nome, gramas: m.gramas })),
    fonte: { tipo: 'copia-da-base', origemId: a.id },
  }
}
