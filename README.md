# Gabarito+

Plataforma de estudos para ENEM e PISM, com Supabase como fonte principal do banco e fallback local de emergência.

## Cronômetro e evolução

- Cronômetro persistente com pausa, retomada, presets e conclusão manual.
- Sessões registradas por matéria e sincronizadas com o restante do progresso.
- Gráfico de 7, 30 ou 90 dias combinando tempo estudado e aproveitamento.
- Comparação com o período anterior e histórico das sessões recentes.

## Correções principais
- Inicialização não quebra mais quando elementos antigos foram removidos do HTML.
- Helpers de revisão, estratégia e prioridade adaptativa são compartilhados corretamente entre as camadas do app.
- O atalho antigo `v40OpenFocusedQuestions` volta a funcionar.
- Menu **Mais**, troca ENEM/PISM, questões, notas, favoritos, modo foco, revisão, domínio, estratégia, simulados e redação foram validados em smoke tests.
- Assets locais usam versão `1.1.0` para evitar JavaScript antigo preso no cache do PWA.
- Service worker atualizado e scripts de dados/JS usam network-first quando online.
- Lucide é opcional e não bloqueia a inicialização caso a CDN esteja lenta.
- Conta/Supabase exibe estado de conexão imediatamente, em vez de deixar botões sem função durante o carregamento da nuvem.

## Abrir no Windows
1. Extraia todo o ZIP.
2. Execute `ABRIR_GABARITO_MAIS.bat`.
3. Mantenha a janela do servidor aberta.
4. Abra o endereço mostrado, normalmente `http://localhost:3090`.

Se o navegador ainda estiver mostrando uma versão antiga, feche as abas antigas e abra novamente pelo inicializador. O Gabarito+ usa URLs versionadas para contornar cache antigo automaticamente.

## Supabase
`js/supabase-config.js` contém somente a credencial pública de cliente. Nunca coloque `service_role` no frontend. O Supabase é a fonte principal e o banco local permanece como fallback de emergência.
