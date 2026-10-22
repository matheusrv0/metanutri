// O plano lê a ficha (spec ficha-unica, D-340 a D-344, D-358; CA-1030 a CA-1035, CA-1041 a CA-1044, CA-1072).
import { calcularAdequacao } from './adequacao.ts'
import { criarCasoVazio } from './caso.ts'
import { calcularEnergia } from './energia.ts'
import { casoComFicha, pesoAnterior } from './fichaNoPlano.ts'
import { criarPacienteVazio, type Paciente } from './pacientes.ts'
import { totaisDoPlano } from './totais.ts'
import { criarPlanoPadrao } from './plano.ts'
import { buscarAlimento } from './tabelas.ts'
import type { Caso } from './tipos.ts'

const HOJE = '2026-10-21'
const ficha = (p: Partial<Paciente> = {}): Paciente => ({ ...criarPacienteVazio('p1', '2026-10-01T00:00:00.000Z'), nome: 'Maria Teste', ...p })
const plano = (c: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), pacienteId: 'p1', ...c })

describe('Uma fonte por dado (D-340, D-341)', () => {
  it('CA-1030: sexo da ficha e idade na data da consulta', () => {
    const r = casoComFicha(plano({ dataConsulta: '2026-10-21', sexo: 'F', idadeAnos: 20 }), ficha({ sexo: 'M', nascimento: '1991-03-10' }), HOJE)
    expect(r.caso).toMatchObject({ sexo: 'M', idadeAnos: 35, idadeMesesAdicionais: 7 })
    expect(r.faltaNaFicha).toEqual([])
  })

  it('CA-1030: o plano antigo fica com a idade daquela consulta', () => {
    const r = casoComFicha(plano({ dataConsulta: '2025-10-21' }), ficha({ sexo: 'M', nascimento: '1991-03-10' }), HOJE)
    expect(r.caso.idadeAnos).toBe(34)
  })

  it('CA-1031: plano sem data da consulta usa hoje', () => {
    const r = casoComFicha(plano({ dataConsulta: null }), ficha({ sexo: 'M', nascimento: '1991-03-10' }), HOJE)
    expect(r.caso.idadeAnos).toBe(35)
    expect(r.dia).toBe(HOJE)
  })

  it('CA-1032: sem sexo ou nascimento na ficha, vale o gravado no plano e a falta é dita', () => {
    const r = casoComFicha(plano({ dataConsulta: HOJE, sexo: 'F', idadeAnos: 28, idadeMesesAdicionais: 2 }), ficha(), HOJE)
    expect(r.caso).toMatchObject({ sexo: 'F', idadeAnos: 28, idadeMesesAdicionais: 2 })
    expect(r.faltaNaFicha).toEqual(['sexo', 'nascimento'])
  })

  it('CA-1035: o nome, a ocupação e o diagnóstico vêm da ficha; vazios, vale o do plano', () => {
    const comTudo = casoComFicha(
      plano({ nome: 'Maria (cópia)', ocupacao: 'Estudante', diagnosticoClinico: 'Eutrofia' }),
      ficha({ nome: 'Maria Souza', ocupacao: 'Professora', doencas: ['hipertensao'], condicoesClinicas: '' }),
      HOJE,
    )
    expect(comTudo.caso).toMatchObject({ nome: 'Maria Souza', ocupacao: 'Professora', diagnosticoClinico: 'Hipertensão.' })
    const fichaVazia = casoComFicha(plano({ nome: 'Plano antigo', ocupacao: 'Estudante', diagnosticoClinico: 'Eutrofia' }), ficha({ nome: ' ' }), HOJE)
    expect(fichaVazia.caso).toMatchObject({ nome: 'Plano antigo', ocupacao: 'Estudante', diagnosticoClinico: 'Eutrofia' })
  })

  it('plano sem paciente fica como está (D-366)', () => {
    const caso = { ...criarCasoVazio('c1'), sexo: 'F' as const, idadeAnos: 28 }
    const r = casoComFicha(caso, null, HOJE)
    expect(r.caso).toBe(caso)
    expect(r.comPaciente).toBe(false)
  })
})

