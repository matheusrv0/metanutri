import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  CAMPOS_NAO_CARREGARAM,
  campoDoErroDoToken,
  CONFIRA_O_CARTAO,
  DIGITE_O_CODIGO_DE_NOVO,
  ehCredito,
  errosDoCartao,
  mascararCpf,
  MENSAGEM_DO_CAMPO,
  ORDEM_DOS_CAMPOS,
  soDigitos,
  USE_CREDITO,
  type CampoDoCartao,
  type CampoSeguro,
  type EstadoDoCampo,
} from '@/domain/cartao.ts'
import { cn } from '@/lib/utils'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { AvisoPagamento } from './AvisoPagamento.tsx'
import { CampoDoFormulario } from './CampoDoFormulario.tsx'
import { CartaoAoVivo } from './CartaoAoVivo.tsx'
import { CAIXA, CAIXA_ERRO, CAIXA_FOCO_DENTRO, CAIXA_FOCO_INPUT } from './estiloDaCaixa.ts'
import {
  ErroDoCartao,
  estiloDosCampos,
  lerTokenDoTema,
  type ControleDoCartao,
  type CriarProcessador,
  type InfoDoCartao,
  type ProcessadorCartao,
} from './processadorCartao.ts'

/** Cada campo pode estar sem erro (`undefined`): quem lê trata `undefined` como "sem erro". */
type Erros = { [K in CampoDoCartao]?: string | undefined }

const VAZIOS: Readonly<Record<CampoSeguro, EstadoDoCampo>> = { numero: 'vazio', validade: 'vazio', codigo: 'vazio' }
const PLACEHOLDERS: Readonly<Record<CampoSeguro, string>> = { numero: '0000 0000 0000 0000', validade: 'MM/AA', codigo: '•••' }
const ROTULOS: Readonly<Record<CampoSeguro, string>> = { numero: 'Número do cartão', validade: 'Validade', codigo: 'Código de segurança' }

const semErro = (erros: Erros, campo: CampoDoCartao): Erros => {
  if (erros[campo] === undefined) return erros
  return { ...erros, [campo]: undefined }
}

const descrito = (id: string, erro: string | undefined, temDica = false): string | undefined => (erro ? `${id}-erro` : temDica ? `${id}-dica` : undefined)

interface FormularioCartaoProps {
  readonly criarProcessador: CriarProcessador
  /** CA-371: enquanto o banco responde, os campos não mexem. */
  readonly travado: boolean
  /** Avisa quando dá para enviar: os campos abriram e o cartão é de crédito (CB-88, CA-369). */
  readonly aoMudarPronto: (pronto: boolean) => void
}

/**
 * O formulário do cartão de crédito (spec checkout-proprio): os três campos seguros da
 * operadora, dentro da caixa do site, mais o nome impresso e o CPF, que são nossos. É o
 * mesmo no checkout e em "Trocar cartão" (CA-379). Quem usa fala com ele pelo `ref`
 * (`ControleDoCartao`): `conferir()` mostra os erros e põe o foco no primeiro (CA-370);
 * `gerar()` troca o cartão pelo código de uso único (CB-90); `limparCodigo()` apaga o código
 * de segurança depois de uma recusa (CA-373).
 *
 * As cores dos campos seguros são lidas do tema quando o formulário abre (CA-368): os
 * campos vivem em iframes e não enxergam o CSS da página.
 */
