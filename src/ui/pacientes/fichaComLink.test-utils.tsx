// A ficha do paciente com o link e os e-mails (spec lado-do-paciente): os provedores de verdade com dados em memória e um
// cliente de e-mails de mentira. Usada pelos testes do cartão do link e dos avisos por e-mail.
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import type { Missao } from '@/domain/missoes.ts'
import { criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '../estado/ProvedorAcompanhamentos.tsx'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { ContextoClienteDosEmails } from '../estado/usarEmailsDoLink.ts'
import { TelaPaciente } from './TelaPaciente.tsx'

export class MemoriaFalsa implements Armazenamento {
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

export const MISSOES: readonly Missao[] = [{ id: 'agua', texto: 'Beber água ao longo do dia', origem: 'Hábito que acompanha o plano' }]

/** Terça, 3/11/2026, 10h15 em Brasília. */
export const AGORA = new Date('2026-11-03T13:15:00.000Z')

export interface OpcoesDaFicha {
  readonly paciente?: Partial<Paciente>
  readonly link?: Partial<Acompanhamento> | null
  readonly cliente?: ClienteDosEmails | null
  readonly aoCadastrarTelefone?: (pacienteId: string) => void
}

export function montarFichaComLink(opcoes: OpcoesDaFicha = {}) {
  const armazenamento = new MemoriaFalsa()
  const pacientes = criarRepositorioPacientes(armazenamento, { gerarId: () => 'p1' })
  pacientes.salvar({ ...pacientes.criar('Juliana Martins'), email: 'juliana.martins@gmail.com', ...opcoes.paciente })
  const casos = criarRepositorio(armazenamento)
  const plano = casos.criar('Plano da Juliana')
  const salvo = casos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: 'p1', dataConsulta: '2026-11-03' } })
  const links = criarRepositorioAcompanhamentos(armazenamento)
  const link =
    opcoes.link === null
      ? null
      : links.salvar({
          ...criarAcompanhamento(
            { casoId: salvo.caso.id, pacienteId: 'p1', nome: 'Juliana', missoes: MISSOES },
            { agora: () => '2026-10-20T10:00:00.000Z', gerarId: () => 'link-1', aleatorio: (n) => new Uint8Array(n).fill(7) },
          ),
          ...opcoes.link,
        })
  const usuario = userEvent.setup()
  const tela = render(
    <ContextoClienteDosEmails.Provider value={opcoes.cliente ?? null}>
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <ProvedorAcompanhamentos repositorio={links}>
            <TelaPaciente
              pacienteId="p1"
              aoAbrirPlano={vi.fn()}
              aoNovoPlano={vi.fn()}
              aoVoltar={vi.fn()}
              agora={AGORA}
              {...(opcoes.aoCadastrarTelefone ? { aoCadastrarTelefone: opcoes.aoCadastrarTelefone } : {})}
            />
          </ProvedorAcompanhamentos>
        </ProvedorPacientes>
      </ProvedorCasos>
    </ContextoClienteDosEmails.Provider>,
  )
  return { usuario, pacientes, casos, links, link, plano: salvo, tela }
}
