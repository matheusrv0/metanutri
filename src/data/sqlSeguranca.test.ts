import { gerarToken } from '@/domain/acompanhamento.ts'
import { PLANOS } from '@/domain/conta.ts'
import { LIMITE_DE_COMPROVANTES } from '@/domain/pedidoEstudante.ts'
import sql006 from '../../supabase/006-verificacao.sql?raw'
import sql from '../../supabase/010-seguranca-lote-1.sql?raw'

const corpoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''

/** As funções que o 006 cria, com os tipos dos parâmetros, para conferir a assinatura de cada revoke. */
const FUNCOES_006 = [...sql006.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)\s+returns (\w+)/g)].map(([, nome = '', parametros = '', retorno = '']) => ({
  nome,
  gatilho: retorno === 'trigger',
  tipos: parametros
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split(/\s+/).slice(1).join(' ')),
}))

/** As chamáveis: função de gatilho não é chamada direto e fica com as permissões de hoje. */
const RPCS_006 = FUNCOES_006.filter((f) => !f.gatilho)

/** As que o app chama logado (src/ui/estado), mais eh_admin, que as políticas de leitura usam. */
const CHAMADAS_PELO_APP = [
  'eh_admin',
  'informar_situacao',
  'me_formei',
  'corrigir_crn',
  'enviar_pedido_estudante',
  'fechar_aviso_estudante',
  'pedidos_em_analise',
  'decidir_pedido',
  'crn_para_conferir',
  'decidir_crn',
  'comprovantes_para_apagar',
  'marcar_comprovantes_apagados',
]

