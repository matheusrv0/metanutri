import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Plano } from '@/domain/tipos.ts'
import { TelaPlano } from './TelaPlano.tsx'

let n = 0
const ids = () => `id${++n}`

function Anfitriao({ aoMudar }: { readonly aoMudar?: (p: Plano) => void }) {
  const [plano, setPlano] = useState<Plano>(() => criarPlanoPadrao(ids))
  return (
    <TelaPlano
      plano={plano}
      gerarId={ids}
      aoAlterarPlano={(p) => {
        setPlano(p)
        aoMudar?.(p)
      }}
    />
  )
}

const entradaDoAlmoco = () => screen.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })

describe('Substitutos', () => {
  it('CA-41 e CA-42: calcula porção equivalente por energia, com medida caseira e diferenças', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await usuario.type(entradaDoAlmoco(), '100 arroz tipo 1 cozido{Enter}')
    await usuario.click(screen.getByRole('button', { name: /^Substituir Arroz/ }))

    const janela = within(screen.getByRole('dialog', { name: 'Substituto equivalente' }))
    expect(janela.getByRole('radio', { name: 'Energia (kcal)' })).toHaveAttribute('aria-checked', 'true')

    await usuario.type(janela.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata inglesa cozida{Enter}')
    expect(janela.getByText(/^\d+ g/)).toBeInTheDocument()
    expect(janela.getAllByRole('term').map((d) => d.textContent)).toEqual(['Energia', 'Proteína', 'Carboidrato', 'Gordura'])
    expect(janela.getAllByRole('definition')).toHaveLength(4)
    expect(janela.getByText(/Diferença em relação ao alimento original/)).toBeInTheDocument()
  })

  it('CA-41: trocar o critério para proteína muda a porção', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await usuario.type(entradaDoAlmoco(), '100 arroz tipo 1 cozido{Enter}')
    await usuario.click(screen.getByRole('button', { name: /^Substituir Arroz/ }))
    const janela = within(screen.getByRole('dialog', { name: 'Substituto equivalente' }))
    await usuario.type(janela.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata inglesa cozida{Enter}')
    const porEnergia = janela.getByText(/^\d+ g/).textContent

    await usuario.click(janela.getByRole('radio', { name: 'Proteína' }))
    expect(janela.getByText(/^\d+ g/).textContent).not.toBe(porEnergia)
  })

  it('CA-43: o substituto adicionado não entra na soma do dia', async () => {
    let ultimo: Plano | null = null
    render(<Anfitriao aoMudar={(p) => (ultimo = p)} />)
    const usuario = userEvent.setup()
    await usuario.type(entradaDoAlmoco(), '100 arroz tipo 1 cozido{Enter}')
    const kcalSo = ultimo ? totaisDoPlano(ultimo, buscarAlimento).nutrientes.energia_kcal.total : 0

    await usuario.click(screen.getByRole('button', { name: /^Substituir Arroz/ }))
    const janela = within(screen.getByRole('dialog', { name: 'Substituto equivalente' }))
    await usuario.type(janela.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata inglesa cozida{Enter}')
    await usuario.click(janela.getByRole('button', { name: 'Pôr em Substituto 1' }))

    expect(screen.queryByRole('dialog', { name: 'Substituto equivalente' })).not.toBeInTheDocument()
    const abas = within(screen.getByRole('tablist', { name: 'Opções de Almoço' }))
    expect(abas.getByRole('tab', { name: 'Substituto 1 (1)' })).toBeInTheDocument()
    expect(ultimo ? totaisDoPlano(ultimo, buscarAlimento).nutrientes.energia_kcal.total : -1).toBe(kcalSo)

    await usuario.click(abas.getByRole('tab', { name: 'Substituto 1 (1)' }))
    expect(screen.getByText('Os substitutos não entram na soma do dia nem na adequação.')).toBeInTheDocument()
  })
})
