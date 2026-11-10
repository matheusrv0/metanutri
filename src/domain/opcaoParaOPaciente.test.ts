// Spec busca-substitutos, D-1115: a opção do item na folha, no link, no Word e no aviso da janela de imprimir.
import { descreverItem } from '../export/aconselhamento-docx.ts'
import { criarCasoVazio } from './caso.ts'
import { copiarDieta, dietaDoPlano, dietaMudou, lerDieta, type ItemDaDieta } from './dietaDoLink.ts'
import { opcoesNaFolha } from './folhaDieta.ts'
import { adicionarItem, adicionarOpcaoAoItem, criarPlanoPadrao } from './plano.ts'
import { textoDaQuantidade } from './quantidadeNaFolha.ts'
import { avisosParaImprimir, montarRestricoes } from './restricoes.ts'
import { buscarAlimento } from './tabelas.ts'
import type { Caso, ItemPlano, Plano } from './tipos.ts'

let n = 0
const ids = () => `id${++n}`

const caso: Caso = { ...criarCasoVazio('c1'), quantidades: 'medida-e-gramas' }
const BATATA = { alimentoId: 91, gramas: 350, medida: { nome: 'unidade', quantidade: 2.5, gramasPorMedida: 140 } }

function planoDoAlmoco(opcoes: readonly { alimentoId: number; gramas: number; medida: { nome: string; quantidade: number; gramasPorMedida: number } | null }[] = []): {
  plano: Plano
  arroz: ItemPlano
} {
  let plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')
  if (!almoco) throw new Error('sem almoço')
  plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 150, medida: { nome: 'colher de sopa', quantidade: 6, gramasPorMedida: 25 } }, ids)
  const id = plano.refeicoes.find((r) => r.id === almoco.id)?.opcoes.principal[0]?.id ?? ''
  for (const o of opcoes) plano = adicionarOpcaoAoItem(plano, almoco.id, id, o)
  const arroz = plano.refeicoes.find((r) => r.id === almoco.id)?.opcoes.principal[0]
  if (!arroz) throw new Error('sem arroz')
  return { plano, arroz }
}

const itemDoAlmoco = (dieta: { readonly refeicoes: readonly { readonly nome: string; readonly opcoes: readonly (readonly ItemDaDieta[])[] }[] }): ItemDaDieta | undefined =>
  dieta.refeicoes.find((r) => r.nome === 'Almoço')?.opcoes[0]?.[0]

describe('D-1115: a opção na folha', () => {
  it('CA-2122: a linha da opção, com o nome para o paciente e a quantidade na escolha do plano', () => {
    const { arroz } = planoDoAlmoco([BATATA])
    const linhas = opcoesNaFolha(arroz, buscarAlimento, 'medida-e-gramas')
    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.nome).toMatch(/^Batata/)
    expect(linhas[0] && textoDaQuantidade(linhas[0].quantidade)).toBe('2 unidades e meia (350 g)')
    expect(opcoesNaFolha(arroz, buscarAlimento, 'gramas').map((l) => textoDaQuantidade(l.quantidade))).toEqual(['350 g'])
  })

  it('CB-1102 e CB-1103: a opção excluída some; o item sem opção não tem linha', () => {
    const { arroz } = planoDoAlmoco([{ alimentoId: 99_999, gramas: 100, medida: null }])
    expect(opcoesNaFolha(arroz, buscarAlimento)).toEqual([])
    expect(opcoesNaFolha(planoDoAlmoco().arroz, buscarAlimento)).toEqual([])
  })
})

