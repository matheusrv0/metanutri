// Spec integracao-rodada-1910, D-311 e D-312: campos de texto com letra de 16 px e 44 px abaixo de 640 px, e 40 px com
// letra de 14 px a partir de 640 px. O jsdom não aplica a largura da tela; aqui se confere a regra nas classes, e o
// e2e `campos-no-celular.spec.ts` mede no navegador (CA-979).
import { render, screen } from '@testing-library/react'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Select, SelectTrigger, SelectValue } from '@ds/componentes/forms/select.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { TelaAlimentos } from '@/ui/alimentos/TelaAlimentos.tsx'
import { CAIXA } from '@/ui/pagamento/estiloDaCaixa.ts'
import { CampoCodigo } from '@/ui/publico/conta/CampoCodigo.tsx'
import { CampoCrn } from '@/ui/publico/conta/CampoCrn.tsx'

const classes = (el: Element) => el.className.split(/\s+/)
const CELULAR_E_COMPUTADOR = ['h-11', 'text-base', 'sm:h-10', 'sm:text-sm']

describe('campos de texto no celular (spec integracao-rodada-1910)', () => {
  it('CA-975 e CA-976: o Input tem 44 px e letra de 16 px no celular, e 40 px com letra de 14 px a partir de 640 px', () => {
    render(<Input aria-label="Nome" />)
    const campo = screen.getByRole('textbox', { name: 'Nome' })
    expect(classes(campo)).toEqual(expect.arrayContaining(CELULAR_E_COMPUTADOR))
    expect(classes(campo)).not.toContain('h-10')
    expect(classes(campo)).not.toContain('text-sm')
  })

  it('CA-975 e CA-976: a lista de escolha (SelectTrigger) segue o Input', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Nome da porção">
          <SelectValue placeholder="Escolha" />
        </SelectTrigger>
      </Select>,
    )
    const lista = screen.getByRole('combobox', { name: 'Nome da porção' })
    expect(classes(lista)).toEqual(expect.arrayContaining(CELULAR_E_COMPUTADOR))
    expect(classes(lista)).not.toContain('h-9')
  })

  it('CA-975 e CA-976: a caixa de texto tem letra de 16 px no celular e 14 px a partir de 640 px', () => {
    render(<Textarea aria-label="Orientações" />)
    const caixa = screen.getByRole('textbox', { name: 'Orientações' })
    expect(classes(caixa)).toEqual(expect.arrayContaining(['text-base', 'sm:text-sm']))
    expect(classes(caixa)).not.toContain('text-sm')
  })

  it('CA-977: a região do CRN, lista nativa, tem 44 px e letra de 16 px no celular, como o número ao lado', () => {
    render(<CampoCrn id="crn" regiao={null} numero="" aoMudar={() => {}} />)
    const regiao = screen.getByRole('combobox', { name: 'Região do CRN' })
    expect(classes(regiao)).toEqual(expect.arrayContaining(CELULAR_E_COMPUTADOR))
  })

  it('CA-977: os filtros de Alimentos, listas nativas, têm letra de 16 px no celular', () => {
    render(<TelaAlimentos />)
    for (const id of ['filtro-grupo', 'filtro-ordem', 'filtro-completude']) {
      const lista = document.getElementById(id)
      expect(lista, id).not.toBeNull()
      if (lista) expect(classes(lista)).toEqual(expect.arrayContaining(['h-11', 'text-base', 'sm:text-sm']))
    }
  })

  it('CA-978: o campo do código fica com 48 px e letra de 20 px em toda largura', () => {
    render(<CampoCodigo id="codigo" valor="" aoMudar={() => {}} />)
    const campo = screen.getByRole('textbox', { name: 'Código de 8 dígitos' })
    expect(classes(campo)).toEqual(expect.arrayContaining(['h-12', 'sm:h-12', 'text-xl', 'sm:text-xl']))
  })

  it('CA-978: a busca de Alimentos fica com 44 px em toda largura', () => {
    render(<TelaAlimentos />)
    const busca = screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' })
    expect(classes(busca)).toEqual(expect.arrayContaining(['h-11', 'sm:h-11']))
  })

  it('CA-978 e D-313: a caixa do formulário do cartão fica com 48 px em toda largura e letra de 14 px', () => {
    expect(CAIXA.split(/\s+/)).toEqual(expect.arrayContaining(['h-12', 'sm:h-12', 'text-sm']))
  })
})
