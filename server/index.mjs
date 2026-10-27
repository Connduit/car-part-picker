import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,scryptSync,timingSafeEqual,createHmac} from 'node:crypto';
import {dirname,resolve} from 'node:path';
const PORT=Number(process.env.API_PORT||5176);
const file=resolve('server/data/users.json');
const secretFile=resolve('server/data/secret');
await mkdir(dirname(file),{recursive:true});
let users=[];try{users=JSON.parse(await readFile(file,'utf8'))}catch{}
let secret;try{secret=await readFile(secretFile,'utf8')}catch{secret=randomBytes(48).toString('hex');await writeFile(secretFile,secret,{mode:0o600})}
const save=()=>writeFile(file,JSON.stringify(users,null,2),{mode:0o600});
const hash=(pw,salt)=>scryptSync(pw,salt,64).toString('hex');
const sign=v=>createHmac('sha256',secret).update(v).digest('hex');
const cookie=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(p=>p.trim().split('=').slice(0,2)).filter(x=>x.length===2));
const current=req=>{const raw=cookie(req).cpp_session;if(!raw)return null;const [id,expires,signature]=raw.split('.');if(!id||!expires||!signature||Number(expires)<Date.now())return null;const expected=sign(id+'.'+expires);if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;return users.find(u=>u.id===id)||null};
const session=(res,user)=>{const expiry=String(Date.now()+7*86400000);const val=[user.id,expiry,sign(user.id+'.'+expiry)].join('.');res.setHeader('Set-Cookie',`cpp_session=${val}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='1'?'; Secure':''}`)};
const json=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const publicUser=u=>({id:u.id,username:u.username,email:u.email,joined:u.joined});
const attempts=new Map();
http.createServer(async(req,res)=>{
 const origin=req.headers.origin;if(origin&&!['http://localhost:5175','http://127.0.0.1:5175'].includes(origin))return json(res,403,{error:'Origin not allowed'});
 const path=new URL(req.url,'http://localhost').pathname;
 if(!path.startsWith('/api/'))return json(res,404,{error:'Not found'});
 if(req.method==='GET'&&path==='/api/me'){const u=current(req);return json(res,200,{user:u?publicUser(u):null})}
 if(req.method!=='POST'||!['/api/register','/api/login','/api/logout'].includes(path))return json(res,404,{error:'Not found'});
 if(path==='/api/logout'){res.setHeader('Set-Cookie','cpp_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return json(res,200,{ok:true})}
 const ip=req.socket.remoteAddress||'unknown',now=Date.now();const recent=(attempts.get(ip)||[]).filter(t=>now-t<15*60_000);if(recent.length>=25)return json(res,429,{error:'Too many attempts. Try again later.'});recent.push(now);attempts.set(ip,recent);
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16_384)return json(res,413,{error:'Request too large'})}
 let body;try{body=JSON.parse(raw)}catch{return json(res,400,{error:'Invalid request'})}
 const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
 if(path==='/api/register'){
 const username=String(body.username||'').trim();if(!/^[a-zA-Z0-9_-]{3,24}$/.test(username))return json(res,400,{error:'Username must be 3–24 letters, numbers, _ or -'});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json(res,400,{error:'Enter a valid email address'});
 if(password.length<10||password.length>128)return json(res,400,{error:'Password must be 10–128 characters'});
 if(users.some(u=>u.email===email||u.username.toLowerCase()===username.toLowerCase()))return json(res,409,{error:'Email or username already registered'});
 const salt=randomBytes(24).toString('hex');const u={id:randomBytes(16).toString('hex'),username,email,salt,passwordHash:hash(password,salt),joined:Date.now()};users.push(u);await save();session(res,u);return json(res,201,{user:publicUser(u)})
 }
 const u=users.find(x=>x.email===email);const compare=hash(password,u?.salt||'a'.repeat(48));const stored=u?.passwordHash||'0'.repeat(128);if(!u||!timingSafeEqual(Buffer.from(compare,'hex'),Buffer.from(stored,'hex')))return json(res,401,{error:'Invalid email or password'});
 session(res,u);return json(res,200,{user:publicUser(u)})
}).listen(PORT,'127.0.0.1',()=>console.log(`Car Part Picker auth API: http://127.0.0.1:${PORT}`));