describe('banco: segurança, lote 1 (010)', () => {
  it('pode rodar de novo: nada é apagado, e o gatilho e a política são trocados pelo nome', () => {
    expect(sql).not.toMatch(/\b(drop table|truncate|delete from)\b/i)
    expect(sql).toContain('drop trigger if exists conferir_link_do_paciente on public.acompanhamentos;')
    expect(sql).toContain('drop policy if exists "estudante envia o proprio comprovante" on storage.objects;')
  })

  it('CA-421: conta de estudante, aprovada ou não, grava o link com o aviso, ao criar e ao alterar', () => {
    expect(sql).toMatch(/create trigger conferir_link_do_paciente\s+before insert or update on public\.acompanhamentos\s+for each row execute function public\.conferir_link_do_paciente\(\);/)
    expect(corpoDa('conferir_link_do_paciente')).toMatch(
      /if exists \(select 1 from public\.perfis where id = new\.nutricionista_id and situacao = 'estudante'\) then\s+new\.uso_nao_comercial := true;/,
    )
  })

  describe('CA-422: o banco recusa link além do limite do plano que vale para a conta', () => {
    const corpo = corpoDa('conferir_link_do_paciente')

    it('o plano que vale segue as regras do navegador (daLinhaAssinatura): ativa no prazo, paga cancelada no período pago, o resto Free', () => {
      expect(corpo).toContain("when a.status = 'ativa' and (a.expira_em is null or a.expira_em >= now()) then a.plano")
      expect(corpo).toContain("when a.status = 'cancelada' and a.plano in ('solo', 'pro', 'clinica') and a.expira_em > now() then a.plano")
      expect(corpo).toContain("else 'free'")
      expect(corpo).toContain('where a.nutricionista_id = new.nutricionista_id;')
    })

    it('os limites são os de limiteLinksPaciente, plano por plano; plano desconhecido vale como Free', () => {
      expect(corpo).toContain("v_limite := case coalesce(v_plano, 'free')")
      for (const plano of PLANOS) {
        if (plano.id === 'free') expect(corpo).toMatch(new RegExp(`else ${plano.limiteLinksPaciente}\\s+end;`))
        else expect(corpo, plano.id).toContain(`when '${plano.id}' then ${plano.limiteLinksPaciente ?? 'null'}`)
      }
    })

    it('só link novo conta: regravar um que já existe (gerar de novo, marcar) passa', () => {
      expect(corpo).toContain("if tg_op = 'INSERT' and not exists (select 1 from public.acompanhamentos where id = new.id) then")
    })

    it('dois links ao mesmo tempo não passam juntos do limite', () => {
      const trava = corpo.indexOf("perform pg_advisory_xact_lock(hashtext('links:' || new.nutricionista_id::text));")
      expect(trava).toBeGreaterThan(-1)
      expect(trava).toBeLessThan(corpo.indexOf('select count(*) into v_links from public.acompanhamentos where nutricionista_id = new.nutricionista_id;'))
    })

    it('recusa com a frase que a tela mostra, no código que a tela traduz', () => {
      expect(corpo).toMatch(/if v_links >= v_limite then\s+raise exception 'Você chegou ao limite de links do seu plano\.' using errcode = 'P0001';/)
    })

    it('a função do gatilho fica com as permissões padrão: nenhum revoke nem grant nela', () => {
      expect(sql).not.toMatch(/(revoke|grant)[^;]*function public\.conferir_link_do_paciente\(/)
    })
  })

  it('CA-426: marcações com mais de 1 MB ou mais de 1500 itens são recusadas, depois de conferir que é lista', () => {
    const corpo = corpoDa('marcar_missoes')
    const tipo = corpo.indexOf("if jsonb_typeof(p_marcacoes) is distinct from 'array' then")
    const tamanho = corpo.indexOf('if pg_column_size(p_marcacoes) > 1048576 or jsonb_array_length(p_marcacoes) > 1500 then')
    expect(tipo).toBeGreaterThan(-1)
    expect(tamanho).toBeGreaterThan(tipo)
    expect(tamanho).toBeLessThan(corpo.indexOf('update public.acompanhamentos'))
    expect(corpo.slice(tamanho, tamanho + 200)).toContain("using errcode = '22023';")
    expect(sql).toContain('create or replace function public.marcar_missoes(p_token text, p_marcacoes jsonb)')
  })

  it('CA-427: token fora de 12 a 64 letras minúsculas e números é recusado; o token que o app gera passa', () => {
    expect(sql).toMatch(
      /do \$\$\nbegin\n {2}alter table public\.acompanhamentos\n {4}add constraint acompanhamentos_token_formato check \(char_length\(token\) between 12 and 64 and token ~ '\^\[a-z0-9\]\+\$'\);\nexception\n {2}when duplicate_object then null;\nend \$\$;/,
    )
    for (let i = 0; i < 50; i++) expect(gerarToken()).toMatch(/^[a-z0-9]{12,64}$/)
  })

  describe('CA-428: só estudante envia comprovante, até 10 arquivos', () => {
    it('a política de envio exige a pasta da pessoa, conta de estudante e menos de 10 arquivos', () => {
      expect(sql).toMatch(
        /create policy "estudante envia o proprio comprovante" on storage\.objects\s+for insert to authenticated\s+with check \(\s+bucket_id = 'comprovantes'\s+and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text\s+and exists \(select 1 from public\.perfis where id = auth\.uid\(\) and situacao = 'estudante'\)\s+and public\.comprovantes_da_conta\(\) < 10\s+\);/,
      )
    })

    it('o limite do banco é o mesmo que a tela usa para explicar a recusa', () => {
      expect(sql).toContain(`and public.comprovantes_da_conta() < ${LIMITE_DE_COMPROVANTES}`)
    })

    it('a contagem é só da pasta de quem pede', () => {
      expect(corpoDa('comprovantes_da_conta')).toContain("where bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text;")
      expect(sql).toContain('revoke execute on function public.comprovantes_da_conta() from public, anon;')
      expect(sql).toContain('grant execute on function public.comprovantes_da_conta() to authenticated;')
    })

    it('é a única política que este arquivo cria', () => {
      expect([...sql.matchAll(/create policy "([^"]+)" on ([\w.]+)/g)].map((m) => `${m[2]}:${m[1]}`)).toEqual(['storage.objects:estudante envia o proprio comprovante'])
    })
  })

  describe('CA-429: nenhuma função chamável do 006 é executável sem login', () => {
    it('acha as 14 funções do 006, e só criar_perfil é de gatilho', () => {
      expect(FUNCOES_006.map((f) => f.nome)).toHaveLength(14)
      expect(FUNCOES_006.filter((f) => f.gatilho).map((f) => f.nome)).toEqual(['criar_perfil'])
    })

    it('cada uma perde a execução de public e anon, com a assinatura certa', () => {
      for (const { nome, tipos } of RPCS_006) {
        expect(sql, nome).toContain(`revoke execute on function public.${nome}(${tipos.join(', ')}) from public, anon;`)
      }
    })

    it('a função de gatilho do cadastro fica como está: nenhum revoke nem grant nela', () => {
      for (const { nome } of FUNCOES_006.filter((f) => f.gatilho)) {
        expect(sql, nome).not.toMatch(new RegExp(`(revoke|grant)[^;]*function public\\.${nome}\\(`))
      }
    })

    it('as que o app chama logado continuam com authenticated; as outras, não', () => {
      for (const { nome, tipos } of RPCS_006) {
        const concessao = `grant execute on function public.${nome}(${tipos.join(', ')}) to authenticated;`
        if (CHAMADAS_PELO_APP.includes(nome)) expect(sql, nome).toContain(concessao)
        else expect(sql, nome).not.toContain(concessao)
      }
    })

    it('nada é concedido a anon nem a public', () => {
      expect(sql).not.toMatch(/grant [^;]*\bto [^;]*\b(anon|public)\b/i)
    })
  })
})
