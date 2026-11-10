// O link de exemplo dos testes da tela do link (spec lado-do-paciente): Juliana, com Ana Lima, 4 missões de refeição,
// frutas e água, e a dieta das quatro refeições. Terça, 3 de novembro de 2026, às 9:41.
import { render } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { criarAcompanhamento, marcarMissao, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { DadosDoLink } from '@/domain/dadosDoLink.ts'
import type { DietaDoLink } from '@/domain/dietaDoLink.ts'
import { SEM_MARCA, type MarcaDoLink } from '@/domain/marca.ts'
import type { Missao } from '@/domain/missoes.ts'
import { LinkDoPaciente } from '../LinkDoPaciente.tsx'

export const HOJE = '2026-11-03'
export const AGORA = new Date(2026, 10, 3, 9, 41)

export const MISSOES: readonly Missao[] = [
  { id: 'refeicao-cafe', texto: 'Café da manhã por volta das 7h', origem: 'Refeição do plano' },
  { id: 'refeicao-almoco', texto: 'Almoço por volta das 12h30', origem: 'Refeição do plano' },
  { id: 'refeicao-lanche', texto: 'Lanche por volta das 16h', origem: 'Refeição do plano' },
  { id: 'refeicao-jantar', texto: 'Jantar por volta das 19h30', origem: 'Refeição do plano' },
  { id: 'frutas', texto: 'Comer as 3 frutas do plano', origem: 'Frutas que estão no plano' },
  { id: 'agua', texto: 'Beber cerca de 2,2 litros de água', origem: 'Meta de água do plano' },
]

export const DIETA: DietaDoLink = {
  refeicoes: [
    { horario: '07:00', nome: 'Café da manhã', opcoes: [[{ medida: '1 unidade', gramas: 50, alimento: 'Pão, trigo, francês' }]] },
    {
      horario: '12:30',
      nome: 'Almoço',
      opcoes: [
        [{ medida: '6 colheres de sopa', gramas: 150, alimento: 'Arroz, tipo 1, cozido' }],
        [{ medida: '1 unidade', gramas: 120, alimento: 'Batata, inglesa, cozida' }],
      ],
    },
    { horario: '16:00', nome: 'Lanche', opcoes: [[{ medida: null, gramas: 170, alimento: 'Iogurte natural da casa' }]] },
    { horario: '19:30', nome: 'Jantar', opcoes: [[{ medida: null, gramas: 80, alimento: 'Macarrão, trigo, cru' }]] },
  ],
  orientacoes: 'Beba água ao longo do dia.',
  receitas: '',
  copiadaEm: '2026-11-03',
}

export const DADOS: DadosDoLink = {
  nutricionista: 'Ana Lima',
  emailMascarado: 'j•••a@gmail.com',
  avisos: { plano: 'ligado', semana: 'ligado', lembrete: 'desligado' },
}

export function linkDeTeste(parcial: Partial<Acompanhamento> = {}): Acompanhamento {
  const base = criarAcompanhamento(
    { casoId: 'caso-1', pacienteId: 'p1', nome: 'Juliana Martins', missoes: MISSOES, dieta: DIETA },
    { agora: () => '2026-10-01T10:00:00.000Z', gerarId: () => 'ac-1', aleatorio: (n) => new Uint8Array(n).fill(7) },
  )
  return { ...base, ...parcial }
}

interface Opcoes {
  readonly marca?: MarcaDoLink
  readonly dados?: DadosDoLink
  readonly agora?: Date
  readonly aoAlternar?: (missaoId: string, feita: boolean) => void
  readonly instalar?: ReactNode
  readonly aoAbrirMais?: () => void
}

/** O link com o estado das marcações, como a tela de verdade: marcar troca o link e chama `aoAlternar`. */
function LinkComEstado({ inicial, opcoes }: { readonly inicial: Acompanhamento; readonly opcoes: Opcoes }) {
  const [link, setLink] = useState(inicial)
  return (
    <LinkDoPaciente
      acompanhamento={link}
      marca={opcoes.marca ?? SEM_MARCA}
      hoje={HOJE}
      naoSalvou={null}
      dados={opcoes.dados ?? DADOS}
      agora={opcoes.agora ?? AGORA}
      instalar={opcoes.instalar}
      {...(opcoes.aoAbrirMais ? { aoAbrirMais: opcoes.aoAbrirMais } : {})}
      aoAlternar={(id, feita) => {
        setLink((atual) => marcarMissao(atual, HOJE, id, feita))
        opcoes.aoAlternar?.(id, feita)
      }}
    />
  )
}

export function abrirLink(link: Acompanhamento = linkDeTeste(), opcoes: Opcoes = {}) {
  return render(<LinkComEstado inicial={link} opcoes={opcoes} />)
}
