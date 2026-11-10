// Apoio dos testes da antropometria: armazenamento em memória, os provedores de casos e pacientes e a moldura que
// desenha o cabeçalho como a `Estrutura` (título, trilha e ações).
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarPacienteVazio, criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import type { CabecaDaTela } from './TelaAntropometria.tsx'

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

let ids = 0
const proximoId = () => `id-${++ids}`

/** A paciente de exemplo do protótipo, com a ficha: 34 anos em 03/11/2026. */
export const RENATA: Paciente = {
  ...criarPacienteVazio('renata', '2026-05-12T10:00:00.000Z'),
  nome: 'Renata Oliveira Campos',
  sexo: 'F',
  nascimento: '1992-05-12',
  objetivo: 'perder gordura',
  email: 'renata.campos@email.com',
}

export const AGORA = new Date(2026, 10, 3, 10, 42)

/** O plano completo da avaliação, com o que vier. */
export const planoDe = (id: string, caso: Partial<Caso>): { readonly caso: Caso; readonly plano: ReturnType<typeof criarPlanoPadrao> } => ({
  caso: { ...criarCasoVazio(id), modo: 'completo', ...caso },
  plano: criarPlanoPadrao(proximoId),
})

export function moldura(cabeca: CabecaDaTela, conteudo: ReactNode) {
  return (
    <div>
      <nav aria-label="Você está em">
        {cabeca.trilha.map((p) => (
          <button key={p.rotulo} type="button" onClick={p.aoClicar}>
            {p.rotulo}
          </button>
        ))}
      </nav>
      <h1>{cabeca.titulo}</h1>
      <div data-testid="acoes">{cabeca.acoes}</div>
      <main>{conteudo}</main>
    </div>
  )
}

export interface Cenario {
  readonly pacientes?: readonly Paciente[]
  readonly planos?: readonly { readonly caso: Caso; readonly plano: ReturnType<typeof criarPlanoPadrao> }[]
}

/** Grava o cenário num armazenamento novo e desenha `conteudo` com os provedores. */
export function montarComDados(cenario: Cenario, conteudo: (repos: Repositorios) => ReactNode) {
  const memoria = new MemoriaFalsa()
  const repos: Repositorios = { casos: criarRepositorio(memoria), pacientes: criarRepositorioPacientes(memoria) }
  for (const p of cenario.pacientes ?? []) repos.pacientes.salvar(p)
  for (const p of cenario.planos ?? []) repos.casos.salvar(p)
  render(
    <ProvedorCasos repositorio={repos.casos}>
      <ProvedorPacientes repositorio={repos.pacientes}>{conteudo(repos)}</ProvedorPacientes>
    </ProvedorCasos>,
  )
  return { ...repos, usuario: userEvent.setup() }
}

export interface Repositorios {
  readonly casos: ReturnType<typeof criarRepositorio>
  readonly pacientes: ReturnType<typeof criarRepositorioPacientes>
}
