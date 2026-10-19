// Spec receitas-com-calculo, CB-276: nome e modo de preparo da receita com código aparecem como texto em toda tela
// (a lista e o editor, a linha do plano, a folha impressa e o "Meu plano" do paciente). Mesma conferência do CA-487.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarCasoVazio } from '@/domain/caso.ts'
import { copiarDieta, dietaDoPlano } from '@/domain/dietaDoLink.ts'
import { adicionarReceita, criarPlanoPadrao } from '@/domain/plano.ts'
import { CHAVE_RECEITAS, type Receita } from '@/domain/receitas.ts'
import { PANQUECA } from '@/domain/receitas.test-utils.ts'
import type { Plano, ReceitaDoPlano } from '@/domain/tipos.ts'
import { FolhaDieta } from '../ui/exportar/FolhaDieta.tsx'
import { MeuPlano } from '../ui/missoes/MeuPlano.tsx'
import { TelaPlano } from '../ui/plano/TelaPlano.tsx'
import { TelaReceitas } from '../ui/receitas/TelaReceitas.tsx'
import { cargaComoTexto, conferirSemInjecao, malicioso } from './xss.test-utils.ts'

const alerta = vi.fn()
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'alert').mockImplementation(alerta)
})
afterEach(() => expect(alerta).not.toHaveBeenCalled())

const COPIA: ReceitaDoPlano = { ...PANQUECA, nome: malicioso('nome'), preparo: malicioso('preparo') }

let n = 0
const ids = () => `id${++n}`

function planoComReceita(): Plano {
  const plano = criarPlanoPadrao(ids)
  const desjejum = plano.refeicoes[0]
  if (!desjejum) throw new Error('plano padrão mudou')
  return adicionarReceita(plano, desjejum.id, 'principal', { receita: COPIA, gramas: 120 }, ids)
}

describe('CB-276: receita com código aparece como texto', () => {
  it('a lista e o editor de receitas', async () => {
    const receita: Receita = { ...COPIA, id: 'r1', criadoEm: '2026-10-19T10:00:00.000Z', atualizadoEm: '2026-10-19T10:00:00.000Z' }
    localStorage.setItem(CHAVE_RECEITAS, JSON.stringify([receita]))
    render(<TelaReceitas />)
    cargaComoTexto('nome')
    conferirSemInjecao()
    await userEvent.setup().click(screen.getByRole('button', { name: `Editar ${receita.nome}` }))
    cargaComoTexto('nome')
    cargaComoTexto('preparo')
    conferirSemInjecao()
  })

  it('a linha do plano', () => {
    render(<TelaPlano plano={planoComReceita()} aoAlterarPlano={() => undefined} gerarId={ids} />)
    cargaComoTexto('nome')
    conferirSemInjecao()
  })

  it('a folha impressa', () => {
    render(<FolhaDieta caso={{ ...criarCasoVazio('c1'), nome: 'Maria' }} plano={planoComReceita()} opcoes={{ listaDeCompras: true, trocas: true }} />)
    cargaComoTexto('nome')
    cargaComoTexto('preparo')
    conferirSemInjecao()
  })

  it('o "Meu plano" do paciente', () => {
    const dieta = copiarDieta(dietaDoPlano(criarCasoVazio('c1'), planoComReceita()), '2026-10-19')
    render(<MeuPlano dieta={dieta} primeiroNome="Ana" />)
    cargaComoTexto('nome')
    cargaComoTexto('preparo')
    conferirSemInjecao()
  })
})
