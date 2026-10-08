import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Acompanhamento } from '@/domain/acompanhamento.ts'
import { chaveDoEvento } from '@/domain/armazenamentoDaConta.ts'
import {
  fonteSupabase,
  listarAcompanhamentosDaNuvem,
  removerAcompanhamentoDaNuvem,
  salvarLinkNaNuvem,
  subirAcompanhamento,
  LIMITE_DE_LINKS,
  type ClienteMissoes,
} from '@/domain/fonteSupabase.ts'
import { criarRepositorioAcompanhamentos, fonteLocal, type MarcasDoLink, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { obterSupabase } from './supabase.ts'
import { ContextoAcompanhamentos, type ValorAcompanhamentos } from './contextoAcompanhamentos.ts'

/** CB-106: a leitura da nuvem falhou e a tela segue com a cópia do aparelho. */
const SEM_ATUALIZAR = 'Não consegui atualizar com a nuvem. Mostrando a cópia deste aparelho.'

/**
 * Compartilha os acompanhamentos entre a tela do nutricionista e o link do paciente.
 *
 * Com conta (spec missoes-na-nuvem), o link vive na nuvem e o aparelho guarda uma cópia
 * para abrir sem internet. Sem servidor, tudo fica só no aparelho, como antes (CA-444).
 */
interface ProvedorAcompanhamentosProps {
  readonly children: ReactNode
  readonly repositorio?: RepositorioAcompanhamentos
  /** A conta destes dados (spec dados-por-conta): a nuvem só é usada com a sessão dela (CA-474). */
  readonly usuarioId?: string | null
}

export function ProvedorAcompanhamentos({ children, repositorio, usuarioId = null }: ProvedorAcompanhamentosProps) {
  // A cópia da conta que entrou (spec dados-por-conta, D-120).
  const armazenamento = useArmazenamento()
  const [repo] = useState<RepositorioAcompanhamentos>(() => repositorio ?? criarRepositorioAcompanhamentos(armazenamento))
  // O tipo do cliente do Supabase é fundo demais para o TypeScript casar com a interface
  // pequena da porta (TS2589), como em Configurações. A forma em tempo de execução é a mesma.
  const [cliente] = useState(() => obterSupabase() as unknown as ClienteMissoes | null)
  const [versao, setVersao] = useState(0)
  const [avisoNuvem, setAvisoNuvem] = useState<string | null>(null)
  const [foraDaNuvem, setForaDaNuvem] = useState<ReadonlyMap<string, string>>(() => new Map())
  // Links mexidos aqui durante uma leitura da nuvem, ou com gravação ainda a caminho: a
  // resposta da leitura, mais velha, não passa por cima deles.
  const mexidos = useRef(new Set<string>())
  const aCaminho = useRef(new Map<string, number>())
  // Abrir o plano e Adesão juntos (ou voltar para a aba) não faz duas leituras ao mesmo tempo.
  const lendo = useRef<Promise<void> | null>(null)
  // CA-474: trocar de conta desmonta este provedor. O que ainda estava a caminho da nuvem
  // confere esta marca depois de cada espera e não grava nem envia mais nada.
  const ativo = useRef(true)
  useEffect(() => {
    ativo.current = true
    return () => {
      ativo.current = false
    }
  }, [])

  const atualizar = useCallback(() => setVersao((v) => v + 1), [])

  const comecarAMexer = useCallback((id: string) => {
    aCaminho.current.set(id, (aCaminho.current.get(id) ?? 0) + 1)
    mexidos.current.add(id)
  }, [])

  const terminarDeMexer = useCallback((id: string) => {
    const restantes = (aCaminho.current.get(id) ?? 1) - 1
    if (restantes > 0) aCaminho.current.set(id, restantes)
    else aCaminho.current.delete(id)
  }, [])

  /** Muda só as marcas da cópia que está no aparelho agora, sem trocá-la (CB-107, CB-108). */
  const marcarNoAparelho = useCallback(
    (id: string, marcas: MarcasDoLink) => {
      const atual = repo.porId(id)
      if (atual) repo.salvar(atual, marcas)
    },
    [repo],
  )

  const marcarForaDaNuvem = useCallback((id: string, motivo: string | null) => {
    setForaDaNuvem((atual) => {
      if (motivo === null && !atual.has(id)) return atual
      const novo = new Map(atual)
      if (motivo === null) novo.delete(id)
      else novo.set(id, motivo)
      return novo
    })
  }, [])

  // Se o paciente marcar numa aba e o nutricionista estiver com outra aberta, a lista se refaz.
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => {
      if (e.key !== null && chaveDoEvento(armazenamento, e.key) !== 'metanutri:acompanhamentos') return
      atualizar()
    }
    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar)
  }, [atualizar, armazenamento])

  const salvar = useCallback(
    async (acompanhamento: Acompanhamento) => {
      const { id } = acompanhamento
      const anterior = repo.porId(id)
      // A cópia do aparelho vem primeiro: é ela que fica se a nuvem não responder (CA-439).
      repo.salvar(acompanhamento)
      atualizar()
      if (!cliente) return null

      comecarAMexer(id)
      try {
        // A leitura pode estar mandando de novo uma mudança pendente deste link: esta, mais
        // nova, sai depois dela, para as duas não chegarem fora de ordem (CB-108).
        await lendo.current?.catch(() => undefined)
        if (!ativo.current) return null
        const resultado = await salvarLinkNaNuvem(cliente, acompanhamento, { jaEsteveNaNuvem: repo.estaNaNuvem(id), esperado: usuarioId })
        if (!ativo.current) return null
        if (resultado.tipo === 'salvo') {
          // O aparelho foi apagado (Apagar tudo) enquanto o link subia: ele sai da nuvem de novo.
          if (repo.porId(id) === null) {
            await removerAcompanhamentoDaNuvem(cliente, id, usuarioId)
            return null
          }
          marcarNoAparelho(id, { naNuvem: true, pendente: false })
          marcarForaDaNuvem(id, null)
          return null
        }
        if (resultado.tipo === 'sumiu') {
          // CB-107: apagado em outro aparelho. Não volta: sai daqui também.
          repo.remover(id)
          marcarForaDaNuvem(id, null)
          atualizar()
          return null
        }
        if (resultado.motivo === LIMITE_DE_LINKS) {
          // CA-442: nada fica pela metade. O aparelho volta ao que era antes.
          if (anterior) repo.salvar(anterior)
          else repo.remover(id)
          atualizar()
          marcarForaDaNuvem(id, anterior ? resultado.motivo : null)
          return resultado.motivo
        }
        // CB-108: a mudança fica pendente. A leitura não a desfaz e tenta de novo.
        marcarNoAparelho(id, { pendente: true })
        marcarForaDaNuvem(id, resultado.motivo)
        return resultado.motivo
      } finally {
        terminarDeMexer(id)
      }
    },
    [repo, cliente, usuarioId, atualizar, marcarForaDaNuvem, marcarNoAparelho, comecarAMexer, terminarDeMexer],
  )

  const remover = useCallback(
    async (id: string) => {
      // CA-440: a nuvem primeiro. Se ela falhar, o link continua nos dois lugares.
      if (cliente) {
        comecarAMexer(id)
        try {
          // Uma leitura subindo este link agora chegaria depois da remoção e o traria de volta.
          await lendo.current?.catch(() => undefined)
          if (!ativo.current) return null
          const motivo = await removerAcompanhamentoDaNuvem(cliente, id, usuarioId)
          if (!ativo.current) return null
          if (motivo !== null) return motivo
        } finally {
          terminarDeMexer(id)
        }
      }
      repo.remover(id)
      marcarForaDaNuvem(id, null)
      atualizar()
      return null
    },
    [repo, cliente, usuarioId, atualizar, marcarForaDaNuvem, comecarAMexer, terminarDeMexer],
  )

  const lerDaNuvem = useCallback((): Promise<void> => {
    if (!cliente) return Promise.resolve()
    if (lendo.current) return lendo.current

    const ler = async () => {
      mexidos.current = new Set(aCaminho.current.keys())
      const intocado = (id: string) => !mexidos.current.has(id)
      const leitura = await listarAcompanhamentosDaNuvem(cliente, usuarioId)
      if (!ativo.current) return
      if (leitura.tipo === 'falhou') {
        // CB-106. E sem saber o que está na nuvem, nada sai do aparelho.
        setAvisoNuvem(SEM_ATUALIZAR)
        return
      }
      setAvisoNuvem(null)

      const naNuvem = new Set(leitura.itens.map((a) => a.id))
      for (const daNuvem of leitura.itens) {
        if (!intocado(daNuvem.id)) continue
        const local = repo.porId(daNuvem.id)
        // CB-108: mudança daqui pendente não é desfeita; só as marcações do paciente vêm de lá.
        if (local && repo.estaPendente(daNuvem.id)) repo.salvar({ ...local, marcacoes: daNuvem.marcacoes }, { naNuvem: true })
        // CB-105: o mesmo link nos dois lugares: vale o que está na nuvem.
        else repo.salvar(daNuvem, { naNuvem: true })
      }

      // CB-107: já esteve na nuvem e sumiu de lá: foi apagado em outro aparelho. Sai daqui
      // também, mesmo com mudança pendente.
      for (const a of repo.listar()) if (!naNuvem.has(a.id) && intocado(a.id) && repo.estaNaNuvem(a.id)) repo.remover(a.id)
      atualizar()

      // D-105 e CB-108: sobe o que nunca esteve na nuvem e manda de novo o que ficou pendente.
      // O que não vai fica marcado com o motivo (CA-443).
      const motivos = new Map<string, string>()
      const paraMandar = repo.listar().filter((a) => !naNuvem.has(a.id) || repo.estaPendente(a.id))
      for (const { id } of paraMandar) {
        if (!ativo.current) return
        const atual = repo.porId(id)
        // Removido ou mexido enquanto os outros subiam: quem mexeu cuida da nuvem.
        if (atual === null || !intocado(id)) continue
        let motivo: string | null = null
        if (repo.estaPendente(id)) {
          const resultado = await salvarLinkNaNuvem(cliente, atual, { jaEsteveNaNuvem: repo.estaNaNuvem(id), esperado: usuarioId })
          if (!ativo.current) return
          if (resultado.tipo === 'sumiu') {
            repo.remover(id)
            continue
          }
          if (resultado.tipo === 'falhou') motivo = resultado.motivo
        } else {
          motivo = await subirAcompanhamento(cliente, atual, usuarioId)
          if (!ativo.current) return
        }
        if (motivo !== null) {
          motivos.set(id, motivo)
          continue
        }
        // O aparelho foi apagado (Apagar tudo) enquanto a linha subia: ela sai da nuvem de novo.
        if (repo.porId(id) === null) await removerAcompanhamentoDaNuvem(cliente, id, usuarioId)
        else if (intocado(id)) marcarNoAparelho(id, { naNuvem: true, pendente: false })
      }
      if (!ativo.current) return
      atualizar()

      const mexidosNaLeitura = [...mexidos.current]
      setForaDaNuvem((atual) => {
        const novo = new Map(motivos)
        for (const id of mexidosNaLeitura) {
          const motivo = atual.get(id)
          if (motivo !== undefined) novo.set(id, motivo)
        }
        return novo
      })
    }

    const leitura = ler().finally(() => {
      lendo.current = null
    })
    lendo.current = leitura
    return leitura
  }, [cliente, repo, usuarioId, atualizar, marcarNoAparelho])

  /**
   * A tela do paciente: com servidor, o link abre no aparelho dele. Sem, tudo continua
   * neste navegador. A cópia local é mantida nos dois casos: é ela que faz o app funcionar offline.
   */
  const fonte = useMemo(() => {
    const local = fonteLocal(repo)
    const remota = cliente ? fonteSupabase(cliente) : null

    return {
      naNuvem: remota !== null,
      porToken: async (token: string) => (remota ? ((await remota.porToken(token)) ?? repo.porToken(token)) : local.porToken(token)),
      salvar: async (acompanhamento: Acompanhamento) => {
        if (remota) await remota.salvar(acompanhamento)
        const salvo = await local.salvar(acompanhamento)
        atualizar()
        return salvo
      },
    }
  }, [repo, cliente, atualizar])

  const valor = useMemo<ValorAcompanhamentos>(
    () => ({
      repositorio: repo,
      fonte,
      acompanhamentos: repo.listar(),
      avisoArmazenamento: repo.aviso,
      salvar,
      remover,
      lerDaNuvem,
      avisoNuvem,
      foraDaNuvem,
    }),
    // versao força recalcular a lista depois de cada mudança
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repo, fonte, salvar, remover, lerDaNuvem, avisoNuvem, foraDaNuvem, versao],
  )

  return <ContextoAcompanhamentos.Provider value={valor}>{children}</ContextoAcompanhamentos.Provider>
}
