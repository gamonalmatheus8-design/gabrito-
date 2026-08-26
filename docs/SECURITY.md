# Segurança do Gabarito+
- A Publishable key do Supabase pode estar no navegador, desde que RLS e grants estejam corretos.
- Nunca exponha `service_role` no HTML/JS público.
- Todas as tabelas expostas possuem RLS no `supabase/schema.sql`.
- O papel admin é validado no banco (`profiles.role`) e não em `user_metadata` editável pelo usuário.
- Faça revisão das políticas RLS antes de produção e teste com contas student/admin separadas.
- A Edge Function de exclusão verifica o JWT do usuário antes de usar privilégios administrativos.


## Gabarito+ seguro
- Nenhuma service role está no frontend.
- A chave presente em `js/supabase-config.js` é a chave pública de cliente.
- O papel administrativo fica em `private.app_admins`; estudantes não conseguem alterar o próprio papel.
- Tabelas pessoais exigem autenticação e usam RLS por `auth.uid()`.
- Conteúdo Supabase na nuvem exige sessão autenticada; sem login o app usa o banco local.
