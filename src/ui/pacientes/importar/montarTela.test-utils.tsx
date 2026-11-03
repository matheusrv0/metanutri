// A tela de importar montada com os provedores de dados, num armazenamento em memória (spec importar-pacientes).
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarPacienteVazio, criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type ArmazenamentoListavel } from '@/domain/persistencia.ts'
import { emUtf8 } from '@/domain/importar/montarArquivos.test-utils.ts'
import { ContextoArmazenamento } from '../../estado/contextoArmazenamento.ts'
import { ProvedorCasos } from '../../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../../estado/ProvedorPacientes.tsx'
import { TelaImportarPacientes } from './TelaImportarPacientes.tsx'

export class Memoria implements ArmazenamentoListavel {
  readonly dados = new Map<string, string>()
  get length() {
    return this.dados.size
  }
  key(i: number) {
    return [...this.dados.keys()][i] ?? null
  }
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

/** A moldura de teste: o título da página e as ações, como o cabeçalho do app. */
const moldura = (acoes: ReactNode, conteudo: ReactNode) => (
  <div>
    <header>
      <h1>Importar planilha</h1>
      {acoes}
    </header>
    <main>{conteudo}</main>
  </div>
)

export interface OpcoesDaTela {
  readonly armazenamento?: Memoria
  readonly pacientes?: readonly Paciente[]
}

export function montarTela({ armazenamento = new Memoria(), pacientes = [] }: OpcoesDaTela = {}) {
  const repoPacientes = criarRepositorioPacientes(armazenamento)
  if (pacientes.length > 0) repoPacientes.criarVarios(pacientes)
  const repoCasos = criarRepositorio(armazenamento)
  const aoSair = vi.fn()
  const montagem = render(
    <ContextoArmazenamento.Provider value={armazenamento}>
      <ProvedorCasos repositorio={repoCasos}>
        <ProvedorPacientes repositorio={repoPacientes}>
          <TelaImportarPacientes moldura={moldura} aoSair={aoSair} />
        </ProvedorPacientes>
      </ProvedorCasos>
    </ContextoArmazenamento.Provider>,
  )
  return { ...montagem, armazenamento, repoPacientes, repoCasos, aoSair, usuario: userEvent.setup() }
}

export const arquivo = (nome: string, conteudo: string | Uint8Array, tipo = 'text/csv'): File =>
  new File([new Uint8Array(typeof conteudo === 'string' ? emUtf8(conteudo) : conteudo)], nome, { type: tipo })

/** A paciente do protótipo que já está na conta: a linha 9 da planilha vira "Já está na conta". */
export const NA_CONTA: readonly Paciente[] = [{ ...criarPacienteVazio('fernanda', '2026-10-01T12:00:00.000Z'), nome: 'Fernanda Almeida Costa', nascimento: '1996-09-28' }]

/** O CSV do protótipo, com CPF e peso, que não entram. */
export const CSV_DO_PROTOTIPO = [
  'Nome;Sexo;Data de nascimento;Celular;E-mail;Objetivo;CPF;Peso (kg);Observações',
  'Juliana Ferreira Souza;F;14/03/1991;(11) 98765-4321;juliana.souza@email.com;Reeducação alimentar;123.456.789-00;68,4;Intolerância à lactose',
  'Rafael Oliveira Lima;M;02/11/1985;(21) 99654-1207;rafael.lima@email.com;Ganho de massa;111.222.333-44;82,0;',
  'Camila Rodrigues;F;31/02/1994;(31) 98822-0415;camila.r@email.com;Emagrecimento;;74,9;',
  'Bruno Carvalho Dias;;23/07/1979;(11) 97310-5582;bruno.dias@email.com;Controle da glicemia;;91,2;Diabetes tipo 2',
  'Patrícia Gomes Ribeiro;F;09/05/1988;(19) 99127-3340;patricia.ribeiro@email.com;Gestação;;63,0;24 semanas',
  'Lucas Martins;M;17/01/2001;(41) 98451-7763;lucas.martins@email.com;Desempenho no esporte;;77,5;',
  'RAFAEL OLIVEIRA LIMA;M;02/11/1985;(21) 99654-1207;rafael.lima@email.com;Ganho de massa;;82,0;',
  'Fernanda Almeida Costa;F;28/09/1996;(21) 98034-6619;fernanda.costa@email.com;Reeducação alimentar;;58,7;',
  'Tiago Nascimento;M;05/12/1990;(85) 99702-2148;tiago.n@email.com;Colesterol alto;;88,1;',
].join('\r\n')

/** Escolhe o arquivo pelo "Escolher arquivo" e espera o passo Colunas (o nome do arquivo vira o título dele). */
export async function escolher(usuario: ReturnType<typeof userEvent.setup>, escolhido: File): Promise<void> {
  await usuario.upload(screen.getByLabelText('Escolher arquivo'), escolhido)
}

export async function abrirColunas(usuario: ReturnType<typeof userEvent.setup>, escolhido: File = arquivo('pacientes.csv', CSV_DO_PROTOTIPO)): Promise<void> {
  await escolher(usuario, escolhido)
  // A planilha grande leva mais que o segundo padrão do findBy no jsdom.
  await screen.findByRole('heading', { level: 2, name: escolhido.name }, { timeout: 10_000 })
}

export async function abrirPrevia(usuario: ReturnType<typeof userEvent.setup>, escolhido?: File): Promise<void> {
  await abrirColunas(usuario, escolhido)
  await usuario.click(screen.getByRole('button', { name: 'Ver prévia' }))
  await screen.findByRole('heading', { level: 2, name: 'Prévia' })
}

/** Solta o arquivo na área, como o arrastar do computador. */
export function soltar(alvo: HTMLElement, escolhido: File): void {
  const dataTransfer = { files: [escolhido], types: ['Files'], items: [], dropEffect: 'copy' }
  fireEvent.dragEnter(alvo, { dataTransfer })
  fireEvent.dragOver(alvo, { dataTransfer })
  fireEvent.drop(alvo, { dataTransfer })
}
