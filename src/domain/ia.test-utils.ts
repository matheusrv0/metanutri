// Os casos de teste do assistente de IA (spec assistente-ia): a gestante do desenho, com a ficha cheia de dado que não
// pode ir à IA, e um plano montado de ids reais da Base MetaNutri. O nome não termina em `.test.ts`: o Vitest não roda.
import { criarCasoVazio } from './caso.ts'
import { casoComFicha, restricoesDaFicha } from './fichaNoPlano.ts'
import { criarPacienteVazio, type Paciente } from './pacientes.ts'
import { comCuidadosDaFase, type RestricoesDoPaciente } from './restricoes.ts'
import type { Caso, ItemPlano, Plano, Refeicao } from './tipos.ts'

export const HOJE = '2026-11-03'

/** Texto que só existe na ficha: se aparecer no pedido à IA, vazou. */
export const SEGREDOS = ['Maria Eduarda Souza', 'Duda', 'maria.souza@exemplo.com', '84999998888', '1992-03-15', 'João Souza', 'mora no bairro X', 'TSH 4,2', 'Creatina']

export function pacienteDaGestante(mudar: Partial<Paciente> = {}): Paciente {
  return {
    ...criarPacienteVazio('pac-123', '2026-10-01T10:00:00Z'),
    nome: 'Maria Eduarda Souza (Duda)',
    sexo: 'F',
    nascimento: '1992-03-15',
    telefone: '84999998888',
    email: 'maria.souza@exemplo.com',
    responsavel: 'João Souza',
    objetivo: 'ter mais disposição; contato maria.souza@exemplo.com',
    restricoes: 'coentro',
    condicoesClinicas: '',
    medicamentos: 'sulfato ferroso; ligar (84) 99999-8888',
    anamnese: 'mora no bairro X',
    observacoes: 'mora no bairro X',
    momentoDeVida: { tipo: 'gestante', semanas: 24, semanasEm: HOJE, pesoPreGestacionalKg: 68 },
    restricoesMarcadas: ['leite'],
    doencas: ['anemia'],
    examesRecentes: [{ id: 'e1', data: '2026-10-01', exame: 'TSH 4,2', valor: '4,2' }],
    suplementos: [{ id: 's1', nome: 'Creatina', dose: '3 g', horario: 'manhã', duracao: '3 meses', observacao: '' }],
    respostasAnamnese: [
      { perguntaId: 'gosta', blocoId: 'alimentacao', pergunta: 'Alimentos de que gosta', resposta: 'tapioca, frango' },
      { perguntaId: 'nao-gosta', blocoId: 'alimentacao', pergunta: 'Alimentos de que não gosta', resposta: 'fígado, jiló' },
      { perguntaId: 'sono-horario', blocoId: 'rotina', pergunta: 'Horário de dormir e de acordar', resposta: 'acorda 6h, dorme 23h' },
      { perguntaId: 'rotina-trabalho', blocoId: 'rotina', pergunta: 'Rotina de trabalho ou estudo', resposta: 'escritório, 8h às 17h' },
      { perguntaId: 'refeicoes-onde', blocoId: 'alimentacao', pergunta: 'Quem prepara as refeições e onde come', resposta: 'ela mesma; marmita no almoço' },
      { perguntaId: 'orcamento', blocoId: 'alimentacao', pergunta: 'Orçamento para a alimentação', resposta: 'Econômico' },
      { perguntaId: 'queixa', blocoId: 'motivo', pergunta: 'Queixa principal', resposta: 'cansaço; mora no bairro X' },
    ],
    ...mudar,
  }
}

export function casoDaGestante(mudar: Partial<Caso> = {}): Caso {
  const base: Caso = {
    ...criarCasoVazio('caso-9'),
    pacienteId: 'pac-123',
    nome: 'Maria Eduarda Souza',
    dataConsulta: HOJE,
    pesoKg: 72.3,
    estaturaCm: 165,
    objetivo: 'manter',
    energia: { fator: 1.37, formula: 'mifflin', getManual: null },
    ...mudar,
  }
  return casoComFicha(base, pacienteDaGestante(), HOJE).caso
}

/** As restrições da ficha com os cuidados da fase do caso (como a tela monta). */
export function restricoesDoCaso(caso: Caso, paciente: Paciente = pacienteDaGestante()): RestricoesDoPaciente {
  return comCuidadosDaFase(restricoesDaFicha(paciente), { condicao: caso.condicao, idadeAnos: caso.idadeAnos })
}

let proximo = 0
export const gerarId = (): string => `id-${++proximo}`

const item = (alimentoId: number, gramas: number): ItemPlano => ({ id: gerarId(), alimentoId, gramas })

export function refeicao(nome: string, horario: string, principal: readonly (readonly [number, number])[], substituto1: readonly (readonly [number, number])[] = []): Refeicao {
  return { id: gerarId(), nome, horario, opcoes: { principal: principal.map(([id, g]) => item(id, g)), substituto1: substituto1.map(([id, g]) => item(id, g)), substituto2: [] } }
}

/** Um plano de adulto, de ids reais: café, almoço, lanche e jantar. */
export function planoDeAdulto(): Plano {
  return {
    refeicoes: [
      refeicao('Café da manhã', '07:00', [[53, 50], [488, 50], [226, 170]]),
      refeicao('Almoço', '12:00', [[3, 150], [561, 140], [410, 100], [78, 30], [157, 60]]),
      refeicao('Lanche da tarde', '16:00', [[182, 75], [448, 170]]),
      refeicao('Jantar', '19:30', [[3, 120], [561, 100], [377, 100], [88, 80]]),
    ],
  }
}