export const FormularioCartao = forwardRef<ControleDoCartao, FormularioCartaoProps>(function FormularioCartao({ criarProcessador, travado, aoMudarPronto }, ref) {
  // Sem ":" no id: o script da operadora acha o alvo pelo id, e ":" quebra seletor de CSS.
  const idDoReact = useId()
  const base = `cartao-${idDoReact.replace(/[^a-zA-Z0-9]/g, '')}`
  const alvos = useMemo(() => ({ numero: `${base}-numero`, validade: `${base}-validade`, codigo: `${base}-codigo` }), [base])
  const processador = useRef<ProcessadorCartao | null>(null)
  const refNome = useRef<HTMLInputElement>(null)
  const refCpf = useRef<HTMLInputElement>(null)
  const [carga, setCarga] = useState<'carregando' | 'pronto' | 'falhou'>('carregando')
  const [seguros, setSeguros] = useState(VAZIOS)
  const [cartao, setCartao] = useState<InfoDoCartao | null>(null)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [erros, setErros] = useState<Erros>({})

  useEffect(() => {
    const atual = criarProcessador()
    processador.current = atual
    let vivo = true
    atual
      .montar({ alvos, estilo: estiloDosCampos(lerTokenDoTema), placeholders: PLACEHOLDERS, rotulos: ROTULOS }, (evento) => {
        if (!vivo) return
        if (evento.tipo === 'cartao') {
          setCartao(evento.cartao)
          return
        }
        setSeguros((antes) => ({ ...antes, [evento.campo]: evento.valido ? 'valido' : 'invalido' }))
        if (evento.valido) setErros((antes) => semErro(antes, evento.campo))
      })
      .then(
        () => {
          if (vivo) setCarga('pronto')
        },
        () => {
          if (vivo) setCarga('falhou')
        },
      )
    return () => {
      vivo = false
      atual.desmontar()
      processador.current = null
    }
  }, [criarProcessador, alvos])

  const credito = ehCredito(cartao?.tipo ?? null)
  const pronto = carga === 'pronto' && credito
  useEffect(() => {
    aoMudarPronto(pronto)
  }, [pronto, aoMudarPronto])

  const focar = useCallback((campo: CampoDoCartao) => {
    if (campo === 'nome') refNome.current?.focus()
    else if (campo === 'cpf') refCpf.current?.focus()
    else processador.current?.focar(campo)
  }, [])

  useImperativeHandle(
    ref,
    (): ControleDoCartao => ({
      conferir() {
        const encontrados: Erros = errosDoCartao({ seguros, nome, cpf })
        if (!credito) encontrados.numero = USE_CREDITO
        setErros(encontrados)
        const primeiro = ORDEM_DOS_CAMPOS.find((campo) => encontrados[campo] !== undefined)
        if (primeiro) focar(primeiro)
        return primeiro === undefined
      },
      async gerar() {
        const atual = processador.current
        if (!atual) return { ok: false, erro: CAMPOS_NAO_CARREGARAM }
        try {
          return { ok: true, dados: await atual.gerarToken({ nome: nome.trim(), cpf: soDigitos(cpf) }) }
        } catch (falha) {
          const campo = falha instanceof ErroDoCartao ? campoDoErroDoToken(falha.codigos) : null
          if (campo) {
            setErros((antes) => ({ ...antes, [campo]: MENSAGEM_DO_CAMPO[campo].invalido }))
            focar(campo)
          }
          return { ok: false, erro: CONFIRA_O_CARTAO }
        }
      },
      limparCodigo() {
        processador.current?.limparCodigo()
        setSeguros((antes) => ({ ...antes, codigo: 'vazio' }))
        setErros((antes) => ({ ...antes, codigo: DIGITE_O_CODIGO_DE_NOVO }))
      },
    }),
    [seguros, nome, cpf, credito, focar],
  )

  const erroDoNumero = credito ? erros.numero : USE_CREDITO
  const caixaSegura = (erro: string | undefined) => cn(CAIXA, CAIXA_FOCO_DENTRO, erro && CAIXA_ERRO, travado && 'pointer-events-none opacity-60')
  const idNome = `${base}-nome`
  const idCpf = `${base}-cpf`

  return (
    <div className="flex flex-col gap-4">
      <CartaoAoVivo bandeira={cartao?.bandeira ?? null} bin={cartao?.bin ?? null} nome={nome} />
      {carga === 'falhou' ? <AvisoPagamento tipo="erro">{CAMPOS_NAO_CARREGARAM}</AvisoPagamento> : null}
      <fieldset disabled={travado} aria-busy={carga === 'carregando' || undefined} className="grid min-w-0 gap-3.5 sm:grid-cols-2">
        <legend className="sr-only">Dados do cartão de crédito</legend>

        <CampoDoFormulario id={alvos.numero} rotulo="Número do cartão" erro={erroDoNumero} seguro className="sm:col-span-2">
          <div role="group" aria-labelledby={`${alvos.numero}-rotulo`} aria-describedby={descrito(alvos.numero, erroDoNumero)} className={caixaSegura(erroDoNumero)}>
            <div id={alvos.numero} className="h-full min-w-0 flex-1" />
            {cartao ? (
              <span className="shrink-0 font-titulo text-xs font-bold text-muted-foreground">{cartao.bandeira}</span>
            ) : (
              <IconeMarca nome="cartao" className="text-textsubtle" />
            )}
          </div>
        </CampoDoFormulario>

        <CampoDoFormulario id={alvos.validade} rotulo="Validade" erro={erros.validade} seguro>
          <div role="group" aria-labelledby={`${alvos.validade}-rotulo`} aria-describedby={descrito(alvos.validade, erros.validade)} className={caixaSegura(erros.validade)}>
            <div id={alvos.validade} className="h-full min-w-0 flex-1" />
          </div>
        </CampoDoFormulario>

        <CampoDoFormulario id={alvos.codigo} rotulo="Código de segurança" erro={erros.codigo} dica="Os 3 números do verso" seguro>
          <div role="group" aria-labelledby={`${alvos.codigo}-rotulo`} aria-describedby={descrito(alvos.codigo, erros.codigo, true)} className={caixaSegura(erros.codigo)}>
            <div id={alvos.codigo} className="h-full min-w-0 flex-1" />
            <IconeMarca nome="cadeado" className="text-textsubtle" />
          </div>
        </CampoDoFormulario>

        <CampoDoFormulario id={idNome} rotulo="Nome impresso no cartão" erro={erros.nome} className="sm:col-span-2">
          <Input
            ref={refNome}
            id={idNome}
            value={nome}
            autoComplete="cc-name"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Como está impresso"
            aria-invalid={erros.nome ? true : undefined}
            aria-describedby={descrito(idNome, erros.nome)}
            onChange={(e) => {
              setNome(e.target.value)
              setErros((antes) => semErro(antes, 'nome'))
            }}
            className={cn(CAIXA, CAIXA_FOCO_INPUT, erros.nome && CAIXA_ERRO)}
          />
        </CampoDoFormulario>

        <CampoDoFormulario id={idCpf} rotulo="CPF do titular" erro={erros.cpf} className="sm:col-span-2">
          <Input
            ref={refCpf}
            id={idCpf}
            value={cpf}
            inputMode="numeric"
            maxLength={14}
            placeholder="000.000.000-00"
            aria-invalid={erros.cpf ? true : undefined}
            aria-describedby={descrito(idCpf, erros.cpf)}
            onChange={(e) => {
              setCpf(mascararCpf(e.target.value))
              setErros((antes) => semErro(antes, 'cpf'))
            }}
            className={cn(CAIXA, CAIXA_FOCO_INPUT, 'numeros', erros.cpf && CAIXA_ERRO)}
          />
        </CampoDoFormulario>
      </fieldset>
    </div>
  )
})
