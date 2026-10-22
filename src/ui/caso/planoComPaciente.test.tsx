// A etapa 1 de um plano com paciente (spec ficha-unica, D-340 a D-345, D-356, D-358; CA-1032, CA-1044, CA-1066,
// CA-1070, CA-1072).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { responder } from '@/domain/anamnese.ts'
import { nivelSugerido } from '@/domain/anamneseNoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { casoComFicha } from '@/domain/fichaNoPlano.ts'
import { criarPacienteVazio, type Paciente } from '@/domain/pacientes.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

const HOJE = '2026-10-21'
const fichaDe = (p: Partial<Paciente>): Paciente => ({ ...criarPacienteVazio('p1', '2026-10-01T00:00:00.000Z'), nome: 'João Teste', ...p })

function Anfitriao({ ficha, plano, pesoAnterior = null }: { readonly ficha: Partial<Paciente>; readonly plano?: Partial<Caso>; readonly pesoAnterior?: { pesoKg: number; data: string } | null }) {
  const [paciente, setPaciente] = useState<Paciente>(fichaDe(ficha))
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), pacienteId: 'p1', dataConsulta: HOJE, pesoKg: 72, estaturaCm: 175, ...plano })
  const comFicha = casoComFicha(caso, paciente, HOJE)
  return (
    <>
      <output data-testid="ficha">{JSON.stringify({ sexo: paciente.sexo, nascimento: paciente.nascimento, momento: paciente.momentoDeVida })}</output>
      <output data-testid="plano">{JSON.stringify({ condicao: caso.condicao })}</output>
      <TelaCaso
        caso={comFicha.caso}
        aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))}
        pacientes={[{ id: 'p1', nome: paciente.nome }]}
        aoVincularPaciente={(pacienteId) => setCaso((c) => ({ ...c, pacienteId }))}
        paciente={paciente}
        comFicha={comFicha}
        aoAlterarPaciente={(m) => setPaciente((p) => ({ ...p, ...m }))}
        aoAbrirFicha={() => undefined}
        pesoAnterior={pesoAnterior}
        sugestaoNivel={nivelSugerido(paciente.respostasAnamnese)}
      />
    </>
  )
}

const identificacao = () => within(screen.getByRole('heading', { name: 'Identificação' }).closest('[data-slot="card"]') as HTMLElement)
const lido = (id: string) => JSON.parse(screen.getByTestId(id).textContent ?? '{}') as Record<string, unknown>

describe('Etapa 1 com paciente (CA-1066)', () => {
  it('mostra o resumo da ficha, só de leitura, sem os campos que vêm dela', () => {
    render(<Anfitriao ficha={{ sexo: 'M', nascimento: '1991-03-10', restricoesMarcadas: ['leite'], restricoes: 'camarão', doencas: ['hipertensao'] }} />)
    const cartao = identificacao()
    expect(cartao.getByText('João Teste', { selector: 'p' })).toBeInTheDocument()
    expect(cartao.getByText('35 anos e 7 meses · Masculino')).toBeInTheDocument()
    expect(cartao.getByText('Restrições: leite e derivados, camarão')).toBeInTheDocument()
    expect(cartao.getByText('Doenças: hipertensão')).toBeInTheDocument()
    expect(cartao.getByRole('button', { name: 'Abrir a ficha' })).toBeInTheDocument()
    for (const rotulo of ['Nome do plano', 'Idade', 'Meses', 'Diagnóstico clínico', 'Ocupação']) expect(screen.queryByLabelText(rotulo)).not.toBeInTheDocument()
    for (const grupo of ['Sexo', 'Gestação ou lactação', 'Objetivo']) expect(screen.queryByRole('radiogroup', { name: grupo })).not.toBeInTheDocument()
    expect(cartao.getByLabelText('Data da consulta')).toHaveValue(HOJE)
  })

  it('a gestante aparece com as semanas da data da consulta', () => {
    render(<Anfitriao ficha={{ sexo: 'F', nascimento: '1998-01-10', momentoDeVida: { tipo: 'gestante', semanas: 20, semanasEm: '2026-09-23', pesoPreGestacionalKg: 60 } }} />)
    expect(identificacao().getByText('28 anos e 9 meses · Feminino · Gestante, 24 semanas')).toBeInTheDocument()
  })

  it('CA-1032: o que falta na ficha se preenche aqui e vai para a ficha', async () => {
    render(<Anfitriao ficha={{}} />)
    const usuario = userEvent.setup()
    await usuario.click(identificacao().getByRole('radio', { name: 'Masculino' }))
    expect(lido('ficha')['sexo']).toBe('M')
    await usuario.type(identificacao().getByLabelText('Data de nascimento'), '1991-03-10')
    expect(lido('ficha')['nascimento']).toBe('1991-03-10')
    expect(identificacao().getByText('35 anos e 7 meses · Masculino')).toBeInTheDocument()
  })
})

