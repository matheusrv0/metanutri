// CA-487 (spec seguranca-lote-4): código malicioso em todo campo de texto livre que o app inteiro mostra de
// volta, no modo deste aparelho (sem conta): pacientes, planos e as observações deles, refeições, missões,
// produtos, modelos e o perfil. O app abre com os dados já gravados e cada tela é conferida no DOM.
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App.tsx'
import { criarAcompanhamento } from '@/domain/acompanhamento.ts'
import { gravarRoteiro, renomearPergunta, ROTEIRO_PADRAO } from '@/domain/anamnese.ts'
import { criarRepositorioModelosSuplemento } from '@/domain/suplementos.ts'
import { criarRepositorioModelos } from '@/domain/modelos.ts'
import { criarRepositorioPacientes } from '@/domain/pacientes.ts'
import { gravarPerfil } from '@/domain/perfil.ts'
import { criarRepositorio } from '@/domain/persistencia.ts'
import { adicionarItem, adicionarRefeicao } from '@/domain/plano.ts'
import { criarRepositorioProdutos } from '@/domain/produtos.ts'
import { criarRepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { CHAVE_AVISO_VISTO } from '../ui/casos/AvisoPrimeiroAcesso.tsx'
import { ProvedorTema } from '../ui/tema/ProvedorTema.tsx'
import { cargaComoTexto, conferirSemInjecao, JAVASCRIPT_PURO, malicioso } from './xss.test-utils.ts'

// Sempre o modo deste aparelho, mesmo com um .env.local de conta na máquina.
vi.mock('../ui/estado/supabase.ts', () => ({ obterSupabase: () => null, supabaseConfigurado: () => false }))

const ARROZ = 3
let n = 0
const ids = () => `x${++n}`

interface Semeado {
  readonly casoId: string
  readonly pacienteId: string
}

/** Grava, pelo próprio domínio, um paciente, um plano, um produto, um modelo, um link e o perfil, todos com a carga. */
function semear(): Semeado {
  const pacientes = criarRepositorioPacientes(localStorage, { gerarId: () => 'p1' })
  const paciente = pacientes.criar(malicioso('nome do paciente'))
  pacientes.salvar({
    ...paciente,
    // E-mail, telefone e nome do link levam o endereço javascript: puro, o que viraria link se a tela fizesse um.
    telefone: JAVASCRIPT_PURO,
    email: JAVASCRIPT_PURO,
    objetivo: malicioso('objetivo'),
    restricoes: malicioso('restricao'),
    condicoesClinicas: malicioso('condicoes clinicas'),
    medicamentos: malicioso('medicamentos'),
    anamnese: malicioso('anamnese'),
    observacoes: malicioso('observacoes do paciente'),
    // CA-586 (spec anamnese-e-prescricoes): a resposta, o suplemento e os outros exames.
    respostasAnamnese: [{ perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: malicioso('resposta da anamnese') }],
    suplementos: [
      {
        id: 's1',
        nome: malicioso('nome do suplemento'),
        dose: malicioso('dose do suplemento'),
        horario: malicioso('horario do suplemento'),
        duracao: malicioso('duracao do suplemento'),
        observacao: malicioso('observacao do suplemento'),
      },
    ],
    pedidoExames: { marcados: ['ferritina'], outros: malicioso('outros exames') },
  })
  gravarRoteiro(localStorage, renomearPergunta(ROTEIRO_PADRAO, 'agua', 'agua-dia', malicioso('pergunta do roteiro')))
  criarRepositorioModelosSuplemento(localStorage).salvarDe({ id: 'x', nome: malicioso('modelo de suplemento'), dose: malicioso('dose do modelo'), horario: '', duracao: '', observacao: '' })

  const produtos = criarRepositorioProdutos(localStorage)
  const produto = produtos.salvar({
    nome: malicioso('nome do produto'),
    marca: malicioso('marca'),
    porcaoG: 100,
    medidaCaseira: malicioso('medida caseira'),
    porPorcao: { energia_kcal: 100, proteina_g: 5, lipideos_g: 2, carboidrato_g: 10, acucares_g: 1, gordura_saturada_g: 1, fibra_g: 1, sodio_mg: 10 },
  })

  const casos = criarRepositorio(localStorage, { gerarId: ids })
  const salvo = casos.criar(malicioso('nome do plano'))
  let plano = adicionarRefeicao(salvo.plano, { nome: malicioso('refeicao'), horario: '15:30' }, ids)
  const refeicao = plano.refeicoes.find((r) => r.horario === '15:30')
  if (!refeicao) throw new Error('refeição não entrou')
  plano = adicionarItem(plano, refeicao.id, 'principal', { alimentoId: ARROZ, gramas: 100 }, ids)
  plano = adicionarItem(plano, refeicao.id, 'principal', { alimentoId: produto.id, gramas: 50 }, ids)
  casos.salvar({
    ...salvo,
    plano,
    caso: {
      ...salvo.caso,
      pacienteId: 'p1',
      sexo: 'F',
      idadeAnos: 30,
      pesoKg: 60,
      estaturaCm: 165,
      diagnosticoClinico: malicioso('diagnostico'),
      ocupacao: malicioso('ocupacao'),
      estagiario: malicioso('estagiario'),
      preceptor: malicioso('preceptor'),
      observacoes: malicioso('observacoes do plano'),
      orientacoes: malicioso('orientacoes'),
      receitas: malicioso('receitas'),
      composicao: { ...salvo.caso.composicao, bioimpedancia: { ...salvo.caso.composicao.bioimpedancia, aparelho: malicioso('aparelho') } },
    },
  })

  criarRepositorioModelos(localStorage, { gerarId: ids }).salvar({ nome: malicioso('nome do modelo'), descricao: malicioso('descricao do modelo'), plano })

  criarRepositorioAcompanhamentos(localStorage).salvar(
    criarAcompanhamento({
      casoId: salvo.caso.id,
      pacienteId: 'p1',
      nome: JAVASCRIPT_PURO,
      missoes: [{ id: 'm1', texto: malicioso('missao'), origem: malicioso('origem da missao') }],
    }),
  )

  gravarPerfil(localStorage, {
    nome: malicioso('nome do perfil'),
    tipo: 'estudante',
    crn: malicioso('crn'),
    instituicao: malicioso('instituicao'),
    responsavel: malicioso('responsavel'),
    telefone: JAVASCRIPT_PURO,
    email: JAVASCRIPT_PURO,
    logo: 'javascript:alert(1)',
  })
  return { casoId: salvo.caso.id, pacienteId: 'p1' }
}

let semeado: Semeado
const alerta = vi.fn()

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(CHAVE_AVISO_VISTO, '1')
  semeado = semear()
  vi.spyOn(window, 'alert').mockImplementation(alerta)
})

