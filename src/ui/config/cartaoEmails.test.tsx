// Configurações › E-mails (spec lado-do-paciente, CA-2266, D-1231, DP-LP-8).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento } from '@/domain/acompanhamento.ts'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { emailsFalsos } from '@/domain/emailsFalsos.test-utils.ts'
import { PERFIL_VAZIO, type Perfil } from '@/domain/perfil.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
import { ProvedorAcompanhamentos } from '../estado/ProvedorAcompanhamentos.tsx'
import { ContextoClienteDosEmails } from '../estado/usarEmailsDoLink.ts'
import { TelaConfiguracoes } from './TelaConfiguracoes.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const PERFIL: Perfil = { ...PERFIL_VAZIO, nome: 'Ana Lima', tipo: 'profissional', crn: 'CRN-3 12345', email: 'ana.lima@nutricaoclinica.com.br' }

function montar(cliente: ClienteDosEmails | null, extra: { readonly perfil?: Perfil } = {}) {
  const memoria = new MemoriaFalsa()
  memoria.setItem('metanutri:perfil', JSON.stringify(extra.perfil ?? PERFIL))
  const links = criarRepositorioAcompanhamentos(memoria)
  links.salvar({
    ...criarAcompanhamento({ casoId: 'c1', pacienteId: 'p1', nome: 'Carlos Souza', missoes: [] }, { agora: () => '2026-10-01T10:00:00.000Z', gerarId: () => 'l1' }),
    marcacoes: [{ dia: '2026-10-25', feitas: ['agua'] }],
  })
  render(
    <ContextoArmazenamento.Provider value={memoria}>
      <ContextoClienteDosEmails.Provider value={cliente}>
        <ProvedorAcompanhamentos repositorio={links}>
          <TelaConfiguracoes usuarioId="conta-1" />
        </ProvedorAcompanhamentos>
      </ContextoClienteDosEmails.Provider>
    </ContextoArmazenamento.Provider>,
  )
  return { usuario: userEvent.setup() }
}

const cartao = () => within(screen.getByRole('heading', { name: 'E-mails' }).closest('[aria-labelledby]') as HTMLElement)

describe('CA-2266: Configurações › E-mails', () => {
  it('CA-2266: "Resumo da adesão" e "Oferecer avisos aos pacientes novos" vêm ligados, e as respostas vão para o e-mail do Perfil', async () => {
    const { cliente } = emailsFalsos()
    montar(cliente)
    const c = cartao()
    expect(await c.findByRole('switch', { name: 'Receber o resumo da adesão' })).toBeChecked()
    expect(c.getByText('Toda segunda, às 7h, para o seu e-mail.')).toBeInTheDocument()
    expect(c.getByRole('switch', { name: 'Oferecer avisos aos pacientes novos' })).toBeChecked()
    expect(c.getByText('Respostas dos pacientes')).toBeInTheDocument()
    expect(c.getByText('ana.lima@nutricaoclinica.com.br')).toBeInTheDocument()
    expect(c.getByText('Do seu Perfil')).toBeInTheDocument()
  })

  it('CA-2266: desligar o resumo grava na configuração da conta, com o nome e o e-mail do Perfil', async () => {
    const { cliente, chamadas } = emailsFalsos()
    const { usuario } = montar(cliente)
    await usuario.click(await cartao().findByRole('switch', { name: 'Receber o resumo da adesão' }))
    await waitFor(() => expect(chamadas.some((c) => c.tipo === 'upsert' && c.corpo['resumo_da_adesao'] === false)).toBe(true))
    expect(chamadas.find((c) => c.tipo === 'upsert' && c.corpo['resumo_da_adesao'] === false)?.corpo).toMatchObject({
      nutricionista_id: 'conta-1',
      nome: 'Ana Lima',
      responder_para: 'ana.lima@nutricaoclinica.com.br',
      oferecer_aos_novos: true,
    })
  })

  it('DP-LP-8: ao abrir, o nome e o e-mail do Perfil sobem se a nuvem tem outros', async () => {
    const { cliente, chamadas } = emailsFalsos({ config: { nome: 'Nome antigo', responder_para: null, resumo_da_adesao: true, oferecer_aos_novos: false } })
    montar(cliente)
    await waitFor(() => expect(chamadas.some((c) => c.tipo === 'upsert')).toBe(true), { timeout: 3000 })
    expect(chamadas.find((c) => c.tipo === 'upsert')?.corpo).toMatchObject({ nome: 'Ana Lima', responder_para: 'ana.lima@nutricaoclinica.com.br', oferecer_aos_novos: false })
  })

  it('D-1225: sem e-mail no Perfil, as respostas vão para o e-mail da conta', async () => {
    const { cliente } = emailsFalsos()
    montar(cliente, { perfil: { ...PERFIL, email: '' } })
    expect(await cartao().findByText('Sem e-mail no Perfil, as respostas vão para o e-mail da conta.')).toBeInTheDocument()
  })

  it('"Editar no Perfil" leva o cursor ao e-mail de "Quem assina"', async () => {
    const { cliente } = emailsFalsos()
    const { usuario } = montar(cliente)
    await usuario.click(await cartao().findByRole('button', { name: 'Editar no Perfil' }))
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
  })

  it('D-1231: a prévia do resumo conta os pacientes da conta e diz quem parou, com o primeiro nome e a inicial', async () => {
    const { cliente } = emailsFalsos()
    montar(cliente)
    const previa = within(await cartao().findByRole('group', { name: 'Prévia do resumo da adesão' }))
    expect(previa.getByText(/^Carlos S\. · \d+ dias$/)).toBeInTheDocument()
  })

  it('DP-LP-30: sem servidor, o cartão diz "Indisponível no momento."', () => {
    montar(null)
    expect(cartao().getByText('Indisponível no momento.')).toBeInTheDocument()
  })
})
