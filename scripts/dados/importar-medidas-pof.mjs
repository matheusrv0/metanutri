// Liga as medidas caseiras da POF 2008-2009 (IBGE) aos alimentos da TACO por regras revisadas à mão
// (dados-brutos/pof/regras-mapeamento-taco-pof.csv) e grava src/data/medidas-caseiras.json e
// src/data/medidas-revisao.md (lista para conferência humana).
// Uso: node scripts/dados/importar-medidas-pof.mjs
//
// As tabelas não compartilham códigos (ver dados-brutos/taco/dicionario-dados.md), por isso não há
// correspondência automática: só entram alimentos cobertos por uma regra.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { dividirLinhaCsv } from './importar-taco.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const POF = join(raiz, 'dados-brutos', 'pof', 'pof_medidas_caseiras.csv')
const REGRAS = join(raiz, 'dados-brutos', 'pof', 'regras-mapeamento-taco-pof.csv')
const ALIMENTOS = join(raiz, 'src', 'data', 'alimentos.json')
const DESTINO = join(raiz, 'src', 'data', 'medidas-caseiras.json')
const REVISAO = join(raiz, 'src', 'data', 'medidas-revisao.md')

/** Medidas que não são caseiras ou dependem de embalagem. */
export const MEDIDAS_DESCARTADAS = /^(GRAMA|QUILO|MILILITRO|LITRO|GARRAFA|LATA|PACOTE|SACO|SACHE)\b/

/** Preparo da TACO -> preparações da POF aceitas, em ordem de preferência. */
export const PREPAROS = {
  cru: ['CRU(A)', 'NAO SE APLICA'],
  cozido: ['CROZIDO(A)', 'NAO SE APLICA'],
  frito: ['FRITO(A)', 'NAO SE APLICA'],
  grelhado: ['GRELHADO(A)/BRASA/CHURRASCO', 'ASSADO(A)', 'NAO SE APLICA'],
  assado: ['ASSADO(A)', 'GRELHADO(A)/BRASA/CHURRASCO', 'NAO SE APLICA'],
  refogado: ['REFOGADO(A)', 'NAO SE APLICA'],
  torrado: ['NAO SE APLICA'],
  '': ['NAO SE APLICA', 'CRU(A)'],
}

const ROTULOS_MEDIDA = {
  'COLHER DE ARROZ/SERVIR': 'colher de servir',
  'COLHER DE SOPA': 'colher de sopa',
  'COLHER DE SOBREMESA': 'colher de sobremesa',
  'COLHER DE CHA': 'colher de chá',
  'COLHER DE CAFE': 'colher de café',
  'XICARA DE CHA': 'xícara de chá',
  'XICARA DE CAFE': 'xícara de café',
  'COPO AMERICANO': 'copo americano',
  'COPO MEDIO': 'copo médio',
  'COPO GRANDE': 'copo grande',
  'COPO DE REQUEIJAO': 'copo de requeijão',
  'COPO DE CAFEZINHO': 'copo de cafezinho',
  'COPO TULIPA': 'copo tulipa',
  'PRATO RASO': 'prato raso',
  'PRATO FUNDO': 'prato fundo',
  'PRATO DE SOBREMESA': 'prato de sobremesa',
  'UNIDADE PEQUENA': 'unidade pequena',
  'PONTA DE FACA': 'ponta de faca',
  PEDACO: 'pedaço',
  PORCAO: 'porção',
  PESCOCO: 'pescoço',
  FILE: 'filé',
  TACA: 'taça',
}

export function rotuloMedida(pof) {
  return ROTULOS_MEDIDA[pof] ?? pof.toLowerCase()
}

// ---------- Camada de plausibilidade (spec alimentos-e-gramaturas, D-430) ----------
// A POF mede o alimento como a família serve, e cada peso vem com a fonte (`descricao_fonte`: "Alface - folha média").
// O mapeamento TACO→POF ligava o cru à medida do cozido, uma variedade à de outra e a medida a outro utensílio ("concha"
// de alface que é "4 colheres de sopa"). Cada medida passa pelas regras abaixo; a que sai vai para a revisão com o motivo.

