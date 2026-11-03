// Excluir o paciente apaga o link e os e-mails dele (spec lado-do-paciente, DP-LP-26, CA-2284).
import { screen, waitFor } from '@testing-library/react'
import { criarAcompanhamento } from '@/domain/acompanhamento.ts'
import { emailsFalsos, linhaDeEmails } from '@/domain/emailsFalsos.test-utils.ts'
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

  it('sem link, a confirmação continua a de antes', () => {
    montarFichaComLink({ link: null })
    expect(screen.getByText('Os planos continuam salvos, mas perdem o vínculo com esta ficha.')).toBeInTheDocument()
  })
})
