// Criar os importados (spec importar-pacientes, D-910 a D-912): tudo de uma vez, depois de conferir de novo a lista da
// conta (outra aba ou aparelho pode ter criado alguém desde a prévia) e o teto da cópia da conta (D-107, 5 MB). Meia
// importação é pior que nenhuma: se não cabe, nada é criado.
import { CHAVE_MUDANCAS, lerMudancas, montarCopia } from '../copiaDaConta.ts'
import { criarPacienteVazio, type Paciente } from '../pacientes.ts'
import type { Backup } from '../perfil.ts'
import type { Armazenamento } from '../persistencia.ts'
import { dadosDosPacientes, montarPrevia, type DadosDoPaciente, type EntradaDaPrevia, type Previa } from './previa.ts'

/** D-107 (spec seguranca-lote-2): a cópia completa da conta vai até 5 MB (`copias_dados_tamanho`). */
export const TETO_DA_COPIA = 5 * 1024 * 1024

const CHAVE_PACIENTES = 'metanutri:pacientes'

/**
 * DP-IP-18: o tamanho da cópia em bytes UTF-8 do texto JSON. Mede um pouco a mais que o `pg_column_size` do banco (o
 * jsonb não guarda as barras de escape): o que passa aqui, passa lá.
 */
export const bytesDaCopia = (copia: Backup): number => new TextEncoder().encode(JSON.stringify(copia)).length

export interface OpcoesDaCriacao {
  readonly importacaoId: string
  /** A hora da importação (ISO): `criadoEm`, `atualizadoEm` e a hora da importação de cada um. */
  readonly agora: string
  readonly gerarId: () => string
}

/** D-911 e D-912: fichas novas, sem plano, com a importação de onde vieram. O resto da ficha nasce vazio. */
export function novosPacientes(dados: readonly DadosDoPaciente[], { importacaoId, agora, gerarId }: OpcoesDaCriacao): Paciente[] {
  return dados.map((d) => ({
    ...criarPacienteVazio(gerarId(), agora),
    nome: d.nome,
    sexo: d.sexo,
    nascimento: d.nascimento,
    telefone: d.telefone,
    email: d.email,
    objetivo: d.objetivo,
    observacoes: d.observacoes,
    importacao: { id: importacaoId, em: agora },
  }))
}

function lerLista(texto: string | undefined): unknown[] {
  try {
    const lista: unknown = JSON.parse(texto ?? '[]')
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

export type Teto = { readonly cabe: true } | { readonly cabe: false; readonly cabem: number }

/**
 * D-910 e CA-1936: a cópia que subiria com os novos (as fichas e a marca de mudança de cada uma) cabe no teto? Se não,
 * quantos dos primeiros cabem, contados na ordem da planilha.
 */
export function cabeNaCopia(armazenamento: Armazenamento | null, novos: readonly Paciente[], agora: string): Teto {
  const copia = montarCopia(armazenamento, agora)
  const guardados = lerLista(copia.dados[CHAVE_PACIENTES])
  const marcas = lerMudancas(copia.dados[CHAVE_MUDANCAS] ?? null)
  const medir = (quantos: number): number => {
    const entram = novos.slice(0, quantos)
    const alterados = { ...marcas.alterados, ...Object.fromEntries(entram.map((p) => [`pacientes/${p.id}`, agora])) }
    return bytesDaCopia({
      ...copia,
      dados: { ...copia.dados, [CHAVE_PACIENTES]: JSON.stringify([...guardados, ...entram]), [CHAVE_MUDANCAS]: JSON.stringify({ alterados, excluidos: marcas.excluidos }) },
    })
  }
  if (medir(novos.length) <= TETO_DA_COPIA) return { cabe: true }
  if (medir(0) > TETO_DA_COPIA) return { cabe: false, cabem: 0 }
  // A medida cresce com cada paciente: a busca binária acha o último que cabe.
  let cabe = 0
  let passa = novos.length
  while (passa - cabe > 1) {
    const meio = Math.floor((cabe + passa) / 2)
    if (medir(meio) <= TETO_DA_COPIA) cabe = meio
    else passa = meio
  }
  return { cabe: false, cabem: cabe }
}

export type Preparo = { readonly tipo: 'mudou'; readonly previa: Previa } | { readonly tipo: 'nao-cabe'; readonly cabem: number } | { readonly tipo: 'pronta'; readonly pacientes: Paciente[] }

export interface PedidoDeImportar extends OpcoesDaCriacao {
  readonly entrada: EntradaDaPrevia
  /** A prévia que a nutricionista via quando clicou. */
  readonly previaNaTela: Previa
  /** A lista da conta lida agora, do armazenamento (DP-IP-30). */
  readonly pacientesAgora: EntradaDaPrevia['pacientes']
  readonly armazenamento: Armazenamento | null
}

/**
 * D-910: antes de criar, a lista da conta de novo (quem passou a existir vira "Já está na conta" e a prévia volta, sem
 * criar nada; DP-IP-17) e o teto da cópia. Só depois disso os pacientes saem prontos para gravar de uma vez.
 */
export function prepararImportacao({ entrada, previaNaTela, pacientesAgora, armazenamento, ...opcoes }: PedidoDeImportar): Preparo {
  const previa = montarPrevia({ ...entrada, pacientes: pacientesAgora })
  const antes = previaNaTela.marcadas.map((l) => l.numero)
  const agora = previa.marcadas.map((l) => l.numero)
  if (antes.length !== agora.length || antes.some((numero, i) => numero !== agora[i])) return { tipo: 'mudou', previa }
  const pacientes = novosPacientes(dadosDosPacientes(previa), opcoes)
  const teto = cabeNaCopia(armazenamento, pacientes, opcoes.agora)
  return teto.cabe ? { tipo: 'pronta', pacientes } : { tipo: 'nao-cabe', cabem: teto.cabem }
}