const semAcento = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const COZIDO_NA_FONTE = /(cozid|refogad|ensopad|assad|grelhad|frit|corad|empanad|milanesa)/
const CRU_NA_FONTE = /\bcru(a|s|as)?\b/

/** Carne, ave, peixe e salgado de carne: grelhado, assado, frito e cozido dão peças do mesmo tamanho ("filé de frango"). */
const CATEGORIAS_DE_PECA = new Set(['Carnes e derivados', 'Pescados e frutos do mar'])

/**
 * (a) A fonte é de outro preparo: cru com fonte cozida; cozido, assado ou grelhado com fonte crua ou frita; frito com
 * fonte cozida. Em carne, ave e peixe, só cru contra pronto conta.
 */
export function motivoDoPreparo(preparo, fonte, categoria = '') {
  const f = semAcento(fonte)
  if (preparo === 'cru' && COZIDO_NA_FONTE.test(f)) return 'fonte de outro preparo (cozido)'
  if (CATEGORIAS_DE_PECA.has(categoria)) return preparo && preparo !== 'cru' && CRU_NA_FONTE.test(f) ? 'fonte de outro preparo (cru)' : null
  if (['cozido', 'refogado', 'assado', 'grelhado'].includes(preparo) && (CRU_NA_FONTE.test(f) || /frit/.test(f))) return 'fonte de outro preparo (cru ou frito)'
  if (preparo === 'frito' && (/(cozid|refogad|ensopad|assad|grelhad)/.test(f) || CRU_NA_FONTE.test(f))) return 'fonte de outro preparo (não frito)'
  return null
}

/** Famílias de fruta com variedade no nome, na TACO e na fonte da POF. */
const VARIEDADES = [
  [/^banana,/, ['prata', 'nanica', 'ouro', 'maca', 'terra', 'figo', 'pacova', 'dagua']],
  [/^manga,/, ['espada', 'haden', 'palmer', 'tommy', 'rosa']],
  [/^mamao,/, ['papaia', 'formosa']],
  [/^maca,/, ['fuji', 'argentina', 'gala']],
  [/^laranja,/, ['pera', 'baia', 'lima', 'valencia', 'terra', 'seleta']],
  [/^pera,/, ['park', 'williams']],
  [/^uva,/, ['italia', 'rubi', 'niagara']],
  [/^(tangerina|mexerica),/, ['ponca', 'murcote', 'rio']],
]
const sinonimos = (s) => s.replace(/hadden/g, 'haden').replace(/papaya/g, 'papaia').replace(/bahia/g, 'baia').replace(/d.agua/g, 'dagua')

/** (b) A fonte nomeia uma variedade e o alimento é de outra (unidade da banana prata na banana nanica). */
export function motivoDaVariedade(descricao, fonte) {
  const d = sinonimos(semAcento(descricao))
  const familia = VARIEDADES.find(([re]) => re.test(d))
  if (!familia) return null
  const f = sinonimos(semAcento(fonte))
  const daFonte = familia[1].filter((v) => new RegExp(`\\b${v}\\b`).test(f))
  if (daFonte.length === 0) return null
  return daFonte.some((v) => new RegExp(`\\b${v}\\b`).test(d)) ? null : `fonte de outra variedade (${daFonte.join(', ')})`
}

/** O utensílio que a fonte precisa citar para a medida ser dela, e não uma conta feita com outro. */
const UTENSILIO_NA_FONTE = {
  concha: /concha/,
  escumadeira: /escuma/,
  pegador: /pegador/,
  garfada: /garfada/,
  caneca: /canec/,
  caneco: /canec/,
  tigela: /tigela|cumbuca/,
  cumbuca: /cumbuca|tigela/,
  pote: /pote|unidade/,
  'taça': /taca/,
  pires: /pires/,
  'maço': /maco/,
  rodela: /rodela/,
  'xícara de chá': /xicara/,
  'xícara de café': /xicara/,
  'copo de cafezinho': /copo|cafezinho|xicara/,
}

/** (c) Medida por procuração: a fonte descreve outro utensílio ("concha" de alface que é "4 colheres de sopa"). */
export function motivoDaProcuracao(nome, fonte) {
  const f = semAcento(fonte)
  const exigido = UTENSILIO_NA_FONTE[nome] ?? (nome.startsWith('copo') ? /copo/ : nome.startsWith('prato') ? /prato/ : null)
  return exigido && !exigido.test(f) ? 'a fonte é de outro utensílio' : null
}

