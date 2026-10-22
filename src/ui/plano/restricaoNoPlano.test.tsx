// A restrição do paciente na etapa 2 (spec ficha-unica, D-353; CA-1076 e CA-1077).
import { render, screen, within } from '@testing-library/react'
import { comCuidadosDaFase, montarRestricoes, SEM_RESTRICOES } from '@/domain/restricoes.ts'
import { SUGESTOES_PADRAO } from '@/domain/sugestoes.ts'
import { ContextoRestricoes } from '../estado/contextoRestricoes.ts'
import { LinhaItem } from './LinhaItem.tsx'
import { SugestoesDaRefeicao } from './SugestoesDaRefeicao.tsx'

const QUEIJO_MINAS = 461
const CAMARAO_COZIDO = 284
const LEITE_INTEGRAL = 458
const BANANA = 182

const restricoes = (marcadas: string[], texto = '') => montarRestricoes({ marcadas, texto, doencas: [], naoGosta: '' })

describe('A linha do plano avisa a restrição (CA-1077)', () => {
  const linha = (alimentoId: number, valor = restricoes(['leite'])) =>
    render(
      <ContextoRestricoes.Provider value={valor}>
        <ul>
          <LinhaItem item={{ id: 'i1', alimentoId, gramas: 30 }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
        </ul>
      </ContextoRestricoes.Provider>,
    )

  it('queijo com alergia a leite', () => {
    linha(QUEIJO_MINAS)
    expect(screen.getByText('Alergia: leite e derivados')).toBeInTheDocument()
  })

  it('camarão escrito em Outros alimentos que não come', () => {
    linha(CAMARAO_COZIDO, restricoes([], 'camarão'))
    expect(screen.getByText('Não come: camarão')).toBeInTheDocument()
  })

  it('a receita avisa pelo ingrediente', () => {
    const item = {
      id: 'r1',
      alimentoId: 0,
      gramas: 300,
      receita: {
        origemId: 'x',
        nome: 'Vitamina de banana',
        ingredientes: [
          { alimentoId: BANANA, gramas: 100 },
          { alimentoId: LEITE_INTEGRAL, gramas: 200 },
        ],
        porcoes: 1,
        nomeDaPorcao: 'copo',
        pesoProntoG: null,
        preparo: '',
      },
    }
    render(
      <ContextoRestricoes.Provider value={restricoes(['lactose'])}>
        <ul>
          <LinhaItem item={item} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
        </ul>
      </ContextoRestricoes.Provider>,
    )
    expect(screen.getByText('Intolerância: lactose')).toBeInTheDocument()
  })

  it('sem restrição, nenhum aviso', () => {
    render(
      <ul>
        <LinhaItem item={{ id: 'i1', alimentoId: QUEIJO_MINAS, gramas: 30 }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
      </ul>,
    )
    expect(screen.queryByText(/Alergia|Intolerância|Não come/)).not.toBeInTheDocument()
  })
})

describe('As sugestões da refeição tiram o alimento restrito (CA-1076)', () => {
  const sugestoes = (valor = restricoes(['ovo'])) =>
    render(
      <ContextoRestricoes.Provider value={valor}>
        <SugestoesDaRefeicao tipo="desjejum" sugestoes={SUGESTOES_PADRAO.desjejum} aoEscolher={vi.fn()} />
      </ContextoRestricoes.Provider>,
    )

  it('com alergia a ovo, o ovo cozido não aparece no café da manhã', () => {
    sugestoes()
    const lista = within(screen.getByRole('region', { name: 'Sugestões para o café da manhã' }))
    expect(lista.queryByRole('button', { name: /Ovo/ })).not.toBeInTheDocument()
    expect(lista.getByRole('button', { name: /Mamão/ })).toBeInTheDocument()
  })

  it('sem restrição, o ovo aparece', () => {
    sugestoes(restricoes([]))
    expect(screen.getByRole('button', { name: /Ovo/ })).toBeInTheDocument()
  })
})

describe('Gestação sem fígado na linha e nas sugestões (spec sugestoes-com-criterio, correção A, D-442)', () => {
  const GESTANTE = comCuidadosDaFase(SEM_RESTRICOES, { condicao: { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 }, idadeAnos: 28 })
  const FIGADO_GRELHADO = 356

  it('CA-1251: a linha com fígado avisa a gestante', () => {
    render(
      <ContextoRestricoes.Provider value={GESTANTE}>
        <ul>
          <LinhaItem item={{ id: 'i1', alimentoId: FIGADO_GRELHADO, gramas: 100 }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
        </ul>
      </ContextoRestricoes.Provider>,
    )
    expect(screen.getByText('Na gestação, evite fígado: o excesso de vitamina A (retinol) faz mal ao bebê.')).toBeInTheDocument()
  })

  it('CA-1252: o café não aparece no café da manhã da criança de 6 anos, e a linha com café avisa', () => {
    const crianca = comCuidadosDaFase(SEM_RESTRICOES, { condicao: { tipo: 'nenhuma' }, idadeAnos: 6 })
    render(
      <ContextoRestricoes.Provider value={crianca}>
        <SugestoesDaRefeicao tipo="desjejum" sugestoes={SUGESTOES_PADRAO.desjejum} aoEscolher={vi.fn()} />
        <ul>
          <LinhaItem item={{ id: 'i1', alimentoId: 471, gramas: 50 }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
        </ul>
      </ContextoRestricoes.Provider>,
    )
    const lista = within(screen.getByRole('region', { name: 'Sugestões para o café da manhã' }))
    expect(lista.queryByRole('button', { name: /Café/ })).not.toBeInTheDocument()
    expect(lista.getByRole('button', { name: /Pão/ })).toBeInTheDocument()
    expect(screen.getByText('Café, chá preto ou mate e refrigerante com cafeína não são indicados para crianças.')).toBeInTheDocument()
  })

  it('CA-1250: o fígado posto na lista do almoço não aparece nas sugestões da gestante', () => {
    render(
      <ContextoRestricoes.Provider value={GESTANTE}>
        <SugestoesDaRefeicao tipo="almoco" sugestoes={[{ alimentoId: FIGADO_GRELHADO, gramas: 100 }, ...SUGESTOES_PADRAO.almoco]} aoEscolher={vi.fn()} />
      </ContextoRestricoes.Provider>,
    )
    const lista = within(screen.getByRole('region', { name: 'Sugestões para o almoço' }))
    expect(lista.queryByRole('button', { name: /fígado/ })).not.toBeInTheDocument()
    expect(lista.getByRole('button', { name: /Arroz/ })).toBeInTheDocument()
  })
})
