import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['server/index.mjs'],{stdio:'inherit'}),spawn(process.platform==='win32'?'npm.cmd':'npm',['exec','vite','--','--host','0.0.0.0'],{stdio:'inherit'})];
const stop=()=>{for(const c of children)c.kill('SIGTERM')};
process.on('SIGINT',stop);process.on('SIGTERM',stop);for(const c of children)c.on('exit',(code)=>{if(code&&code!==0){stop();process.exitCode=code}});
