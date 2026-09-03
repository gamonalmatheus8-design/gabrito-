# Auditoria de performance — Gabarito+ 3.3

Data: 2026-09-03

## Diagnóstico estático

O principal custo de inicialização não está nos simuladores oficiais depois da v3.2, e sim no núcleo antigo do aplicativo e no banco local carregado na primeira visita.

Tamanhos aproximados no repositório antes desta etapa:

- `js/app.js`: 195.040 bytes
- `assets/styles.css`: 109.414 bytes
- `data/enem-questions.js`: 1.842.305 bytes
- `data/pism-questions.js`: 853.169 bytes
- bancos objetivos locais principais somados: 2.695.474 bytes

Isso mostra que o banco local representa um custo muito maior do que o próprio `app.js`, especialmente porque os arquivos de dados precisam ser baixados, interpretados como JavaScript e transformados em milhares de objetos antes da aplicação ficar pronta.

## Mudanças da 3.3

1. O bootstrap passou a medir as fases reais de inicialização (`bankMs`, `questionBankMs`, `appJsMs`, `simulatorShellMs`, `publicUiMs` e `bootReadyMs`).
2. O Gabarito+ passou a procurar primeiro uma cópia íntegra do banco no IndexedDB. Em reaberturas com cache válido, os arquivos locais de aproximadamente 2,7 MB deixam de ser necessários no boot.
3. Quando não há cache válido, o comportamento seguro continua sendo usar o banco local revisado. Depois que o app já está pronto, o banco online é sincronizado para o cache em segundo plano.
4. A atualização do cache verifica a versão publicada antes de baixar novamente todo o banco.
5. Camadas não críticas (PWA, acabamento comercial e script de tema) foram retiradas do caminho crítico e carregadas em idle time depois de `GABARITO_APP.ready`.
6. Os simuladores permanecem em lazy loading e não participam da inicialização normal.

## Métricas disponíveis no navegador

Após o boot:

```js
GABARITO_APP.performance
GABARITO_PERF.snapshot()
```

Os objetos registram tempo total até o app ficar pronto, duração de cada fase, origem do banco, hit/miss de cache e tamanho dos recursos observados pelo Resource Timing API.

## Benchmark automatizado

O workflow `.github/workflows/performance.yml` compara a versão atual com o commit baseline `669cef826098db63cb7366903db5bc0986f1f49d`.

Ele executa Chromium real e mede:

- tempo até `GABARITO_APP.ready`;
- duração do carregamento/execução de `app.js`;
- bytes locais transferidos;
- bytes do banco de questões;
- quantidade e duração de long tasks;
- inicialização fria;
- inicialização quente com cache HTTP/IndexedDB.

O resultado é publicado como artifact `gabarito-performance-report` em JSON e Markdown.

## Próximo gargalo

Mesmo com o cache rápido, `app.js` continua com cerca de 195 KB e contém várias gerações de funcionalidades no mesmo arquivo. A próxima refatoração estrutural recomendada é separar recursos que não pertencem à tela inicial — domínio, estratégia, calendário, redação avançada e rotas antigas de simulado — em módulos carregados somente quando suas páginas forem abertas.

Essa divisão deve ser feita por etapas, com testes de regressão, porque atualmente várias gerações (`V2`, `V3`, `V3.5`, `V3.7`, `V3.8`, `V3.9`, `V4.2`) sobrescrevem funções globais umas das outras.