const FOLHA_CRUA = /^(alface|rucula|agriao|almeirao|chicoria|espinafre|mostarda|serralha|taioba|caruru|catalonha)\b/
const FOLHA_PICADA = /^(couve, manteiga|repolho|acelga)\b/
const LIQUIDO = /^(cafe, infusao|cha, |leite, de vaca, (integral|desnatado, uht)$|leite, de cabra|leite, fermentado|bebida lactea|refrigerante|coco, agua|cana, caldo)|, suco/
const LIQUIDO_SEM_UNIDADE = /^(cafe|cha|leite, de vaca|leite, de cabra|refrigerante)/
const SO_FOLHA = new Set(['folha', 'ramo', 'pires', 'prato de sobremesa', 'prato raso', 'porção'])
const FOLHA_PICADA_OK = new Set([...SO_FOLHA, 'colher de sopa', 'colher de servir', 'colher de sobremesa', 'colher de chá'])
const FRUTA_OK = new Set(['unidade', 'unidade pequena', 'fatia', 'pedaço', 'banda', 'metade', 'gomo', 'bago', 'rodela', 'cacho', 'taça', 'xícara de chá', 'porção'])

/** (d) O tipo de medida que o grupo do alimento não usa. */
export function motivoDaClasse(alimento, nome) {
  const d = semAcento(alimento.descricao)
  const verdura = alimento.categoria.startsWith('Verduras')
  if (verdura && alimento.preparo === 'cru' && FOLHA_CRUA.test(d)) return SO_FOLHA.has(nome) ? null : 'folha crua só em folha, ramo, pires ou prato'
  if (verdura && alimento.preparo === 'cru' && FOLHA_PICADA.test(d)) return FOLHA_PICADA_OK.has(nome) ? null : 'verdura picada só em folha, colher, pires ou prato'
  if (alimento.categoria === 'Frutas e derivados' && alimento.preparo === 'cru' && !/suco|polpa/.test(d)) {
    if (FRUTA_OK.has(nome)) return null
    if (/^(abacate|cupuacu),/.test(d) && /^(colher|pote|tigela)/.test(nome)) return null
    return 'fruta só em unidade, fatia, pedaço ou taça'
  }
  if (/^(milho, verde, enlatado|ervilha, enlatada)/.test(d)) return /^(colher|porção)/.test(nome) ? null : 'grão em conserva só em colher'
  if (/^ovo, de galinha, inteiro, frito/.test(d)) return nome === 'unidade' || nome === 'porção' ? null : 'ovo frito só em unidade'
  if (alimento.categoria === 'Carnes e derivados' || alimento.categoria === 'Pescados e frutos do mar') {
    const pronto = ['grelhado', 'assado', 'frito'].includes(alimento.preparo)
    return pronto && /^(colher|concha|escumadeira|pegador|garfada|prato|copo|xícara)/.test(nome) ? 'carne grelhada, assada ou frita não se mede em colher ou concha' : null
  }
  if (LIQUIDO.test(d)) {
    if (/^(prato|pires|escumadeira|concha|colher de servir)/.test(nome)) return 'líquido não se mede em prato, concha ou escumadeira'
    if (/^unidade/.test(nome) && LIQUIDO_SEM_UNIDADE.test(d)) return 'café, chá, leite e refrigerante não têm unidade'
    return null
  }
  if (alimento.categoria === 'Gorduras e óleos') return /^(copo|xícara|concha|fatia|garfada|colher de servir|prato)/.test(nome) ? 'gordura só em colher ou ponta de faca' : null
  // Farinha, fubá, amido e pó não se servem com concha, escumadeira nem prato (os 18 mapeados em 21/10, revisão de 22/10).
  if (/^(farinha|milho, fuba|milho, amido|fecula|polvilho)|, po$/.test(d)) return /^(concha|escumadeira|prato|pires)/.test(nome) ? 'farinha e pó não se medem em concha nem prato' : null
  if (/^(acucar|mel)\b/.test(d)) return /^(copo|xícara|prato|caneca|caneco)/.test(nome) ? 'açúcar e mel só em colher' : null
  return null
}

