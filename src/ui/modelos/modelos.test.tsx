import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { clonarPlano, criarRepositorioModelos } from '@/domain/modelos.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import type { Plano } from '@/domain/tipos.ts'
import { TelaPlano } from '../plano/TelaPlano.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

let n = 0
const ids = () => `id${++n}`

function planoComArroz(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  return adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 150 }, ids)
}

function Anfitriao() {
  const [plano, setPlano] = useState<Plano>(() => planoComArroz())
  return <TelaPlano plano={plano} aoAlterarPlano={setPlano} gerarId={ids} />
}

describe('Modelos de plano', () => {
  beforeEach(() => localStorage.clear())

  it('clonar troca todos os ids, para modelo e plano não se misturarem', () => {
    const original = planoComArroz()
    let c = 0
    const copia = clonarPlano(original, () => `novo${++c}`)
    expect(copia.refeicoes[0]?.id).not.toBe(original.refeicoes[0]?.id)
    expect(copia.refeicoes[2]?.opcoes.principal[0]?.id).not.toBe(original.refeicoes[2]?.opcoes.principal[0]?.id)
    expect(copia.refeicoes[2]?.opcoes.principal[0]?.alimentoId).toBe(3)
  })

  it('guarda e apaga no armazenamento', () => {
    const repo = criarRepositorioModelos(new MemoriaFalsa(), { gerarId: () => `m${++n}` })
    const salvo = repo.salvar({ nome: 'Emagrecimento 1600', descricao: 'Adulto', plano: planoComArroz() })
    expect(repo.listar()).toHaveLength(1)
    expect(repo.obter(salvo.id)?.nome).toBe('Emagrecimento 1600')
    repo.excluir(salvo.id)
    expect(repo.listar()).toEqual([])
  })

  it('salva o plano aberto como modelo e depois usa ele', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Modelos de plano' }))
    const janela = within(screen.getByRole('dialog', { name: 'Modelos de plano' }))
    await usuario.type(janela.getByLabelText('Nome do modelo'), 'Padrão da clínica')
    await usuario.click(janela.getByRole('button', { name: 'Salvar como modelo' }))

    const lista = within(janela.getByRole('list', { name: 'Modelos salvos' }))
    expect(lista.getByText('Padrão da clínica')).toBeInTheDocument()
    expect(lista.getByText(/6 refeições · 1 alimentos/)).toBeInTheDocument()

    await usuario.click(lista.getByRole('button', { name: 'Usar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome da refeição Almoço' })).toBeInTheDocument()
  })
})
