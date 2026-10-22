// CA-1179 e CA-1180 (spec textos-e-promessas, D-405 e D-406): o que Preços promete existe no código, e nada do que não
// existe é prometido. Cada recurso de `RECURSOS_EM_TODOS_OS_PLANOS` tem uma prova aqui; o `Record` faz um recurso novo
// sem prova deixar de compilar.
import { render, screen } from '@testing-library/react'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { sugerirParaCobrir } from '@/domain/cobrir.ts'
import { comparativoDosPlanos, PLANOS, RECURSOS_EM_TODOS_OS_PLANOS, type IdRecurso } from '@/domain/conta.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { missoesDoPlano } from '@/domain/missoes.ts'
import { gravarPerfil, PERFIL_VAZIO } from '@/domain/perfil.ts'
import { criarAconselhamento } from '@/export/aconselhamento-docx.ts'
import { criarMemorial } from '@/export/memorial-docx.ts'
import { dadosEstruturados } from '@/seo/cabecalho.ts'
import { armazenamentoLocal } from '@/ui/estado/armazenamentoLocal.ts'
import { FolhaDieta } from '@/ui/exportar/FolhaDieta.tsx'
import { lerRota } from '@/ui/navegacao.ts'

let n = 0
const exemplo = () => criarExemplo(() => `id${++n}`, '2026-10-21')
const texto = (id: IdRecurso) => RECURSOS_EM_TODOS_OS_PLANOS.find((r) => r.id === id)?.texto ?? ''

const PROVAS: Readonly<Record<IdRecurso, () => void>> = {
  adequacao: () => {
    const vitaminasEMinerais = MICRONUTRIENTES_ADEQUACAO.filter((chave) => chave !== 'fibra_g').length
    expect(texto('adequacao')).toContain(`${vitaminasEMinerais} vitaminas e minerais e da fibra`)
    expect(MICRONUTRIENTES_ADEQUACAO).toContain('fibra_g')
    expect(sugerirParaCobrir).toBeTypeOf('function')
  },
  adesao: () => {
    expect(lerRota('#/adesao')).toEqual({ tela: 'adesao' })
    expect(lerRota('#/missoes/abc')).toEqual({ tela: 'missoes', token: 'abc' })
    expect(missoesDoPlano(exemplo().plano).length).toBeGreaterThan(0)
  },
  documentos: () => {
    const { caso, plano } = exemplo()
    render(<FolhaDieta caso={caso} plano={plano} />)
    expect(screen.getByRole('heading', { name: 'Plano alimentar' })).toBeInTheDocument()
    expect(criarAconselhamento).toBeTypeOf('function')
    expect(criarMemorial).toBeTypeOf('function')
  },
  logotipo: () => {
    // Configurações grava o logotipo no perfil de qualquer conta; o plano impresso o usa, sem olhar a assinatura.
    const logotipo = 'data:image/png;base64,iVBORw0KGgo='
    gravarPerfil(armazenamentoLocal(), { ...PERFIL_VAZIO, logo: logotipo })
    const { caso, plano } = exemplo()
    const { container } = render(<FolhaDieta caso={caso} plano={plano} />)
    expect(container.querySelector(`img[src="${logotipo}"]`)).not.toBeNull()
  },
  'alimentos-proprios': () => {
    expect(lerRota('#/produtos')).toEqual({ tela: 'produtos' })
    expect(lerRota('#/receitas')).toEqual({ tela: 'receitas' })
  },
}

beforeEach(() => localStorage.clear())

describe('CA-1179: cada recurso prometido em todas as assinaturas existe', () => {
  it.each(RECURSOS_EM_TODOS_OS_PLANOS.map((r) => [r.id, r.texto] as const))('%s: %s', (id) => {
    PROVAS[id]()
  })

  it('a tabela de Preços marca os recursos de todas nas três colunas', () => {
    const linhas = comparativoDosPlanos()
    for (const recurso of RECURSOS_EM_TODOS_OS_PLANOS) {
      expect(linhas.find((l) => l.rotulo === recurso.texto)?.valores).toEqual([true, true, true])
    }
  })
})

/** O que não existe hoje (decisão 8 do coordenador e D-405): multiusuário, WhatsApp, relatórios e diferenças falsas. */
const NAO_EXISTE =
  /mais de um nutricionista na mesma conta|até 4 nutricionistas|nutricionista extra|pacientes compartilhados|painel do gestor|whatsapp|relatório|modelos? (próprios )?de documento|painel de micros|histórico de evolução|marca metanutri no pdf|seu logo nos|quem está sumindo|preceptor revisa|sem internet|offline/i

describe('CA-1180: nenhuma assinatura promete o que não existe', () => {
  it('nem no resumo, nem nos recursos, nem nos de todas', () => {
    for (const plano of PLANOS) expect([plano.resumo, ...plano.recursos].join(' · '), plano.id).not.toMatch(NAO_EXISTE)
    expect(RECURSOS_EM_TODOS_OS_PLANOS.map((r) => r.texto).join(' · ')).not.toMatch(NAO_EXISTE)
  })

  it('nem na tabela de Preços, que não tem linha de suporte', () => {
    const linhas = comparativoDosPlanos()
    expect(linhas.map((l) => `${l.rotulo} ${l.detalhe ?? ''} ${l.valores.join(' ')}`).join(' · ')).not.toMatch(NAO_EXISTE)
    expect(linhas.map((l) => l.rotulo)).not.toContain('Suporte')
  })

  it('nem nos dados estruturados da busca, que não anunciam preço da Clínica', () => {
    const json = JSON.stringify(dadosEstruturados())
    expect(json).not.toMatch(NAO_EXISTE)
    expect(json).not.toContain('Clínica')
  })

  it('CA-1181: o Free tem a Adesão (está nos recursos de todas), e o Estudante é para casos de estudo e estágio supervisionado', () => {
    expect(RECURSOS_EM_TODOS_OS_PLANOS.map((r) => r.id)).toContain('adesao')
    expect(PLANOS.find((p) => p.id === 'estudante')?.resumo).toBe('Para casos de estudo e estágio supervisionado. Uso não comercial.')
  })
})