/** (e) O peso máximo razoável de cada medida, em gramas. */
const PESO_MAXIMO = { 'colher de sopa': 45, 'colher de servir': 120, 'colher de sobremesa': 30, 'colher de chá': 12, 'colher de café': 6, concha: 200, escumadeira: 160, unidade: 800 }
/** A colher menor como parte da colher de sopa do mesmo alimento. */
const PROPORCAO_DA_SOPA = { 'colher de chá': [0.15, 0.5], 'colher de sobremesa': [0.35, 0.85], 'colher de café': [0.05, 0.3] }

export function motivoDoPeso(alimento, nome, gramas) {
  const maximo = nome === 'fatia' ? (alimento.categoria === 'Frutas e derivados' ? 250 : 100) : PESO_MAXIMO[nome]
  return maximo !== undefined && gramas > maximo ? `peso acima de ${maximo} g` : null
}

export function motivoDaProporcao(nome, gramas, sopa) {
  const faixa = PROPORCAO_DA_SOPA[nome]
  if (!faixa || !sopa) return null
  const razao = gramas / sopa
  return razao < faixa[0] || razao > faixa[1] ? `fora da proporção da colher de sopa (${String(sopa).replace('.', ',')} g)` : null
}

// ---------- Um nome por copo (spec alimentos-e-gramaturas, D-424) ----------
// A POF dá o mesmo peso ao "copo médio" e ao "copo de requeijão" (240 ml): dois nomes para o mesmo copo faziam o
// iogurte natural sair em "meio copo de requeijão" e o desnatado em "meio copo médio" na mesma lista (M20).
const ORDEM_DOS_COPOS = ['copo americano', 'copo de requeijão', 'copo médio', 'copo grande', 'copo tulipa']
const COPO_PADRAO_G = 240

/**
 * Fica um copo por peso, na ordem de `ORDEM_DOS_COPOS`; o "copo médio" de 240 que sobra sozinho vira "copo de requeijão".
 * Devolve as medidas e o que mudou, para a revisão.
 */