describe('Gestação e lactação na data da consulta (D-343)', () => {
  const gestante = ficha({ sexo: 'F', nascimento: '1998-01-10', momentoDeVida: { tipo: 'gestante', semanas: 24, semanasEm: '2026-10-21', pesoPreGestacionalKg: 60 } })

  it('CA-1041: a DRI e a energia de gestante passam a valer', () => {
    const caso = plano({ dataConsulta: '2026-10-21', pesoKg: 66, estaturaCm: 165, energia: { fator: 1.37, formula: 'mifflin', getManual: null } })
    const r = casoComFicha(caso, gestante, HOJE)
    expect(r.caso.condicao).toEqual({ tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 })
    const adequacao = calcularAdequacao(totaisDoPlano(criarPlanoPadrao(() => 'x'), buscarAlimento), r.caso, { tipo: 'individual' })
    expect(adequacao.estagio?.gestante).toBe(true)
    expect(adequacao.linhas.find((l) => l.chave === 'ferro_mg')?.referencia.valor).toBe(27)
    const energia = calcularEnergia(r.caso, r.caso.energia)
    expect(energia.adicionais.map((a) => a.descricao)).toEqual(['Depósito de energia na gestação (eutrofia)'])
  })

  it('o retorno quatro semanas depois já usa 28 semanas', () => {
    expect(casoComFicha(plano({ dataConsulta: '2026-11-18' }), gestante, HOJE).caso.condicao).toMatchObject({ semanasGestacao: 28 })
  })

  it('CA-1042: acima de 42 semanas não é gestante e avisa para atualizar a ficha', () => {
    const r = casoComFicha(plano({ dataConsulta: '2027-03-10' }), gestante, HOJE)
    expect(r.caso.condicao).toEqual({ tipo: 'nenhuma' })
    expect(r.avisos).toEqual(['Pela data informada na ficha, a gestação passou de 42 semanas. Atualize a ficha.'])
  })

  it('CA-1043: lactante que amamenta tem os meses da data da consulta', () => {
    const lactante = ficha({ sexo: 'F', nascimento: '1998-01-10', momentoDeVida: { tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: 'exclusiva' } })
    expect(casoComFicha(plano({ dataConsulta: '2026-10-21' }), lactante, HOJE).caso.condicao).toEqual({ tipo: 'lactante', mesesPosParto: 3 })
  })

  it('CA-1278: acima de 60 meses do parto não é lactante e avisa para atualizar a ficha (D-457)', () => {
    const antiga = ficha({ sexo: 'F', nascimento: '1990-01-10', momentoDeVida: { tipo: 'lactante', dataDoParto: '2020-01-15', amamentacao: 'mista' } })
    const r = casoComFicha(plano({ dataConsulta: '2026-10-21' }), antiga, HOJE)
    expect(r.caso.condicao).toEqual({ tipo: 'nenhuma' })
    expect(r.avisos).toEqual(['Pela data do parto informada na ficha, já se passaram mais de 60 meses. Atualize a ficha.'])
    const sessenta = ficha({ sexo: 'F', nascimento: '1990-01-10', momentoDeVida: { tipo: 'lactante', dataDoParto: '2021-10-21', amamentacao: 'exclusiva' } })
    expect(casoComFicha(plano({ dataConsulta: '2026-10-21' }), sessenta, HOJE).caso.condicao).toEqual({ tipo: 'lactante', mesesPosParto: 60 })
    expect(casoComFicha(plano({ dataConsulta: '2026-10-21' }), sessenta, HOJE).avisos).toEqual([])
  })
})

describe('Plano antigo com outra condição (D-344, CA-1044)', () => {
  const antigo = plano({ dataConsulta: '2026-09-10', condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 58 } })

  it('com a ficha sem gestação, o plano continua com a dele e a divergência é dita', () => {
    const r = casoComFicha(antigo, ficha({ sexo: 'F', nascimento: '1998-01-10' }), HOJE)
    expect(r.caso.condicao).toEqual(antigo.condicao)
    expect(r.condicaoDivergente).toEqual({ doPlano: antigo.condicao, daFicha: { tipo: 'nenhuma' } })
  })

  it('com a ficha dizendo o mesmo, não há divergência', () => {
    const igual = ficha({ sexo: 'F', nascimento: '1998-01-10', momentoDeVida: { tipo: 'gestante', semanas: 20, semanasEm: '2026-09-10', pesoPreGestacionalKg: 58 } })
    expect(casoComFicha(antigo, igual, HOJE).condicaoDivergente).toBeNull()
  })

  it('plano novo, sem condição gravada, nunca diverge', () => {
    const r = casoComFicha(plano({ dataConsulta: HOJE }), ficha({ sexo: 'F', nascimento: '1998-01-10', momentoDeVida: { tipo: 'nenhum' } }), HOJE)
    expect(r.condicaoDivergente).toBeNull()
  })
})

describe('O peso da última consulta (D-358, CA-1072)', () => {
  const registro = (id: string, dataConsulta: string | null, pesoKg: number | null, pacienteId: string | null = 'p1') => ({
    caso: { ...criarCasoVazio(id), pacienteId, dataConsulta, pesoKg },
  })

  it('o peso mais recente antes desta consulta, de outro plano do mesmo paciente', () => {
    const atual = registro('c3', '2026-10-21', null).caso
    const outros = [registro('c1', '2026-08-01', 85), registro('c2', '2026-09-10', 82), registro('c4', '2026-09-20', 80, 'p2'), registro('c5', '2026-11-01', 79)]
    expect(pesoAnterior(atual, [...outros, { caso: atual }])).toEqual({ pesoKg: 82, data: '2026-09-10' })
  })

  it('o plano de origem do mesmo dia também vale: duplicar na mesma consulta não perde o peso de vista', () => {
    const atual = registro('c2', '2026-10-21', null).caso
    expect(pesoAnterior(atual, [registro('c1', '2026-10-21', 82), { caso: atual }])).toEqual({ pesoKg: 82, data: '2026-10-21' })
  })

  it('sem outro plano com peso, nada', () => {
    const atual = registro('c3', '2026-10-21', null).caso
    expect(pesoAnterior(atual, [registro('c1', '2026-08-01', null), { caso: atual }])).toBeNull()
    expect(pesoAnterior({ ...atual, pacienteId: null }, [registro('c1', '2026-08-01', 80, null)])).toBeNull()
  })
})