describe('D-1115: a opção no link', () => {
  it('CA-2123: a cópia leva "ou" no item, na escolha do plano', () => {
    const { plano } = planoDoAlmoco([BATATA])
    const item = itemDoAlmoco(dietaDoPlano(caso, plano))
    expect(item?.ou).toEqual([{ medida: '2 unidades e meia', gramas: 350, alimento: 'Batata, inglesa, cozida', escolhida: true }])
  })

  it('CA-2123: sem opção, a cópia é igual à de antes; com opção, o link aparece como mudado', () => {
    const sem = planoDoAlmoco().plano
    const item = itemDoAlmoco(dietaDoPlano(caso, sem))
    expect(item && 'ou' in item).toBe(false)
    const noLink = copiarDieta(dietaDoPlano(caso, sem), '2026-11-03')
    expect(dietaMudou(noLink, dietaDoPlano(caso, sem))).toBe(false)
    expect(dietaMudou(noLink, dietaDoPlano(caso, planoDoAlmoco([BATATA]).plano))).toBe(true)
  })

  it('CA-2123 e CB-1101: a leitura do link guarda o "ou" e ignora o estragado', () => {
    const copia = copiarDieta(dietaDoPlano(caso, planoDoAlmoco([BATATA]).plano), '2026-11-03')
    const lida = lerDieta(JSON.parse(JSON.stringify(copia)))
    expect(lida && itemDoAlmoco(lida)?.ou).toEqual([{ medida: '2 unidades e meia', gramas: 350, alimento: 'Batata, inglesa, cozida', escolhida: true }])

    const estragada = JSON.parse(JSON.stringify(copia)) as { refeicoes: { opcoes: unknown[][] }[] }
    const almoco = estragada.refeicoes.find((r) => (r as unknown as { nome: string }).nome === 'Almoço')
    const primeiro = almoco?.opcoes[0]?.[0] as Record<string, unknown>
    primeiro['ou'] = [null, { alimento: 3 }, { medida: null, gramas: 10, alimento: 'A' }, { medida: null, gramas: 20, alimento: 'B' }, { medida: null, gramas: 30, alimento: 'C' }]
    const relida = lerDieta(estragada)
    expect(relida && itemDoAlmoco(relida)?.ou?.map((i) => i.alimento)).toEqual(['A', 'B'])
    primeiro['ou'] = 'lixo'
    const semOu = lerDieta(estragada)
    expect(semOu && itemDoAlmoco(semOu) && 'ou' in (itemDoAlmoco(semOu) as object)).toBe(false)
  })

  it('CB-1102: a opção cujo alimento foi excluído não vai para o link', () => {
    const item = itemDoAlmoco(dietaDoPlano(caso, planoDoAlmoco([{ alimentoId: 99_999, gramas: 100, medida: null }]).plano))
    expect(item && 'ou' in item).toBe(false)
  })
})

describe('D-1115: a opção no Word', () => {
  it('CA-2124: "{item} ou {opção}"', () => {
    const { arroz } = planoDoAlmoco([BATATA])
    expect(descreverItem(arroz, buscarAlimento, 'medida-e-gramas')).toBe('Arroz, tipo 1, cozido (6 colheres de sopa · 150 g) ou Batata, inglesa, cozida (2 unidades e meia · 350 g)')
    expect(descreverItem(planoDoAlmoco([{ alimentoId: 99_999, gramas: 100, medida: null }]).arroz, buscarAlimento, 'medida-e-gramas')).toBe(
      'Arroz, tipo 1, cozido (6 colheres de sopa · 150 g)',
    )
  })
})

describe('D-1107 e D-1115: o aviso da janela de imprimir', () => {
  it('CA-2125: a opção que bate com a restrição da ficha avisa', () => {
    const alergiaALeite = montarRestricoes({ marcadas: ['leite'], texto: '', doencas: [], naoGosta: '' })
    const { plano } = planoDoAlmoco([{ alimentoId: 461, gramas: 30, medida: null }])
    const avisos = avisosParaImprimir(plano, buscarAlimento, alergiaALeite)
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatch(/^Este plano tem Queijo.*, e a ficha diz Alergia: leite e derivados\. Confira antes de imprimir\.$/)
  })
})