export function umNomePorCopo(medidas) {
  const copo = (m) => ORDEM_DOS_COPOS.includes(m.nome)
  const mudancas = []
  const ficam = medidas.filter((m) => {
    if (!copo(m)) return true
    const primeiro = medidas.filter((o) => copo(o) && o.gramas === m.gramas).sort((x, y) => ORDEM_DOS_COPOS.indexOf(x.nome) - ORDEM_DOS_COPOS.indexOf(y.nome))[0]
    if (primeiro.nome === m.nome) return true
    mudancas.push({ medida: m, acao: `tirado: o mesmo copo que o ${primeiro.nome}` })
    return false
  })
  const final = ficam.map((m) => {
    if (m.nome !== 'copo médio' || m.gramas !== COPO_PADRAO_G) return m
    mudancas.push({ medida: m, acao: 'renomeado para copo de requeijão (o mesmo copo de 240 ml)' })
    return { ...m, nome: 'copo de requeijão' }
  })
  return { medidas: final.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR')), mudancas }
}

// ---------- Unidade de outra variedade (spec alimentos-e-gramaturas, D-425) ----------
// Sem peso por variedade na POF, a unidade de uma variedade só vale para outra quando o tamanho é parecido (dentro dos
// 15% da medida automática). As faixas são das tabelas de porção (por unidade, parte comestível).
export const EMPRESTIMOS = [
  {
    alvo: 'Banana, maçã, crua',
    de: 'Banana, prata, crua',
    medidas: ['unidade'],
    motivo: 'banana maçã e banana prata têm de 55 a 85 g por unidade nas tabelas de porção',
  },
]

export const EM_GRAMAS = [
  ['Banana, nanica, crua', 'maior que a prata (86 a 110 g por unidade); a POF só pesa a unidade da prata'],
  ['Banana, ouro, crua', 'cerca de 40 g por unidade, metade da prata'],
  ['Banana, figo, crua', 'banana de cozinhar, sem peso de referência por unidade'],
  ['Manga, Haden, crua', 'a única unidade da POF é a da manga espada (140 g); a Haden pesa mais que o dobro'],
  ['Manga, Palmer, crua', 'a única unidade da POF é a da manga espada (140 g); a Palmer pesa cerca de 3 vezes isso'],
  ['Manga, Tommy Atkins, crua', 'a única unidade da POF é a da manga espada (140 g); a Tommy pesa cerca de 3 vezes isso'],
]

/** "COPO*" casa qualquer medida que começa com "COPO"; o resto exige nome exato. */
function medidaExcluida(medida, excluidas) {
  return excluidas.some((e) => (e.endsWith('*') ? medida.startsWith(e.slice(0, -1)) : medida === e))
}

function lerCsv(caminho, separador = ',') {
  const linhas = readFileSync(caminho, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.startsWith('#'))
  const dividir = separador === ',' ? dividirLinhaCsv : (l) => l.split(separador)
  const cabecalho = dividir(linhas[0])
  return linhas.slice(1).map((l) => {
    const c = dividir(l)
    return Object.fromEntries(cabecalho.map((h, i) => [h, (c[i] ?? '').trim()]))
  })
}

export function converter() {
  const pof = lerCsv(POF)
  const regras = lerCsv(REGRAS, ';').map((r, i) => ({ ...r, linha: i + 2, re: new RegExp(r.padrao_taco) }))
  const { alimentos } = JSON.parse(readFileSync(ALIMENTOS, 'utf8'))

  const porCodigo = new Map()
  for (const r of pof) {
    if (!porCodigo.has(r.codigo_alimento)) porCodigo.set(r.codigo_alimento, [])
    porCodigo.get(r.codigo_alimento).push(r)
  }

  const saida = {}
  const revisao = []
  const regrasUsadas = new Set()
  const semMedidas = []
  const semRegra = []
  const tiradas = []
  const paraConferir = []
  const copos = []
  const peso = (g) => `${String(g).replace('.', ',')} g`
  const celula = (s) => String(s).replace(/\|/g, '/')

  for (const a of alimentos) {
    const regra = regras.find((r) => r.re.test(a.descricao))
    if (!regra) {
      semRegra.push(`${a.id} ${a.descricao}`)
      continue
    }
    regrasUsadas.add(regra.linha)
    if (!regra.codigo_pof) {
      // regra que marca explicitamente "sem mapeamento"
      semMedidas.push(`${a.id} ${a.descricao} (regra sem mapeamento: ${regra.observacao || 'sem código da POF'})`)
      continue
    }
    const registros = porCodigo.get(regra.codigo_pof)
    if (!registros) throw new Error(`Regra da linha ${regra.linha}: código POF ${regra.codigo_pof} não existe`)

    const excluidas = regra.medidas_excluidas ? regra.medidas_excluidas.split('|') : []
    // Medidas cujo peso não muda com o preparo (a unidade do ovo com casca, D-381): a fonte pode ser de outro preparo.
    const preparoLivre = regra.preparo_livre ? regra.preparo_livre.split('|') : []
    const aceitos = PREPAROS[a.preparo ?? ''] ?? PREPAROS['']
    const preparo = aceitos.find((p) => registros.some((r) => r.descricao_preparacao === p))
    if (!preparo) {
      semMedidas.push(`${a.id} ${a.descricao} (sem preparação compatível na POF)`)
      continue
    }
    const vistos = new Set()
    const candidatas = registros
      .filter((r) => r.descricao_preparacao === preparo && !MEDIDAS_DESCARTADAS.test(r.descricao_medida))
      .filter((r) => (vistos.has(r.descricao_medida) ? false : vistos.add(r.descricao_medida)))
      .map((r) => ({ nome: rotuloMedida(r.descricao_medida), gramas: Number(r.quantidade_g), fonte: r.descricao_fonte, pof: r.descricao_medida }))
      .filter((m) => Number.isFinite(m.gramas) && m.gramas > 0)

    // D-430: as regras em ordem; a primeira que tira a medida dá o motivo.
    const tirar = (m, motivo) => tiradas.push(`| ${a.id} | ${a.descricao} | ${m.nome} | ${peso(m.gramas)} | ${motivo} | ${celula(m.fonte)} |`)
    const ficam = candidatas.filter((m) => {
      const motivo =
        (medidaExcluida(m.pof, excluidas) ? 'excluída na regra do mapeamento' : null) ??
        (medidaExcluida(m.pof, preparoLivre) ? null : motivoDoPreparo(a.preparo, m.fonte, a.categoria)) ??
        motivoDaVariedade(a.descricao, m.fonte) ??
        motivoDaProcuracao(m.nome, m.fonte) ??
        motivoDaClasse(a, m.nome) ??
        motivoDoPeso(a, m.nome, m.gramas)
      if (motivo) tirar(m, motivo)
      return motivo === null
    })
    // A proporção das colheres menores é conferida contra a colher de sopa que ficou.
    const sopa = ficam.find((m) => m.nome === 'colher de sopa')?.gramas
    const plausiveis = ficam
      .filter((m) => {
        const motivo = motivoDaProporcao(m.nome, m.gramas, sopa)
        if (motivo) tirar(m, motivo)
        return motivo === null
      })
      .map(({ nome, gramas }) => ({ nome, gramas }))
      .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    // D-424: um nome por copo.
    const { medidas, mudancas } = umNomePorCopo(plausiveis)
    for (const { medida, acao } of mudancas) copos.push(`| ${a.id} | ${a.descricao} | ${medida.nome} | ${peso(medida.gramas)} | ${acao} |`)
    for (const m of medidas) {
      if (m.nome === 'colher de sopa' && m.gramas > 30) paraConferir.push(`| ${a.id} | ${a.descricao} | ${m.nome} | ${peso(m.gramas)} | colher de sopa acima de 30 g |`)
    }

    if (medidas.length === 0) {
      semMedidas.push(`${a.id} ${a.descricao} (preparação ${preparo}: nenhuma medida passou na camada de plausibilidade)`)
      continue
    }
    const nomePof = registros[0].descricao_alimento
    saida[a.id] = { pof: { codigo: regra.codigo_pof, descricao: nomePof, preparacao: preparo }, medidas }
    revisao.push(`| ${a.id} | ${a.descricao} | ${nomePof} (${preparo}) | ${medidas.map((m) => `${m.nome} ${m.gramas} g`).join('; ')} |`)
  }

  // D-425: a unidade de outra variedade, só onde o tamanho é parecido.
  const porDescricao = (descricao) => {
    const achado = alimentos.find((x) => x.descricao === descricao)
    if (!achado) throw new Error(`D-425: "${descricao}" não existe na TACO`)
    return achado
  }
  const emprestadas = []
  for (const e of EMPRESTIMOS) {
    const alvo = porDescricao(e.alvo)
    const de = porDescricao(e.de)
    const daOrigem = saida[de.id]?.medidas ?? []
    const novas = e.medidas.map((nome) => {
      const m = daOrigem.find((x) => x.nome === nome)
      if (!m) throw new Error(`D-425: "${e.de}" não tem "${nome}"`)
      return m
    })
    const registro = saida[alvo.id]
    if (!registro) throw new Error(`D-425: "${e.alvo}" não tem medidas da POF`)
    registro.medidas = [...registro.medidas.filter((m) => !e.medidas.includes(m.nome)), ...novas].sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    for (const m of novas) emprestadas.push(`| ${alvo.id} | ${alvo.descricao} | ${m.nome} | ${peso(m.gramas)} | ${de.descricao} | ${e.motivo} |`)
    const linha = revisao.findIndex((l) => l.startsWith(`| ${alvo.id} | `))
    if (linha >= 0) revisao[linha] = revisao[linha].replace(/\| [^|]* \|$/, `| ${registro.medidas.map((m) => `${m.nome} ${m.gramas} g`).join('; ')} |`)
  }
  const emGramas = EM_GRAMAS.map(([descricao, motivo]) => {
    const a = porDescricao(descricao)
    if (saida[a.id]?.medidas.some((m) => m.nome === 'unidade')) throw new Error(`D-425: "${descricao}" ganhou unidade`)
    return `| ${a.id} | ${a.descricao} | ${motivo} |`
  })

  const naoUsadas = regras.filter((r) => !regrasUsadas.has(r.linha)).map((r) => `linha ${r.linha}: ${r.padrao_taco}`)

  return {
    json: {
      fonte: {
        nome: 'Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil (POF 2008-2009)',
        autor: 'IBGE',
        normalizacao: 'https://github.com/brolesi/taco',
        mapeamento: 'dados-brutos/pof/regras-mapeamento-taco-pof.csv (revisado à mão)',
        baixadoEm: '2026-09-15',
      },
      alimentos: saida,
    },
    revisao: [
      '# Revisão das medidas caseiras (TACO ↔ POF)',
      '',
      `Gerado por scripts/dados/importar-medidas-pof.mjs. ${revisao.length} alimentos da TACO com medidas caseiras; ${tiradas.length} medidas da POF tiradas pela camada de plausibilidade.`,
      'Confira se o alimento da POF corresponde ao da TACO e se as medidas fazem sentido para a forma de preparo.',
      '',
      '| TACO | Descrição TACO | Alimento POF (preparação) | Medidas |',
      '|---|---|---|---|',
      ...revisao,
      '',
      '## Alimentos cobertos por regra, mas sem medidas',
      '',
      ...(semMedidas.length ? semMedidas.map((s) => `- ${s}`) : ['- nenhum']),
      '',
      '## Alimentos da base sem regra de mapeamento (ficam em gramas)',
      '',
      ...(semRegra.length ? semRegra.map((s) => `- ${s}`) : ['- nenhum']),
      '',
      '## Medidas tiradas pela camada de plausibilidade',
      '',
      'Spec alimentos-e-gramaturas, D-430: outro preparo, outra variedade, outro utensílio na fonte, tipo que o grupo não',
      'usa, peso acima do razoável ou fora da proporção da colher de sopa. A fonte é a da POF (`descricao_fonte`).',
      '',
      '| TACO | Descrição TACO | Medida | Peso | Motivo | Fonte da POF |',
      '|---|---|---|---|---|---|',
      ...tiradas,
      '',
      '## Um nome por copo',
      '',
      'Spec alimentos-e-gramaturas, D-424: a POF dá o mesmo peso a "copo médio" e "copo de requeijão" (240 ml). Fica um',
      'copo por peso (copo americano, copo de requeijão, copo médio, copo grande, copo tulipa), e o "copo médio" de 240 que',
      'sobra sozinho passa a se chamar "copo de requeijão". O item gravado com o nome antigo continua com ele.',
      '',
      '| TACO | Descrição TACO | Medida | Peso | O que mudou |',
      '|---|---|---|---|---|',
      ...copos,
      '',
      '## Unidade emprestada de outra variedade',
      '',
      'Spec alimentos-e-gramaturas, D-425: sem peso por variedade na POF, a unidade de uma variedade só vale para outra',
      'quando o tamanho é parecido (dentro dos 15% da medida automática).',
      '',
      '| TACO | Descrição TACO | Medida | Peso | Emprestada de | Por quê |',
      '|---|---|---|---|---|---|',
      ...emprestadas,
      '',
      '## Variedades que ficam em gramas',
      '',
      'Spec alimentos-e-gramaturas, D-425: tamanho diferente do da variedade que a POF pesa, ou sem peso de referência. O',
      'paciente lê o peso até a nutricionista criar a medida dela ("+ Nova medida", D-387).',
      '',
      '| TACO | Descrição TACO | Por quê |',
      '|---|---|---|',
      ...emGramas,
      '',
      '## Medidas que ficam e pedem um olho',
      '',
      '| TACO | Descrição TACO | Medida | Peso | Por quê |',
      '|---|---|---|---|---|',
      ...paraConferir,
      '',
      '## Regras que não encontraram alimento na TACO',
      '',
      ...(naoUsadas.length ? naoUsadas.map((s) => `- ${s}`) : ['- nenhuma']),
      '',
    ].join('\n'),
    naoUsadas,
  }
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (executadoDiretamente) {
  const { json, revisao, naoUsadas } = converter()
  writeFileSync(DESTINO, JSON.stringify(json) + '\n', 'utf8')
  writeFileSync(REVISAO, revisao, 'utf8')
  console.log(`${Object.keys(json.alimentos).length} alimentos com medidas caseiras gravados em ${DESTINO}`)
  if (naoUsadas.length) console.log(`Regras sem alimento na TACO:\n  ${naoUsadas.join('\n  ')}`)
}
