// Spec receitas-com-calculo, D-279: a receita no Word de aconselhamento (CA-886, CA-887).
import JSZip from 'jszip'
import { avaliarAntropometria } from '../domain/antropometria.ts'
import { criarCasoVazio } from '../domain/caso.ts'
import { adicionarReceita, criarPlanoPadrao } from '../domain/plano.ts'
import { itemDeReceita, PANQUECA } from '../domain/receitas.test-utils.ts'
import { buscarAlimento } from '../domain/tabelas.ts'
import type { Caso, Plano } from '../domain/tipos.ts'
import { criarAconselhamento, descreverItem, type DadosAconselhamento } from './aconselhamento-docx.ts'
import { gerarBytes } from './docx-comum.ts'

async function textoDoDocx(dados: DadosAconselhamento): Promise<string> {
  const zip = await JSZip.loadAsync(await gerarBytes(criarAconselhamento(dados)))
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? ''
  return xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

let n = 0
const ids = () => `id${++n}`

// Em "Só medida", o modo dos planos de antes (spec alimentos-e-gramaturas, D-376).
const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Paciente Exemplo', sexo: 'F', idadeAnos: 30, quantidades: 'medida-caseira' }

function planoComPanqueca(): Plano {
  const plano = criarPlanoPadrao(ids)
  const desjejum = plano.refeicoes[0]
  if (!desjejum) throw new Error('plano padrão mudou')
  return adicionarReceita(plano, desjejum.id, 'principal', { receita: PANQUECA, gramas: 120 }, ids)
}

const dados = (plano: Plano, extra: Partial<DadosAconselhamento> = {}): DadosAconselhamento => ({
  caso,
  plano,
  antropometria: avaliarAntropometria(caso),
  buscar: buscarAlimento,
  orientacoes: 'Beber água.',
  receitas: 'Suco verde: couve e limão.',
  ...extra,
})

const RECEITA = [
  'Panqueca de banana · Rende 2 unidades (120 g cada)',
  'Ingredientes: Banana, prata, crua (2 unidades); Ovo, de galinha, inteiro, cru (2 unidades); Aveia, flocos, crua (2 colheres de sopa)',
  'Modo de preparo:',
  'Amasse a banana, misture o ovo e a aveia.',
  'Doure dos dois lados.',
]

describe('a receita no Word', () => {
  it('CA-886: a refeição diz o nome da receita com a porção; uma quantidade só (spec conduta-da-nutricionista, D-297): em "Gramas" ou sem meia porção que feche, o peso', () => {
    expect(descreverItem(itemDeReceita('a', 120), buscarAlimento)).toBe('Panqueca de banana (1 unidade)')
    expect(descreverItem(itemDeReceita('a', 120), buscarAlimento, 'gramas')).toBe('Panqueca de banana (120 g)')
    expect(descreverItem(itemDeReceita('a', 150), buscarAlimento)).toBe('Panqueca de banana (150 g)')
  })

  it('CA-887: estudante: a receita inteira dentro de RECEITAS SAUDÁVEIS, antes do texto livre', async () => {
    const texto = await textoDoDocx(dados(planoComPanqueca()))
    expect(texto).toContain('Panqueca de banana (1 unidade)')
    const ordem = ['RECEITAS SAUDÁVEIS', ...RECEITA, 'Suco verde: couve e limão.'].map((t) => texto.indexOf(t))
    expect(ordem.every((posicao) => posicao >= 0)).toBe(true)
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
  })

  it('CA-887: nutricionista: a seção RECEITAS só com as receitas do plano; o texto livre continua fora (CA-235)', async () => {
    const texto = await textoDoDocx(dados(planoComPanqueca(), { comReceitas: false, nutricionista: 'Ana Souza · CRN-6 12345' }))
    expect(texto).not.toContain('RECEITAS SAUDÁVEIS')
    expect(texto).toMatch(/\nRECEITAS\n/)
    for (const linha of RECEITA) expect(texto).toContain(linha)
    expect(texto).not.toContain('Suco verde')
  })

  it('CA-887: sem receita no plano, o Word sai como hoje', async () => {
    const semReceita = await textoDoDocx(dados(criarPlanoPadrao(ids), { comReceitas: false, nutricionista: '' }))
    expect(semReceita).not.toMatch(/RECEITAS/)
    const estagio = await textoDoDocx(dados(criarPlanoPadrao(ids)))
    expect(estagio).toContain('RECEITAS SAUDÁVEIS\nSuco verde: couve e limão.')
  })
})
