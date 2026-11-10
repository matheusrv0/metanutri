import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { casoDaGestante, planoDeAdulto, restricoesDoCaso } from '@/domain/ia.test-utils.ts'
import { IDS_DO_CATALOGO_IA } from '../../../supabase/functions/_shared/iaCatalogo.ts'
import { conferirMudancas, efeitoDasMudancas } from '@/domain/iaMudancas.ts'
import { textosDoVaiPara } from '@/domain/iaGaveta.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { MudancaSugerida } from '../../../supabase/functions/_shared/iaContrato.ts'
import { MudancasDaIa } from './MudancasDaIa.tsx'

const plano = planoDeAdulto()
const caso = casoDaGestante()
const ctx = {
  buscar: buscarAlimento,
  caso,
  restricoes: restricoesDoCaso(caso),
  metaKcal: 2100,
  gastoCalculado: 2100,
  refeicoes: plano.refeicoes.map((r) => ({ nome: r.nome, horario: r.horario })),
  idsDoCatalogo: new Set(IDS_DO_CATALOGO_IA),
  idsProprios: new Set<number>(),
}
const m = (x: Partial<MudancaSugerida>): MudancaSugerida => ({ tipo: 'gramas', refeicao: 0, opcao: 'principal', item: 0, alimentoId: null, gramas: null, motivo: '', ...x })
const SUGERIDAS = [
  m({ tipo: 'gramas', refeicao: 0, item: 0, gramas: 25, motivo: '−75 kcal no café' }),
  m({ tipo: 'trocar', refeicao: 1, item: 0, alimentoId: 1, gramas: 150, motivo: '+ fibra e magnésio' }),
  // Leite: a gestante tem alergia a leite (ia.test-utils).
  m({ tipo: 'adicionar', refeicao: 2, item: null, alimentoId: 458, gramas: 200, motivo: '+ cálcio' }),
]
const conferidas = conferirMudancas(SUGERIDAS, plano, ctx)

function Mudancas() {
  const [recusadas, setRecusadas] = useState<ReadonlySet<number>>(new Set())
  const aceitas = new Set(conferidas.map((_, i) => i).filter((i) => !recusadas.has(i)))
  const efeito = efeitoDasMudancas(plano, conferidas, aceitas, ctx, ['Cálcio'])
  return (
    <MudancasDaIa
      plano={plano}
      mudancas={conferidas}
      recusadas={recusadas}
      aoDecidir={(i, aceita) => setRecusadas((r) => (aceita ? new Set([...r].filter((x) => x !== i)) : new Set([...r, i])))}
      efeito={efeito}
      nutrientes={['Cálcio']}
    />
  )
}

describe('MudancasDaIa (spec assistente-ia, D-1309)', () => {
  it('CA-2371: cada mudança com Aceitar | Recusar, todas aceitas de início; a barrada fica travada com o motivo', () => {
    render(<Mudancas />)
    const lista = screen.getByRole('list', { name: 'Mudanças' })
    const itens = within(lista).getAllByRole('listitem')
    expect(itens).toHaveLength(3)
    expect(itens[0]).toHaveTextContent('Café da manhã')
    expect(itens[0]).toHaveTextContent('50 g → 25 g')
    expect(itens[0]).toHaveTextContent('−75 kcal no café')
    expect(within(itens[0] as HTMLElement).getByRole('button', { name: 'Aceitar' })).toHaveAttribute('aria-pressed', 'true')
    expect(itens[2]).toHaveTextContent('Barrada')
    expect(itens[2]).toHaveTextContent('Alergia: leite e derivados')
    expect(itens[2]).not.toHaveTextContent('Barrada pela ficha')
    expect(within(itens[2] as HTMLElement).queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument()
    expect(screen.getByText('2 de 2 aceitas')).toBeInTheDocument()
  })

  it('CA-2371 e CA-2353: o efeito no plano muda a cada escolha', async () => {
    render(<Mudancas />)
    const tabela = screen.getByRole('table', { name: 'Efeito no plano' })
    const energiaAntes = within(tabela).getByRole('row', { name: /^Energia/ }).textContent
    await userEvent.setup().click(within(screen.getAllByRole('listitem')[0] as HTMLElement).getByRole('button', { name: 'Recusar' }))
    expect(within(tabela).getByRole('row', { name: /^Energia/ }).textContent).not.toBe(energiaAntes)
    expect(within(tabela).getByRole('row', { name: /Abaixo da meta no Cobrir/ })).toBeInTheDocument()
    expect(within(tabela).getByRole('row', { name: /Cálcio/ })).toBeInTheDocument()
    expect(screen.getByText('1 de 2 aceitas')).toBeInTheDocument()
  })

  it('CA-2371: o item do plano mostra "Vai para …" (só as aceitas e não barradas)', () => {
    const textos = textosDoVaiPara(conferidas, new Set(), buscarAlimento)
    expect(textos.get('0:principal:0')).toBe('Vai para 25 g')
    expect(textos.get('1:principal:0')).toMatch(/^Vai para Arroz integral cozido, 150 g$/)
    expect(textos.size).toBe(2)
    expect(textosDoVaiPara(conferidas, new Set([0]), buscarAlimento).has('0:principal:0')).toBe(false)
  })
})
