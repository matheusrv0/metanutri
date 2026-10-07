import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Acompanhamento } from '@/domain/acompanhamento.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import {
  fonteSupabase,
  listarAcompanhamentosDaNuvem,
  removerAcompanhamentoDaNuvem,
  salvarLinkNaNuvem,
  subirAcompanhamento,
  LIMITE_DE_LINKS,
  type ClienteMissoes,
} from '@/domain/fonteSupabase.ts'
import { criarRepositorioAcompanhamentos, fonteLocal, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { obterSupabase } from './supabase.ts'
import { ContextoAcompanhamentos, type ValorAcompanhamentos } from './contextoAcompanhamentos.ts'

/** CB-106: a leitura da nuvem falhou e a tela segue com a cópia do aparelho. */
const SEM_ATUALIZAR = 'Não consegui atualizar com a nuvem. Mostrando a cópia deste aparelho.'

function armazenamentoDoNavegador(): Armazenamento | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/**
 * Compartilha os acompanhamentos entre a tela do nutricionista e o link do paciente.
 *
 * Com conta (spec missoes-na-nuvem), o link vive na nuvem e o aparelho guarda uma cópia
 * para abrir sem internet. Sem servidor, tudo fica só no aparelho, como antes (CA-444).
 */
export function ProvedorAcompanhamentos({ children, repositorio }: { readonly children: ReactNode; readonly repositorio?: RepositorioAcompanhamentos }) {
  const [repo] = useState<RepositorioAcompanhamentos>(() => repositorio ?? criarRepositorioAcompanhamentos(armazenamentoDoNavegador()))
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

  /** CB-107: o link chegou à nuvem. Marca a cópia que está no aparelho agora, sem trocá-la. */
  const marcarQueEstaNaNuvem = useCallback(
    (id: string) => {
      const atual = repo.porId(id)
      if (atual) repo.salvar(atual, { naNuvem: true })
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
      if (e.key !== null && e.key !== 'metanutri:acompanhamentos') return
      atualizar()
    }
    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar)
  }, [atualizar])

  const salvar = useCallback(
    async (acompanhamento: Acompanhamento) => {
      const anterior = repo.porId(acompanhamento.id)
      // A cópia do aparelho vem primeiro: é ela que fica se a nuvem não responder (CA-439).
      repo.salvar(acompanhamento)
      atualizar()
      if (!cliente) return null

      comecarAMexer(acompanhamento.id)
      try {
        const motivo = await salvarLinkNaNuvem(cliente, acompanhamento)
        if (motivo === LIMITE_DE_LINKS) {
          // CA-442: nada fica pela metade. O aparelho volta ao que era antes.
          if (anterior) repo.salvar(anterior)
          else repo.remover(acompanhamento.id)
          atualizar()
        }
        if (motivo === null) marcarQueEstaNaNuvem(acompanhamento.id)
        marcarForaDaNuvem(acompanhamento.id, motivo === LIMITE_DE_LINKS && anterior === null ? null : motivo)
        return motivo
      } finally {
        terminarDeMexer(acompanhamento.id)
      }
    },
    [repo, cliente, atualizar, marcarForaDaNuvem, marcarQueEstaNaNuvem, comecarAMexer, terminarDeMexer],
  )

  const remover = useCallback(
    async (id: string) => {
      // CA-440: a nuvem primeiro. Se ela falhar, o link continua nos dois lugares.
      if (cliente) {
        comecarAMexer(id)
        try {
          const motivo = await removerAcompanhamentoDaNuvem(cliente, id)
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
    [repo, cliente, atualizar, marcarForaDaNuvem, comecarAMexer, terminarDeMexer],
  )

  const lerDaNuvem = useCallback((): Promise<void> => {
    if (!cliente) return Promise.resolve()
    if (lendo.current) return lendo.current

    const ler = async () => {
      mexidos.current = new Set(aCaminho.current.keys())
      const leitura = await listarAcompanhamentosDaNuvem(cliente)
      if (leitura.tipo === 'sem-conta') return
      if (leitura.tipo === 'falhou') {
        setAvisoNuvem(SEM_ATUALIZAR)
        return
      }
      setAvisoNuvem(null)

      // CB-105: o mesmo link nos dois lugares: vale o que está na nuvem.
      const naNuvem = new Set(leitura.itens.map((a) => a.id))
      for (const a of leitura.itens) if (!mexidos.current.has(a.id)) repo.salvar(a, { naNuvem: true })

      // CB-107: já esteve na nuvem e sumiu de lá: foi apagado em outro aparelho. Sai daqui também.
      const soAqui = repo.listar().filter((a) => !naNuvem.has(a.id) && !mexidos.current.has(a.id))
      for (const a of soAqui) if (repo.estaNaNuvem(a.id)) repo.remover(a.id)
      atualizar()

      // D-105: sobe só o que nunca esteve na nuvem. O que não sobe fica marcado com o motivo (CA-443).
      const motivos = new Map<string, string>()
      for (const a of soAqui) {
        // Removido ou mexido enquanto os outros subiam: quem mexeu cuida da nuvem.
        if (mexidos.current.has(a.id) || repo.porId(a.id) === null) continue
        const motivo = await subirAcompanhamento(cliente, a)
        if (motivo === null) marcarQueEstaNaNuvem(a.id)
        else motivos.set(a.id, motivo)
      }
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
  }, [cliente, repo, atualizar, marcarQueEstaNaNuvem])

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
