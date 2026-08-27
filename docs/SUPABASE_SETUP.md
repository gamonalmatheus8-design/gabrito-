# Supabase — configuração do Gabarito+ 2.0

## Estado atual
O Gabarito+ está conectado ao projeto Supabase de produção. O frontend usa somente a chave pública/publishable key; nenhuma `service_role` faz parte do código cliente.

Versões registradas no backend em 27/08/2026:
- Aplicativo: `2.0.0`.
- Banco: `v7-priority-curation-3665-2026-08-27`.
- Questões objetivas publicadas: 3.665 (2.400 ENEM + 1.265 PISM).
- Discursivas PISM publicadas: 52.

## Segurança aplicada
- RLS está habilitado nas tabelas públicas.
- `questions` e `pism_discursives` permitem leitura anônima somente de conteúdo publicado, pois esse conteúdo precisa carregar antes do login.
- `app_meta` permite leitura pública das versões usadas pelo cache do banco.
- Progresso, perfis, tentativas, sessões e demais dados vinculados à conta não possuem leitura anônima.
- Cada estudante autenticado acessa apenas os próprios dados conforme as políticas aplicadas.
- O papel de administrador fica em `private.app_admins`, fora de `profiles`.
- O aluno não pode transformar a própria conta em administrador.
- Sincronização usa `save_progress()` com revisão para detectar conflitos.
- `admin_question_analytics()` e leitura editorial exigem administrador.

## V2 comercial: métricas e relatos
A V2 acrescenta duas entradas públicas controladas:
- `product_events`: recebe eventos mínimos de uso e não permite leitura pública.
- `question_reports`: recebe relatos de problemas em questões com status inicial `novo`; somente administradores podem ler e alterar a fila.

Essas tabelas possuem validações de tamanho, RLS e limites horários básicos para reduzir abuso. O cliente envia um identificador aleatório do dispositivo, não nome ou e-mail, na telemetria anônima.

## Carregamento do banco
O fluxo principal é:
1. O navegador consulta a versão em `app_meta`.
2. Se houver um banco válido no IndexedDB com a mesma versão, ele é usado imediatamente.
3. Se a versão mudou, o banco publicado é baixado do Supabase, validado e salvo no IndexedDB.
4. Se o Supabase estiver indisponível e houver cache válido, o cache é usado em modo offline.
5. O pacote local de 3.375 questões continua como fallback de último recurso.

O fallback local não é a fonte editorial principal e pode ter menos itens que a nuvem.

## Primeiro acesso de uma conta
1. Abra `/app`.
2. Crie uma conta no próprio aplicativo.
3. Confirme o e-mail se o projeto estiver configurado para confirmação.
4. Entre novamente. O progresso passa a sincronizar com o Supabase.

## Tornar uma conta administradora
Por segurança, isso não é feito pelo frontend. Depois de criar a conta, adicione o UUID do usuário a `private.app_admins` pelo ambiente administrativo do Supabase. Não crie uma coluna `role` editável em `profiles`.

## Painel editorial
O painel `admin.html` exige uma conta administradora e permite:
- editar/publicar/arquivar questões;
- acompanhar analytics agregados;
- consultar o funil da V2;
- revisar e resolver relatos enviados pelos estudantes;
- acompanhar a versão ativa do backend.

## Service role
Nunca coloque a `service_role` em HTML, JavaScript público, GitHub ou aplicativo mobile. Ela só deve existir em ambiente de servidor/Edge Function quando realmente necessária.

## Recriação em outro projeto
Não aplique arquivos antigos sobre a produção. Recrie o núcleo seguro, RLS/RPCs e as migrations comerciais correspondentes. A produção atual também recebeu `harden_commercial_v2_public_intake`, que adiciona validações e limites às entradas públicas da V2.
