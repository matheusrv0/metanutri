// O formulário de "Meus alimentos" e o item guardado, nos dois sentidos (spec alimentos-e-gramaturas, D-383 a D-385).
// Puro: a tela lê e escreve por aqui.
import { medidasDoAlimento } from './busca.ts'
import { comecaPelaQuantidade, lerMedidaDoRotulo } from './medidaDoRotulo.ts'
import { motivoParaNaoSugerir } from './sugestaoDoProprio.ts'
import {
  energiaIncoerente,
  GRUPOS_PROPRIOS,
  produtoComoAlimento,
  type DadosAlimentoProprio,
  type DadosParaSalvar,
  type FonteAlimentoProprio,
  type MedidaDoProprio,
  type PreparoProprio,
  type Produto,
} from './produtos.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

/** A medida caseira da porção como o rótulo escreve (D-491): "pote" vira "1 pote"; "4 colheres de sopa" fica como está. */
const textoDaMedidaCaseira = (texto: string): string => (texto === '' || comecaPelaQuantidade(texto) ? texto : `1 ${texto}`)

/** A medida que a porção vira (A11, D-433 e D-491): "4 colheres de sopa" de 40 g é a colher de sopa de 10 g. */
function medidaDaPorcao(texto: string, porcaoG: number): MedidaDoProprio | null {
  const medida = texto === '' ? null : lerMedidaDoRotulo(texto, porcaoG)?.medida
  return medida ? { nome: medida.nome, gramas: medida.gramas } : null
}

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

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * O item guardado no formulário (para editar). Item antigo, sem os campos novos, abre como rótulo na porção; sem os
 * campos de texto (D-498), abre com eles vazios.
 */
export function dadosDoProduto(p: Produto): DadosAlimentoProprio {
  const base = p.base ?? 'porcao'
  const codigoBarras = texto(p.codigoBarras)
  // D-491: o texto inteiro, como foi gravado (o rótulo antigo com "4 colheres de sopa" não perde a medida ao salvar).
  const nomeDaPorcao = base === 'porcao' ? texto(p.medidaCaseira).trim() : ''
  const daPorcao = medidaDaPorcao(nomeDaPorcao, p.porcaoG)
  const fonte: FonteAlimentoProprio = p.fonte ?? (codigoBarras ? { tipo: 'open-food-facts', codigo: codigoBarras, data: texto(p.criadoEm).slice(0, 10) } : { tipo: 'rotulo' })
  return {
    tipo: p.tipo ?? 'rotulo',
    nome: p.nome,
    nomeParaPaciente: p.nomeParaPaciente ?? '',
    marca: texto(p.marca),
    codigoBarras,
    grupo: p.grupo ?? '',
    preparo: p.preparo ?? null,
    unidade: p.unidade ?? 'g',
    base,
    porcaoG: base === 'por100' ? 100 : p.porcaoG,
    nomeDaPorcao,
    valores: valoresLimpos(p.porPorcao),
    // A medida que vem da porção volta a sair dela ao salvar; na lista, apareceria repetida.
    medidas: (p.medidas ?? []).filter((m) => m.nome !== daPorcao?.nome),
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
  const medidaCaseira = d.base === 'porcao' ? textoDaMedidaCaseira(d.nomeDaPorcao.trim()) : ''
  const daPorcao = medidaDaPorcao(medidaCaseira, porcaoG)
  const medidas: MedidaDoProprio[] = []
  for (const m of [...d.medidas, ...(daPorcao ? [daPorcao] : [])]) {
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
    medidaCaseira,
    porPorcao: valoresLimpos(d.valores),
    medidas,
    ...(d.fonte ? { fonte: d.fonte } : {}),
    observacoes: d.observacoes.trim(),
    // D-384 e D-493: com a energia incoerente ou com um motivo da regra do alimento próprio, a chave fica desligada.
    sugerirAutomaticamente: d.sugerirAutomaticamente && !energiaIncoerente(d.valores) && motivoParaNaoSugerirDados(d) === null,
  }
}

/**
 * D-493: por que o alimento do formulário não entra no Cobrir nem nas trocas ("gordura trans declarada", "doce"…);
 * `null` quando pode entrar ou enquanto a porção não vale (os valores por 100 g ainda não existem).
 */
export function motivoParaNaoSugerirDados(d: DadosAlimentoProprio): string | null {
  const porcaoG = d.base === 'por100' ? 100 : d.porcaoG
  if (porcaoG === null || !(porcaoG > 0)) return null
  const alimento = produtoComoAlimento({
    id: 0,
    codigoBarras: '',
    nome: d.nome,
    marca: d.tipo === 'rotulo' ? d.marca : '',
    porcaoG,
    medidaCaseira: '',
    porPorcao: valoresLimpos(d.valores),
    criadoEm: '',
    tipo: d.tipo,
    grupo: d.grupo,
    preparo: d.preparo ?? 'pronto para consumo',
    unidade: d.unidade,
  })
  return motivoParaNaoSugerir(alimento)
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
