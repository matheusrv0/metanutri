// A moldura da tela "Avaliação antropométrica" (spec antropometria-telas, D-1400 a D-1405).
import { screen, within } from '@testing-library/react'
import type { Rota } from '../navegacao.ts'
import { AGORA, montarComDados, moldura, planoDe, RENATA } from './apoioDosTestes.test-utils.tsx'
import { TelaAntropometria, type RotaDaAntropometria } from './TelaAntropometria.tsx'

const AVALIACOES = [
  planoDe('mai', { pacienteId: 'renata', dataConsulta: '2026-05-12' }),
  planoDe('set', { pacienteId: 'renata', dataConsulta: '2026-09-08' }),
  planoDe('nov', { pacienteId: 'renata', dataConsulta: '2026-11-03' }),
  planoDe('rapido', { pacienteId: 'renata', dataConsulta: '2026-10-01', modo: 'rapido' }),
]

function abrir(rota: RotaDaAntropometria, cenario: Parameters<typeof montarComDados>[0] = { pacientes: [RENATA], planos: AVALIACOES }) {
  const navegar = vi.fn<(rota: Rota) => void>()
  const aoNovaAvaliacao = vi.fn<(pacienteId: string) => void>()
  const montado = montarComDados(cenario, () => <TelaAntropometria rota={rota} navegar={navegar} moldura={moldura} aoNovaAvaliacao={aoNovaAvaliacao} agora={AGORA} />)
  return { ...montado, navegar, aoNovaAvaliacao }
}

describe('a tela da antropometria (spec antropometria-telas, CA-2400 a CA-2409 e CA-2469)', () => {
  it('CA-2400: o endereço do plano abre a vista Avaliação; o do histórico, a vista Histórico', () => {
    abrir({ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' })
    expect(screen.getByRole('radio', { name: 'Avaliação' })).toHaveAttribute('aria-checked', 'true')
  })

  it('CA-2400: a vista Histórico vem marcada pelo endereço e traz "Nova avaliação"', () => {
    abrir({ tela: 'antropometria', casoId: 'nov', vista: 'historico' })
    expect(screen.getByRole('radio', { name: 'Histórico' })).toHaveAttribute('aria-checked', 'true')
    expect(within(screen.getByTestId('acoes')).getByRole('button', { name: 'Nova avaliação' })).toBeInTheDocument()
  })

  it('CA-2401: a aba da ficha abre a avaliação mais recente, e a lista tem só as completas, da mais nova à mais velha', () => {
    abrir({ tela: 'antropometria-do-paciente', pacienteId: 'renata' })
    const lista = screen.getByRole('combobox', { name: 'Avaliação' })
    expect(lista).toHaveDisplayValue('Avaliação de 03/11/2026')
    expect(within(lista).getAllByRole('option').map((o) => o.textContent)).toEqual(['Avaliação de 03/11/2026', 'Avaliação de 08/09/2026', 'Avaliação de 12/05/2026'])
  })

  it('CB-1489 (D-1529): duas avaliações no mesmo dia aparecem diferentes na lista', () => {
    const planos = [...AVALIACOES, planoDe('nov2', { pacienteId: 'renata', dataConsulta: '2026-11-03' })]
    abrir({ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' }, { pacientes: [RENATA], planos })
    const opcoes = within(screen.getByRole('combobox', { name: 'Avaliação' }))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect([...opcoes].sort()).toEqual(['Avaliação de 03/11/2026 · 1ª do dia', 'Avaliação de 03/11/2026 · 2ª do dia', 'Avaliação de 08/09/2026', 'Avaliação de 12/05/2026'])
  })

  it('CA-2402: sem avaliação, o vazio com "Nova avaliação"', async () => {
    const { usuario, aoNovaAvaliacao } = abrir({ tela: 'antropometria-do-paciente', pacienteId: 'renata' }, { pacientes: [RENATA], planos: [] })
    expect(screen.getByText('Nenhuma avaliação ainda.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Nova avaliação' }))
    expect(aoNovaAvaliacao).toHaveBeenCalledWith('renata')
  })

  it('CA-2404: as abas da ficha, com "Antropometria" marcada; "Ficha" volta à ficha', async () => {
    const { usuario, navegar } = abrir({ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' })
    const abas = within(screen.getByRole('navigation', { name: 'Ficha do paciente' }))
    expect(abas.getByRole('button', { name: 'Antropometria' })).toHaveAttribute('aria-current', 'page')
    await usuario.click(abas.getByRole('button', { name: 'Ficha' }))
    expect(navegar).toHaveBeenCalledWith({ tela: 'paciente', pacienteId: 'renata' })
  })

  it('CA-2405: plano sem paciente abre sem abas, sem lista de avaliações e sem Histórico; a trilha leva a Planos', () => {
    abrir({ tela: 'antropometria', casoId: 'estudo', vista: 'avaliacao' }, { planos: [planoDe('estudo', { nome: 'Caso de estudo 3', dataConsulta: '2026-11-03' })] })
    expect(screen.getByRole('heading', { level: 1, name: 'Caso de estudo 3' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Ficha do paciente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Avaliação' })).not.toBeInTheDocument()
    expect(screen.getByText('Avaliação de 03/11/2026')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Histórico' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Você está em' })).getByRole('button', { name: 'Planos' })).toBeInTheDocument()
  })

  it('CA-2407: o título é o nome da paciente e a linha diz o sexo, a idade e o objetivo da ficha; não há "Salvar"', () => {
    abrir({ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' })
    expect(screen.getByRole('heading', { level: 1, name: 'Renata Oliveira Campos' })).toBeInTheDocument()
    expect(screen.getByText('Feminino · 34 anos · objetivo: perder gordura')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  })

  it('CA-2407: sem objetivo na ficha, a linha acaba na idade', () => {
    abrir({ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' }, { pacientes: [{ ...RENATA, objetivo: '  ' }], planos: AVALIACOES })
    expect(screen.getByText('Feminino · 34 anos')).toBeInTheDocument()
  })

  it('CA-2408: o plano que não existe mais diz isso e volta para Pacientes', async () => {
    const { usuario, navegar } = abrir({ tela: 'antropometria', casoId: 'sumiu', vista: 'avaliacao' })
    expect(screen.getByText('Esta avaliação não existe mais. Ela pode ter sido excluída em outra aba ou em outro aparelho.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Voltar para Pacientes' }))
    expect(navegar).toHaveBeenCalledWith({ tela: 'pacientes' })
  })

  it('CA-2409: escolher outra data leva ao plano dela, na mesma vista', async () => {
    const { usuario, navegar } = abrir({ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' })
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Avaliação' }), 'set')
    expect(navegar).toHaveBeenCalledWith({ tela: 'antropometria', casoId: 'set', vista: 'avaliacao' })
  })

  it('CA-2469: a mudança vai para o plano pelo repositório de sempre', async () => {
    const { usuario, casos } = abrir({ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' })
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Modalidade' }), 'telenutricao')
    expect(casos.obter('nov')?.caso.avaliacao.modalidade).toBe('telenutricao')
    expect(casos.obter('nov')?.versao).toBe(2)
  })
})
