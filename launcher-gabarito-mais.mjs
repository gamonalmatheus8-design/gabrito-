import net from 'node:net';
import os from 'node:os';
import { spawn } from 'node:child_process';

function isPortFree(port){
  return new Promise(resolve=>{
    const s=net.createServer();
    s.once('error',()=>resolve(false));
    s.once('listening',()=>s.close(()=>resolve(true)));
    s.listen(port,'0.0.0.0');
  });
}

async function pickPort(){
  const preferred=Number(process.env.PORT||3090);
  for(let p=preferred;p<=preferred+9;p++) if(await isPortFree(p)) return p;
  throw new Error(`Nenhuma porta livre entre ${preferred} e ${preferred+9}.`);
}

function mobileUrls(port){
  const out=[];
  for(const entries of Object.values(os.networkInterfaces())){
    for(const info of entries||[]){
      if(info.family==='IPv4'&&!info.internal) out.push(`http://${info.address}:${port}`);
    }
  }
  return [...new Set(out)];
}

function openBrowser(url){
  try{
    if(process.platform==='win32'){
      const p=spawn('cmd.exe',['/c','start','',url],{detached:true,stdio:'ignore'});p.unref();
    }else if(process.platform==='darwin'){
      const p=spawn('open',[url],{detached:true,stdio:'ignore'});p.unref();
    }else{
      const p=spawn('xdg-open',[url],{detached:true,stdio:'ignore'});p.unref();
    }
  }catch{}
}

try{
  const port=await pickPort();
  process.env.PORT=String(port);
  console.log('');
  console.log('==============================================');
  console.log('  GABARITO+ - SERVIDOR');
  console.log('==============================================');
  console.log(`Node.js: ${process.version}`);
  if(port!==3090) console.log(`Porta 3090 ocupada. Usando automaticamente a porta ${port}.`);
  await import('./server.mjs');
  const local=`http://localhost:${port}`;
  console.log(`PC: ${local}`);
  const lan=mobileUrls(port);
  if(lan.length){
    console.log('Celular na mesma rede Wi-Fi:');
    for(const url of lan) console.log(`  ${url}`);
  }
  console.log('');
  console.log('Mantenha esta janela aberta. Ctrl+C encerra o servidor.');
  setTimeout(()=>openBrowser(local),700);
}catch(err){
  console.error('\n[ERRO] Não foi possível iniciar o Gabarito+:');
  console.error(err?.stack||err?.message||err);
  process.exitCode=1;
}
