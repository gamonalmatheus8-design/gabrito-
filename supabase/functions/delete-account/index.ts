import { createClient } from 'npm:@supabase/supabase-js@2'
Deno.serve(async (req)=>{
  if(req.method!=='POST')return new Response(JSON.stringify({error:'Método não permitido'}),{status:405,headers:{'Content-Type':'application/json'}})
  const auth=req.headers.get('Authorization')||'';const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const {data:{user},error}=await userClient.auth.getUser();if(error||!user)return new Response(JSON.stringify({error:'Não autenticado'}),{status:401,headers:{'Content-Type':'application/json'}})
  const admin=createClient(url,service,{auth:{persistSession:false}});const {error:del}=await admin.auth.admin.deleteUser(user.id);if(del)return new Response(JSON.stringify({error:del.message}),{status:500,headers:{'Content-Type':'application/json'}})
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}})
})
