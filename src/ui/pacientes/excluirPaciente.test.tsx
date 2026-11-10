// Excluir o paciente apaga o link e os e-mails dele (spec lado-do-paciente, DP-LP-26, CA-2284).
import { screen, waitFor } from '@testing-library/react'
import { criarAcompanhamento } from '@/domain/acompanhamento.ts'
import { emailsFalsos, linhaDeEmails } from '@/domain/emailsFalsos.test-utils.ts'
import type { ArmazenamentoDeFotos } from '@/domain/fotosDaAvaliacao.ts'
import { MISSOES, montarFichaComLink } from './fichaComLink.test-utils.tsx'

describe('CA-2284: excluir o paciente', () => {
  it('CA-2284: a confirmação avisa que o link deixa de abrir; excluir apaga o e-mail, os aceites e os envios do link, e o link', async () => {
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
    const { usuario, links, pacientes } = montarFichaComLink({ cliente })
    // Um link antigo do mesmo paciente, substituído pelo fixo (D-1217): sai junto.
    links.salvar({
      ...criarAcompanhamento({ casoId: 'antigo', pacienteId: 'p1', nome: 'Juliana', missoes: MISSOES }, { agora: () => '2026-09-01T10:00:00.000Z', gerarId: () => 'link-0' }),
      substituidoPor: 'link-1',
    })
    expect(screen.getByText('Os planos continuam salvos, mas perdem o vínculo com esta ficha. O link do paciente deixa de abrir.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    await waitFor(() => expect(pacientes.obter('p1')).toBeNull())
    expect(chamadas.filter((c) => c.nome === 'apagar_emails_do_link').map((c) => c.corpo['p_link']).sort()).toEqual(['link-0', 'link-1'])
    expect(links.listar()).toEqual([])
  })

  it('CB-1228: a nuvem não apaga os e-mails do link: a ficha e o link ficam, e a tela avisa', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() }, rpcComErro: ['apagar_emails_do_link'] })
    const falso = { ...cliente, rpc: (nome: string, p?: Record<string, unknown>) => (nome === 'apagar_emails_do_link' ? Promise.resolve({ data: null, error: { message: 'Failed to fetch' } }) : cliente.rpc(nome, p)) }
    const { usuario, links, pacientes } = montarFichaComLink({ cliente: falso })
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível apagar o link do paciente. Confira a internet e tente de novo.')
    expect(pacientes.obter('p1')).not.toBeNull()
    expect(links.listar()).toHaveLength(1)
  })

  it('DP-LP-30: com o banco ainda sem o 017, não há e-mail a apagar, e o paciente sai', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() }, rpcComErro: ['apagar_emails_do_link'] })
    const { usuario, pacientes } = montarFichaComLink({ cliente })
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    await waitFor(() => expect(pacientes.obter('p1')).toBeNull())
  })

  it('CA-587: "Excluir paciente" é o último cartão da ficha, depois dos e-mails do link', () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
    montarFichaComLink({ cliente })
    const titulos = screen.getAllByText(/^(Avisos por e-mail|Próximo e-mail|Enviados|Excluir paciente|Histórico de planos)$/, { selector: '[data-slot="card-title"], h2, h3, div' })
    expect(titulos.at(-1)).toHaveTextContent('Excluir paciente')
  })

  it('sem link, a confirmação continua a de antes', () => {
    montarFichaComLink({ link: null })
    expect(screen.getByText('Os planos continuam salvos, mas perdem o vínculo com esta ficha.')).toBeInTheDocument()
  })

  describe('com as fotos das avaliações (spec antropometria-telas, D-1503 e D-1534)', () => {
    const fotosFalsas = (apagaPasta: boolean): ArmazenamentoDeFotos => ({
      conta: async () => 'conta-1',
      enviar: async () => 'ok',
      listar: async () => [],
      assinar: async () => null,
      apagar: async () => true,
      apagarPasta: async () => apagaPasta,
    })

    it('D-1503 e CA-2284: a confirmação diz as duas coisas; as fotos saem, depois o link, depois a ficha', async () => {
      const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
      const { usuario, links, pacientes } = montarFichaComLink({ cliente, fotos: fotosFalsas(true) })
      expect(
        screen.getByText('Os planos continuam salvos, mas perdem o vínculo com esta ficha. As fotos e os anexos das avaliações são apagados. O link do paciente deixa de abrir.'),
      ).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
      await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
      await waitFor(() => expect(pacientes.obter('p1')).toBeNull())
      expect(chamadas.filter((c) => c.nome === 'apagar_emails_do_link')).toHaveLength(1)
      expect(links.listar()).toEqual([])
    })

    it('D-1534: a pasta das fotos não sai: a ficha e o link ficam, e o aviso é o das fotos', async () => {
      const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
      const { usuario, links, pacientes } = montarFichaComLink({ cliente, fotos: fotosFalsas(false) })
      await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
      await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível apagar as fotos e os anexos das avaliações. A ficha continua. Confira a internet e tente de novo.')
      expect(pacientes.obter('p1')).not.toBeNull()
      expect(links.listar()).toHaveLength(1)
      expect(chamadas.filter((c) => c.nome === 'apagar_emails_do_link')).toEqual([])
    })
  })
})
