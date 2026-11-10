// Apoio dos testes da vista Avaliação: abre a tela de um plano ("av") com o caminho de sempre (salva a cada mudança) e
// lê o que ficou gravado no repositório.
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import type { Caso } from '@/domain/tipos.ts'
import { AGORA, montarComDados, moldura, planoDe } from './apoioDosTestes.test-utils.tsx'
import { TelaAntropometria } from './TelaAntropometria.tsx'

const vazio = criarCasoVazio('av')

/** Um plano completo com o que vier, mesclando os grupos aninhados sobre os vazios. */
export function casoDe(c: Omit<Partial<Caso>, 'medidasCorporais' | 'composicao' | 'avaliacao'> & {
  readonly medidasCorporais?: Partial<Caso['medidasCorporais']>
  readonly dobras?: Partial<Caso['composicao']['dobras']>
  readonly composicao?: Partial<Omit<Caso['composicao'], 'dobras'>>
  readonly avaliacao?: Partial<Caso['avaliacao']>
}): Partial<Caso> {
  const { medidasCorporais, dobras, composicao, avaliacao, ...resto } = c
  return {
    ...resto,
    medidasCorporais: { ...vazio.medidasCorporais, ...medidasCorporais },
    composicao: { ...vazio.composicao, ...composicao, dobras: { ...vazio.composicao.dobras, ...dobras } },
    avaliacao: { ...vazio.avaliacao, ...avaliacao },
  }
}

/** Abre a vista Avaliação do plano "av" (com os pacientes do cenário) e devolve como ler o plano gravado. */
export function abrirAvaliacao(caso: Partial<Caso>, pacientes: readonly Paciente[] = []) {
  const montado = montarComDados({ pacientes, planos: [planoDe('av', { dataConsulta: '2026-11-03', ...caso })] }, () => (
    <TelaAntropometria rota={{ tela: 'antropometria', casoId: 'av', vista: 'avaliacao' }} navegar={() => undefined} moldura={moldura} aoNovaAvaliacao={() => undefined} agora={AGORA} />
  ))
  const gravado = (): Caso => {
    const r = montado.casos.obter('av')
    if (!r) throw new Error('sem o plano')
    return r.caso
  }
  return { ...montado, gravado }
}
