# Supabase — configuração do Gabarito+

## Estado atual
O Gabarito+ deste pacote já está conectada ao projeto Supabase configurado nesta versão.
O frontend usa apenas uma chave pública de cliente. Nenhuma `service_role` está incluída.

## Segurança aplicada
- RLS habilitado em todas as tabelas públicas.
- Usuários anônimos não possuem SELECT nas tabelas do app.
- Cada estudante acessa apenas o próprio progresso, tentativas e sessões.
- O papel de administrador fica em `private.app_admins`, fora de `profiles`.
- O aluno não pode transformar a própria conta em administrador.
- Trigger de criação de perfil fica no schema privado e não pode ser chamado como RPC.
- Sincronização usa `save_progress()` com revisão para detectar conflitos.

## Primeiro acesso
1. Abra o Gabarito+ pelo `ABRIR_GABARITO_MAIS.bat`.
2. Crie uma conta no próprio aplicativo.
3. Confirme o e-mail se o projeto estiver configurado para confirmação.
4. Entre novamente. O progresso passa a sincronizar com o Supabase.

## Tornar uma conta administradora
Por segurança isso não é feito pelo frontend. Depois de criar a conta, adicione o UUID do usuário à tabela privada `private.app_admins` pelo ambiente administrativo do Supabase. Não crie uma coluna `role` editável em `profiles`.

## Banco de questões
O pacote mantém as 3.375 questões locais como fallback. A tabela `questions` já existe na nuvem e está pronta para receber o banco editorial. Enquanto ela não estiver populada, o app usa automaticamente o banco local.

## Service role
Não coloque a service role em HTML, JavaScript, GitHub ou aplicativo mobile. Ela só deve existir em ambiente de servidor/Edge Function quando for realmente necessária.
