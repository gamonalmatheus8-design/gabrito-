(function(){
'use strict';
if(window.__GABARITO_STUDENT_JOIN_RPC_V1__)return;
window.__GABARITO_STUDENT_JOIN_RPC_V1__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const notify=message=>typeof window.toast==='function'?window.toast(message):alert(message);

function humanError(error){
  const raw=String(error?.message||error?.details||error?.hint||error||'Erro inesperado.');
  if(raw.includes('classroom_not_found'))return 'Código de turma não encontrado. Confira o código enviado pelo professor.';
  if(raw.includes('invalid_code'))return 'O código da turma é inválido.';
  if(raw.includes('not_authenticated')||raw.includes('JWT'))return 'Sua sessão expirou. Saia da conta e entre novamente.';
  if(raw.includes('permission denied'))return 'Sua conta não tem permissão para entrar nesta turma.';
  return raw.replace(/^Error:\s*/,'');
}

async function joinWithRpc(form,event){
  const client=getClient();
  const input=form.querySelector('#gplusJoinCode');
  const code=String(input?.value||'').trim().toUpperCase();
  const button=event.submitter||form.querySelector('button[type="submit"]');

  if(!client){notify('Não foi possível acessar sua conta agora. Recarregue a página.');return}
  if(!/^[A-Z0-9]{6,12}$/.test(code)){
    notify('Digite um código de turma válido.');
    input?.focus();
    return;
  }

  if(button)button.disabled=true;
  try{
    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError||!userData?.user)throw new Error('not_authenticated');

    const {data,error}=await client.rpc('join_classroom_by_code',{p_code:code});
    if(error)throw error;
    if(!data?.ok)throw new Error('Não foi possível entrar na turma.');

    if(input)input.value='';
    notify(data.already_member?'Você já faz parte desta turma.':`Você entrou na turma${data.classroom_name?` “${data.classroom_name}”`:''}.`);

    if(window.GabaritoClassrooms?.refresh)await window.GabaritoClassrooms.refresh();
    document.dispatchEvent(new CustomEvent('gplus:classroom-joined',{detail:data}));
  }catch(error){
    console.error('[Gabarito+] Entrada na turma:',error);
    notify(humanError(error));
  }finally{
    if(button)button.disabled=false;
  }
}

function onSubmit(event){
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.id!=='gplusJoinForm')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void joinWithRpc(form,event);
}

document.addEventListener('submit',onSubmit,true);
})();
