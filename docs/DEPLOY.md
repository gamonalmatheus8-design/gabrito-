# Deploy do Gabarito+

1. Configure e teste o Supabase primeiro.
2. Publique a pasta do projeto em um host estático HTTPS, como Vercel.
3. No Supabase Auth, configure **Site URL** e **Redirect URLs** com o domínio publicado.
4. Publique as Edge Functions `correct-essay` e `delete-account`.
5. Configure `OPENAI_API_KEY` como secret apenas se quiser correção de redação por IA.
6. Teste com uma conta student e outra admin antes de abrir ao público.
