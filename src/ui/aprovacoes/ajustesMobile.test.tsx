// Spec ajustes-mobile (auditoria de 29/10/2026): Aprovações no celular. O jsdom não aplica largura; aqui se confere a
// estrutura, e o e2e `servidor-falso/ajustes-mobile-admin.spec.ts` mede no navegador.
import { render, screen } from '@testing-library/react'
import type { CrnParaConferir, PedidoParaAprovar } from '@/domain/aprovacoes.ts'
import { AbaCrn } from './AbaCrn.tsx'
import { AbaEstudantes } from './AbaEstudantes.tsx'

const EMAIL_LONGO = 'maria.aparecida.dos.santos.oliveira.nutricao2026@aluno.universidadefederal.edu.br'
const classes = (el: Element) => el.className.split(/\s+/)

const pedido: PedidoParaAprovar = {
  id: 'p1',
  usuario: 'u1',
  nome: 'Aleksandra Wiśniewska-Kowalczyk',
  email: EMAIL_LONGO,
  instituicao: 'UFRN',
  matricula: '2023123456789012345678',
  periodo: 5,
  formatura: '2028-12',
  enviadoEm: '2026-10-20T12:00:00Z',
  arquivo: 'u1/comprovante.pdf',
}

const crn: CrnParaConferir = {
  usuario: 'c1',
  nome: 'Christopher Alexander Montgomery',
  email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
  crn: { regiao: 3, numero: '123456789/P' },
  contaCriadaEm: '2026-10-20T12:00:00Z',
  status: 'em_conferencia',
  decididoEm: null,
}

describe('Aprovações no celular (spec ajustes-mobile)', () => {
  it('M-004: a grade do celular tem uma coluna que encolhe, e o e-mail e a matrícula quebram em qualquer ponto', () => {
    render(<AbaEstudantes pedidos={[pedido]} decidirPedido={vi.fn()} abrirComprovante={vi.fn()} />)
    const aberto = screen.getByRole('region', { name: pedido.nome })
    expect(classes(aberto)).toContain('min-w-0')
    expect(classes(aberto.parentElement as HTMLElement)).toContain('grid-cols-[minmax(0,1fr)]')
    expect(classes(screen.getByText(EMAIL_LONGO))).toContain('[overflow-wrap:anywhere]')
    expect(classes(screen.getByText(pedido.matricula))).toContain('[overflow-wrap:anywhere]')
  })

  it('M-017: o e-mail do CRN quebra dentro da coluna do nome, e o número não encolhe', () => {
    render(<AbaCrn crns={[crn]} decidirCrn={vi.fn()} />)
    expect(classes(screen.getByText(crn.email))).toContain('[overflow-wrap:anywhere]')
    expect(classes(screen.getByText(/123456789\/P/))).toContain('shrink-0')
  })
})
