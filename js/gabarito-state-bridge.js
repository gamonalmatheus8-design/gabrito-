(function(){
'use strict';
try{
  if(typeof app!=='undefined') window.app=app;
}catch(error){
  console.warn('[Gabarito+] Estado do aplicativo ainda não disponível:',error?.message||error);
}
})();