describe('Plano antigo com outra condição (CA-1044)', () => {
  const plano = { dataConsulta: '2026-09-10', condicao: { tipo: 'gestante' as const, semanasGestacao: 20, pesoPreGestacionalKg: 58 } }

  it('"Levar para a ficha" grava a gestação na ficha e tira o aviso', async () => {
    render(<Anfitriao ficha={{ sexo: 'F', nascimento: '1998-01-10' }} plano={plano} />)
    const usuario = userEvent.setup()
    expect(identificacao().getByText(/Este plano gravou “Gestante, 20 semanas”, e a ficha não marca gestação nem lactação/)).toBeInTheDocument()
    await usuario.click(identificacao().getByRole('button', { name: 'Levar para a ficha' }))
    expect(lido('ficha')['momento']).toEqual({ tipo: 'gestante', semanas: 20, semanasEm: '2026-09-10', pesoPreGestacionalKg: 58 })
    expect(lido('plano')['condicao']).toEqual({ tipo: 'nenhuma' })
    expect(identificacao().queryByRole('button', { name: 'Levar para a ficha' })).not.toBeInTheDocument()
    expect(identificacao().getByText(/Gestante, 20 semanas/)).toBeInTheDocument()
  })

  it('"Usar a da ficha" tira a gestação do plano', async () => {
    render(<Anfitriao ficha={{ sexo: 'F', nascimento: '1998-01-10' }} plano={plano} />)
    await userEvent.setup().click(identificacao().getByRole('button', { name: 'Usar a da ficha' }))
    expect(lido('plano')['condicao']).toEqual({ tipo: 'nenhuma' })
    expect(lido('ficha')['momento']).toBeNull()
  })
})

describe('A anamnese e o retorno na etapa 1 (CA-1070, CA-1072)', () => {
  it('CA-1070: o nível sugerido pela anamnese, com "Usar"', async () => {
    let respostas = responder([], { id: 'atividade-pratica', texto: 'Prática de exercício' }, 'atividade', 'Sim')
    respostas = responder(respostas, { id: 'atividade-tipo', texto: 'Tipo de atividade' }, 'atividade', 'Musculação')
    respostas = responder(respostas, { id: 'atividade-vezes', texto: 'Vezes por semana' }, 'atividade', '4')
    respostas = responder(respostas, { id: 'atividade-minutos', texto: 'Minutos por vez' }, 'atividade', '60')
    render(<Anfitriao ficha={{ sexo: 'M', nascimento: '1991-03-10', respostasAnamnese: respostas }} />)
    expect(screen.getByText('Na anamnese: musculação, 4 vezes por semana, 60 minutos por vez. Sugere Moderadamente ativo.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar o nível sugerido' }))
    expect(screen.getByRole('radio', { name: 'Moderadamente ativo (1,55)' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('button', { name: 'Usar o nível sugerido' })).not.toBeInTheDocument()
  })

  it('CA-1072: o peso do retorno mostra a última medida', () => {
    render(<Anfitriao ficha={{ sexo: 'M', nascimento: '1991-03-10' }} plano={{ pesoKg: null }} pesoAnterior={{ pesoKg: 82, data: '2026-09-10' }} />)
    expect(screen.getByLabelText('Peso')).toHaveValue('')
    expect(screen.getByLabelText('Peso')).toHaveAccessibleDescription('Última: 82 kg em 10/09/2026.')
  })
})
