// A marca da nutricionista na tela nova do link (spec lado-do-paciente, D-1210, D-1211, CA-2215 e CA-2216).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HOJE as HOJE_DA_PREVIA } from './linkDeTeste.test-utils.tsx'
import { abrirLink, DADOS, linkDeTeste } from './linkDeTeste.test-utils.tsx'
import { LinkDoPaciente } from '../LinkDoPaciente.tsx'

const VERDE_FOLHA = '#3f5f2a'
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('CA-2215: a cor da nutricionista no link novo', () => {
  it('CA-2215: a aba escolhida da barra de baixo, o segmento cheio e "Marcar como feita" na cor dela; feita, o verde de "feita"', async () => {
    const { container } = abrirLink(linkDeTeste({ marcacoes: [{ dia: HOJE_DA_PREVIA, feitas: ['refeicao-cafe'] }] }), { marca: { logo: LOGO, cor: VERDE_FOLHA } })
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--marca-claro')).toBe(VERDE_FOLHA)
    expect(screen.getByRole('link', { name: 'Hoje' }).className).toContain('text-linkacao')
    expect(screen.getByRole('progressbar').firstElementChild?.firstElementChild?.className).toContain('bg-linkacao')

    await userEvent.setup().click(screen.getByRole('link', { name: 'Plano' }))
    expect(within(screen.getByRole('region', { name: '12:30 Almoço' })).getByRole('button', { name: 'Marcar como feita' }).className).toContain('text-linkacao')
    const feita = within(screen.getByRole('region', { name: '07:00 Café da manhã' })).getByRole('button', { name: 'Feita hoje' })
    expect(feita.className).toContain('text-successtext')
    expect(feita.className).not.toContain('linkacao')
  })

  it('CA-2215: o seletor de opções e o rótulo "Próxima" na cor dela', async () => {
    abrirLink(linkDeTeste(), { marca: { logo: null, cor: VERDE_FOLHA } })
    await userEvent.setup().click(screen.getByRole('link', { name: 'Plano' }))
    const almoco = within(screen.getByRole('region', { name: '12:30 Almoço' }))
    expect(almoco.getByRole('tab', { name: 'Opção 1' }).className).toContain('data-[state=active]:bg-linkacao')
    expect(almoco.getByText('Próxima').className).toContain('bg-linkacao')
  })

  it('CA-2215 e D-1210: o nome da nutricionista aparece na mensagem', () => {
    abrirLink(linkDeTeste({ mensagem: 'Bom dia.', mensagemEm: '2026-11-03T12:00:00Z' }), { dados: DADOS })
    expect(screen.getByRole('region', { name: 'Mensagem de Ana Lima' })).toHaveTextContent('Ana Lima')
  })

  it('CA-2216: o link segue o tema do celular: na prévia escura, o escuro; na clara, o claro', () => {
    const { container, rerender } = render(<LinkDoPaciente acompanhamento={linkDeTeste()} marca={{ logo: null, cor: VERDE_FOLHA }} hoje={HOJE_DA_PREVIA} naoSalvou={null} aoAlternar={() => undefined} previa="escuro" />)
    expect(container.firstElementChild).toHaveClass('dark')
    expect((container.querySelector('[data-link-do-paciente]') as HTMLElement).style.getPropertyValue('--marca-escuro')).toBe('#7ab455')
    rerender(<LinkDoPaciente acompanhamento={linkDeTeste()} marca={{ logo: null, cor: VERDE_FOLHA }} hoje={HOJE_DA_PREVIA} naoSalvou={null} aoAlternar={() => undefined} previa="claro" />)
    expect(container.firstElementChild).toHaveClass('tema-claro')
  })

  it('a prévia de "Sua marca" mostra os três pontos só como desenho (nada abre a partir dela)', () => {
    render(<LinkDoPaciente acompanhamento={linkDeTeste()} marca={{ logo: null, cor: null }} hoje={HOJE_DA_PREVIA} naoSalvou={null} aoAlternar={() => undefined} previa="claro" />)
    expect(screen.queryByRole('button', { name: 'Mais opções' })).not.toBeInTheDocument()
  })
})