afterEach(() => {
  cleanup()
  window.location.hash = ''
  expect(alerta).not.toHaveBeenCalled()
})

async function abrir(endereco: string, rotulo: string) {
  window.location.hash = endereco
  render(
    <ProvedorTema>
      <App />
    </ProvedorTema>,
  )
  await waitFor(() => cargaComoTexto(rotulo))
}

describe('CA-487: código malicioso aparece como texto e nada executa (app no aparelho)', () => {
  it('CA-487: pacientes: a lista e a ficha mostram nome, contato, restrições, anamnese e observações como texto', async () => {
    await abrir('#/pacientes', 'nome do paciente')
    conferirSemInjecao()
    cleanup()
    await abrir(`#/paciente/${semeado.pacienteId}`, 'nome do paciente')
    expect(screen.getAllByDisplayValue(JAVASCRIPT_PURO)).toHaveLength(2)
    for (const rotulo of ['objetivo', 'restricao', 'condicoes clinicas', 'medicamentos', 'anamnese', 'observacoes do paciente', 'nome do plano']) {
      cargaComoTexto(rotulo)
    }
    conferirSemInjecao()
  })

  it('CA-586 (spec anamnese-e-prescricoes): resposta, roteiro, suplemento e outros exames aparecem como texto na ficha', async () => {
    await abrir(`#/paciente/${semeado.pacienteId}`, 'resposta da anamnese')
    for (const rotulo of ['pergunta do roteiro', 'nome do suplemento', 'dose do suplemento', 'horario do suplemento', 'duracao do suplemento', 'observacao do suplemento', 'outros exames']) {
      cargaComoTexto(rotulo)
    }
    conferirSemInjecao()
  })

  it('CA-586: o roteiro e os modelos de suplemento aparecem como texto nas janelas', async () => {
    await abrir(`#/paciente/${semeado.pacienteId}`, 'resposta da anamnese')
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Editar roteiro' }))
    cargaComoTexto('pergunta do roteiro', await screen.findByRole('dialog'))
    conferirSemInjecao()
    await usuario.keyboard('{Escape}')

    await usuario.click(screen.getByRole('button', { name: 'Modelos' }))
    const modelos = await screen.findByRole('dialog')
    cargaComoTexto('modelo de suplemento', modelos)
    cargaComoTexto('dose do modelo', modelos)
    conferirSemInjecao()
  })

  it('CA-586: as folhas de suplementação e de exames mostram o texto livre como texto', async () => {
    await abrir(`#/paciente/${semeado.pacienteId}`, 'resposta da anamnese')
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Imprimir' }))
    const folha = await screen.findByRole('dialog')
    for (const rotulo of ['nome do suplemento', 'dose do suplemento', 'observacao do suplemento', 'nome do perfil', 'responsavel']) cargaComoTexto(rotulo, folha)
    conferirSemInjecao()
    await usuario.keyboard('{Escape}')

    await usuario.click(screen.getByRole('button', { name: 'Imprimir pedido' }))
    const pedido = await screen.findByRole('dialog')
    cargaComoTexto('outros exames', pedido)
    conferirSemInjecao()
  })

  it('CA-487: lista de planos e painel: o nome do plano e do paciente aparecem como texto', async () => {
    await abrir('#/casos', 'nome do plano')
    conferirSemInjecao()
    cleanup()
    await abrir('#/painel', 'nome do plano')
    conferirSemInjecao()
  })

  it('CA-487: plano: dados, observações, orientações e receitas aparecem como texto', async () => {
    await abrir(`#/caso/${semeado.casoId}/caso`, 'nome do plano')
    // Spec ficha-unica, D-340: com paciente, o diagnóstico e as restrições vêm da ficha, no resumo da etapa 1.
    for (const rotulo of ['condicoes clinicas', 'restricao', 'observacoes do plano']) cargaComoTexto(rotulo)
    conferirSemInjecao()
  })

  it('CA-487: refeições: o nome da refeição e o produto no plano aparecem como texto', async () => {
    await abrir(`#/caso/${semeado.casoId}/plano`, 'refeicao')
    cargaComoTexto('nome do produto')
    conferirSemInjecao()
    cleanup()
    await abrir(`#/caso/${semeado.casoId}/adequacao`, 'nome do plano')
    conferirSemInjecao()
  })

  it('CA-487: modelos: nome e descrição do modelo aparecem como texto na janela de modelos', async () => {
    await abrir(`#/caso/${semeado.casoId}/plano`, 'refeicao')
    await userEvent.setup().click(screen.getByRole('button', { name: /Modelos de plano/ }))
    const janela = await screen.findByRole('dialog')
    await waitFor(() => cargaComoTexto('nome do modelo', janela))
    cargaComoTexto('descricao do modelo', janela)
    conferirSemInjecao()
  })

  it('CA-487: missões do nutricionista: o nome do link (javascript: puro) aparece como texto e não vira link', async () => {
    window.location.hash = '#/adesao'
    render(
      <ProvedorTema>
        <App />
      </ProvedorTema>,
    )
    expect((await screen.findAllByText(JAVASCRIPT_PURO)).length).toBeGreaterThan(0)
    conferirSemInjecao()
  })

  it('CA-487: produtos: nome, marca e medida caseira aparecem como texto', async () => {
    await abrir('#/produtos', 'nome do produto')
    cargaComoTexto('marca')
    conferirSemInjecao()
  })

  it('CA-487: perfil: nome, registro, contato e responsável aparecem como texto, e a logo não vira endereço javascript:', async () => {
    await abrir('#/config', 'nome do perfil')
    for (const rotulo of ['instituicao', 'responsavel']) cargaComoTexto(rotulo)
    expect(screen.getAllByDisplayValue(JAVASCRIPT_PURO)).toHaveLength(2)
    conferirSemInjecao()
    // O CRN só aparece para quem é nutricionista.
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Nutricionista' }))
    await waitFor(() => cargaComoTexto('crn'))
    conferirSemInjecao()
  })
})
