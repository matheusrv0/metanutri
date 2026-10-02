import { render, screen, within } from '@testing-library/react'
import { conta } from '@/domain/negocio.test-utils.ts'
import { FALHA_AO_LER_NEGOCIO } from '../estado/usarNegocio.ts'
import { dadosFalsos, negocioFalso } from './negocioFalso.test-utils.ts'
import { TelaNegocio, URL_MERCADO_PAGO } from './TelaNegocio.tsx'

const espacos = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')

describe('TelaNegocio (spec painel-do-dono)', () => {
  it('CA-345: quatro cartões, nesta ordem, com a receita em destaque', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const resumo = screen.getByRole('region', { name: 'Resumo do negócio' })
    const texto = resumo.textContent ?? ''
    const posicoes = ['Receita por mês', 'Assinaturas ativas', 'Contas', 'Preço de fundador'].map((r) => texto.indexOf(r))
    expect(posicoes.every((p) => p >= 0)).toBe(true)
    expect([...posicoes].sort((x, y) => x - y)).toEqual(posicoes)
    expect(within(resumo).getByText(/^R\$\s89,82$/).closest('div')?.className).toContain('bg-surfacebrand')
  })

  it('CA-346 a CA-349: os números de cada cartão', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const resumo = within(screen.getByRole('region', { name: 'Resumo do negócio' }))
    expect(resumo.getByText(/^\+R\$\s24,92 em 30 dias$/)).toBeInTheDocument()
    expect(resumo.getByText('2')).toBeInTheDocument()
    expect(resumo.getByText('50% das contas pagam')).toBeInTheDocument()
    expect(resumo.getByText('4')).toBeInTheDocument()
    expect(resumo.getByText('+4 em 30 dias')).toBeInTheDocument()
    expect(resumo.getByText('2 de 200')).toBeInTheDocument()
    expect(resumo.getByText('198 vagas com preço travado para sempre')).toBeInTheDocument()
    expect(resumo.getByRole('progressbar', { name: '2 de 200 vagas usadas' })).toBeInTheDocument()
  })

  it('CA-350 e CA-351: uma barra por mês desde o histórico, com a dica, e só a do mês atual escrita', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const itens = within(screen.getByRole('list', { name: 'Receita por mês' })).getAllByRole('listitem')
    expect(itens.map((i) => espacos(i.getAttribute('aria-label')))).toEqual(['ago · R$ 64,90', 'set · R$ 64,90', 'out · R$ 89,82'])
    expect(within(itens[2] as HTMLElement).getAllByText(/R\$\s89,82/)).toHaveLength(2)
    expect(within(itens[0] as HTMLElement).getAllByText(/R\$\s64,90/)).toHaveLength(1)
  })

  it('CA-352: assinaturas por plano, da que rende mais, com a linha de total', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const cartao = screen.getByRole('region', { name: 'Assinaturas por plano' })
    const texto = espacos(cartao.textContent)
    expect(texto.indexOf('mensal · R$ 64,90')).toBeLessThan(texto.indexOf('anual · R$ 299,00'))
    expect(within(cartao).getByText('2 ativas')).toBeInTheDocument()
    expect(texto).toContain('R$ 24,92')
    expect(within(cartao).getAllByRole('progressbar')).toHaveLength(2)
  })

  it('CA-353: selo só para o caso que existe', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const cartao = within(screen.getByRole('region', { name: 'Assinaturas por plano' }))
    expect(cartao.getByText('1 com pagamento pendente')).toBeInTheDocument()
    expect(cartao.queryByText(/pausada/)).toBeNull()
    expect(cartao.queryByText(/em 30 dias/)).toBeNull()
  })

  it('CB-80: sem assinatura paga', () => {
    render(<TelaNegocio negocio={negocioFalso({ dados: dadosFalsos({ contas: [conta('x')], historico: [] }) })} />)
    expect(screen.getByText('Nenhuma assinatura paga ainda.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Resumo do negócio' })).getByText(/^R\$\s0,00$/)).toBeInTheDocument()
    const itens = within(screen.getByRole('list', { name: 'Receita por mês' })).getAllByRole('listitem')
    expect(itens.map((i) => espacos(i.getAttribute('aria-label')))).toEqual(['out · R$ 0,00'])
  })

  it('CA-354 e CA-355: o funil com a parte sobre quem criou conta, e o uso', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const cartao = screen.getByRole('region', { name: 'Quem chegou nos últimos 30 dias' })
    const etapas = within(within(cartao).getByRole('list', { name: 'Etapas' })).getAllByRole('listitem')
    expect(etapas.map((e) => espacos(e.textContent))).toEqual([
      '4criaram conta',
      '4confirmaram o e-mail · 100%',
      '3foram verificadas · 75%',
      '2assinaram um plano pago · 50%',
    ])
    expect(espacos(cartao.textContent)).toContain('Links de missões criados em 30 dias58')
    expect(espacos(cartao.textContent)).toContain('Contas que atualizaram a cópia na nuvem em 30 dias112')
  })

  it('primeira leitura em andamento: avisa que está lendo', () => {
    render(<TelaNegocio negocio={negocioFalso({ dados: null, carregando: true })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Lendo os números…')
  })

  it('CB-78: sem números e com erro, só o aviso', () => {
    render(<TelaNegocio negocio={negocioFalso({ dados: null, erro: FALHA_AO_LER_NEGOCIO })} />)
    expect(screen.getByRole('alert')).toHaveTextContent(FALHA_AO_LER_NEGOCIO)
    expect(screen.queryByRole('region', { name: 'Resumo do negócio' })).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('CB-79: com erro e números anteriores, os dois aparecem', () => {
    render(<TelaNegocio negocio={negocioFalso({ erro: FALHA_AO_LER_NEGOCIO })} />)
    expect(screen.getByRole('alert')).toHaveTextContent(FALHA_AO_LER_NEGOCIO)
    expect(screen.getByRole('region', { name: 'Resumo do negócio' })).toBeInTheDocument()
  })

  it('CA-364: o rodapé diz o que não aparece e leva ao Mercado Pago em outra aba', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    expect(screen.getByText('Planos e pacientes ficam no aparelho de cada nutricionista e não aparecem aqui.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Abrir o Mercado Pago' })
    expect(link).toHaveAttribute('href', URL_MERCADO_PAGO)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('os "30 dias" contam da hora da leitura, não do relógio', () => {
    // Lido em 30/11: as contas de setembro já não são novas.
    render(<TelaNegocio negocio={negocioFalso({ dados: dadosFalsos({ lidoEm: new Date('2026-11-30T15:00:00Z') }) })} />)
    expect(within(screen.getByRole('region', { name: 'Resumo do negócio' })).getByText('+0 em 30 dias')).toBeInTheDocument()
  })
})
