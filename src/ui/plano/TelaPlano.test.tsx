import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import type { Plano } from '@/domain/tipos.ts'
import { TelaPlano } from './TelaPlano.tsx'

let n = 0
const ids = () => `id${++n}`

function Anfitriao({ inicial }: { readonly inicial?: Plano }) {
  const [plano, setPlano] = useState<Plano>(inicial ?? criarPlanoPadrao(ids))
  return <TelaPlano plano={plano} aoAlterarPlano={setPlano} gerarId={ids} />
}

const montar = (inicial?: Plano) => {
  render(<Anfitriao {...(inicial ? { inicial } : {})} />)
  return userEvent.setup()
}

const entradaDoAlmoco = () => screen.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
const opcoesVisiveis = () => screen.queryAllByRole('option')
const almoco = () => within(screen.getByRole('tabpanel', { name: 'Principal de Almoço' }))

describe('Etapa 2: plano alimentar', () => {
  it('CA-12: começa com as seis refeições padrão, com horário', () => {
    montar()
    for (const nome of ['Desjejum', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia']) {
      expect(screen.getByRole('textbox', { name: `Nome da refeição ${nome}` })).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Horário de Almoço')).toHaveValue('12:00')
  })

  it('CA-13: renomear, mudar horário, adicionar e remover refeição', async () => {
    const usuario = montar()
    const nome = screen.getByRole('textbox', { name: 'Nome da refeição Ceia' })
    await usuario.clear(nome)
    await usuario.type(nome, 'Lanche da noite')
    expect(screen.getByRole('textbox', { name: 'Nome da refeição Lanche da noite' })).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText('Horário de Almoço'))
    await usuario.type(screen.getByLabelText('Horário de Almoço'), '13:30')
    expect(screen.getByLabelText('Horário de Almoço')).toHaveValue('13:30')

    await usuario.click(screen.getByRole('button', { name: 'Adicionar refeição' }))
    expect(screen.getByRole('textbox', { name: 'Nome da refeição Nova refeição' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Remover refeição Nova refeição' }))
    expect(screen.queryByRole('textbox', { name: 'Nome da refeição Nova refeição' })).not.toBeInTheDocument()
  })

  it('CA-14: cada refeição tem Principal, Substituto 1 e Substituto 2', async () => {
    const usuario = montar()
    const abas = within(screen.getByRole('tablist', { name: 'Opções de Almoço' }))
    expect(abas.getByRole('tab', { name: 'Principal' })).toHaveAttribute('aria-selected', 'true')
    await usuario.click(abas.getByRole('tab', { name: 'Substituto 1' }))
    expect(screen.getByRole('combobox', { name: 'Adicionar alimento em Substituto 1 de Almoço' })).toBeInTheDocument()
  })

  it('CA-15 e CA-16: busca por partes do nome e Enter adiciona o primeiro resultado', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), '150 arroz int')
    expect(opcoesVisiveis().length).toBeGreaterThan(0)
    expect(opcoesVisiveis().length).toBeLessThanOrEqual(5)

    await usuario.keyboard('{Enter}')
    const lista = within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço' }))
    expect(lista.getAllByText(/Arroz, integral/).length).toBeGreaterThan(0)
    expect(lista.getByLabelText(/^Gramas de Arroz, integral/)).toHaveValue('150')
    expect(entradaDoAlmoco()).toHaveValue('')
  })

  it('CA-16: as setas mudam a escolha antes do Enter', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'arroz')
    const segundo = opcoesVisiveis()[1]?.textContent ?? ''
    await usuario.keyboard('{ArrowDown}{Enter}')
    const lista = within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço' }))
    expect(lista.getAllByRole('listitem')).toHaveLength(1)
    expect(segundo).toContain(lista.getAllByRole('listitem')[0]?.textContent?.split('\n')[0]?.slice(0, 10) ?? '')
  })

  it('CA-17: sem quantidade, entra com 100 g editáveis', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'banana prata{Enter}')
    const campo = screen.getByLabelText(/^Gramas de Banana/)
    expect(campo).toHaveValue('100')
    await usuario.clear(campo)
    await usuario.type(campo, '75')
    expect(screen.getByLabelText(/^Gramas de Banana/)).toHaveValue('75')
  })

  it('CA-18 e CA-19: medida caseira vira gramas e a linha mostra a equivalência e as kcal', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), '2 colher de sopa arroz, tipo 1, cozido{Enter}')
    const lista = within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço' }))
    expect(lista.getByText(/colher de sopa|colheres de sopa/)).toBeInTheDocument()
    expect(lista.getByText(/kcal$/)).toBeInTheDocument()
  })

  it('CA-20: texto sem correspondência avisa e não adiciona nada', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'xyzabc{Enter}')
    expect(screen.getByText(/Nenhum alimento encontrado/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Alimentos em Principal de Almoço' })).not.toBeInTheDocument()
  })

  it('CB-04: gramas negativas são ignoradas e zero é aceito', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'banana prata{Enter}')
    const campo = screen.getByLabelText(/^Gramas de Banana/)
    await usuario.clear(campo)
    await usuario.type(campo, '0')
    expect(almoco().getAllByText('0 kcal').length).toBe(2)

    await usuario.clear(campo)
    await usuario.type(campo, '-5')
    expect(almoco().getAllByText('0 kcal').length).toBe(2)
  })

  it('CA-19: remover um alimento tira a linha', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'banana prata{Enter}')
    await usuario.click(screen.getByRole('button', { name: /^Remover Banana/ }))
    expect(almoco().getByText('Nenhum alimento nesta opção.')).toBeInTheDocument()
  })
})
