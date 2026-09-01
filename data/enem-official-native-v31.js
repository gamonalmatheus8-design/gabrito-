(function(){
'use strict';
/*
 Estrutura esperada para conteúdo oficial previamente licenciado/importado:
 {
   year: 2025,
   day: 1,
   number: 1,
   language: 'Inglês', // obrigatório apenas nas questões 1–5 do Dia 1
   area: 'Linguagens',
   subject: 'Língua Inglesa',
   text: '...',
   supportText: '...',
   imageUrl: '/assets/...',
   imageAlt: '...',
   options: ['...', '...', '...', '...', '...'],
   sourceLabel: 'INEP',
   sourceUrl: 'https://...'
 }

 Este arquivo não converte questões autorais em oficiais. O runner nativo só
 é ativado quando há 90 itens estruturados e válidos para o dia selecionado.
*/
window.GABARITO_ENEM_OFFICIAL_NATIVE_QUESTIONS = Array.isArray(window.GABARITO_ENEM_OFFICIAL_NATIVE_QUESTIONS)
  ? window.GABARITO_ENEM_OFFICIAL_NATIVE_QUESTIONS
  : [];
window.GABARITO_ENEM_NATIVE_SCHEMA = {
  version:'3.1.0',
  required:['year','day','number','text','options'],
  optionCount:5,
  day1Range:[1,90],
  day2Range:[91,180]
};
})();
