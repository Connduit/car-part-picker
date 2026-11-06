import http from 'node:http';import {readFileSync} from 'node:fs';import {randomBytes} from 'node:crypto';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {vehicles,parts} from './data.js';import {vehicleInfo,PLATFORMS,samples,guides,CATS} from './extra.js';import {generations,platforms,normalizeProfile} from './vehicles.js';
import {evaluate,totals,validateBuild,baseFit,ORDER,TAGS} from './engine.js';import {evaluateFitment} from './fitment.js';import {plan} from './planning.js';import {createProviders,summarizeOffers} from './providers/index.js';import {Store} from './store.js';import {loadDir,CompositePriceProvider} from './importer.js';
const PUB=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','public');
const FILES={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
const SPA=/^\/(vehicles|catalog|builds|guides|garage|compare|t\/[sg]\d+|part\/\d+|build\/[a-f0-9]+|b\/[a-f0-9]+)$/;
const bad=(s,m)=>Object.assign(new Error(m),{status:s});
const TYPES=['Daily driver','Street','Track','Drift','Drag','Off-road','Restoration','Show'];
const LIMITS={builds:50,templates:25,total:5000};
const pub=p=>({id:p.id,name:p.name,cat:p.cat,brand:p.brand,cond:p.cond,price:p.price,needs:p.needs||[],recommends:p.recommends||[],tag:p.tag||null,spec:p.spec||{},sample:!p.imported,dataset:p.dataset||null});
const newItem=id=>({id,qty:1,labor:0,status:'Planned',note:'',override:'',retailer:'Sample Retailer A',optional:false});
function clean(b,old={}){const e=validateBuild(b);
if(!(Number.isFinite(+b.taxPct)&&b.taxPct>=0&&b.taxPct<=30))e.push('taxPct must be 0-30');
if(Array.isArray(b.items)){if(b.items.length>200)e.push('too many items');if(new Set(b.items.map(i=>i.id)).size!==b.items.length)e.push('duplicate parts')}
if(!TYPES.includes(b.type))e.push('invalid build type');
let profile={};if(Object.hasOwn(generations,b.vehicle)){const r=normalizeProfile(b.vehicle,b.profile);e.push(...r.errors);profile=r.profile}
const cb={};if(b.catBudgets!=null){if(typeof b.catBudgets!=='object'||Array.isArray(b.catBudgets))e.push('catBudgets must be an object');else for(const[k,v]of Object.entries(b.catBudgets)){if(!CATS.includes(k)||!(Number.isFinite(+v)&&v>=0&&v<=1e7)){e.push('invalid category budget for '+k);continue}cb[k]=+v}}
if(e.length)throw bad(400,e.join('; '));
return{...old,name:String(b.name||'Untitled build').slice(0,80),type:b.type,vehicle:b.vehicle,profile,catBudgets:cb,budget:+b.budget,taxPct:+b.taxPct,public:!!b.public,items:b.items.map(i=>({id:+i.id,qty:i.qty,labor:Math.max(0,+i.labor||0),status:['Planned','Ordered','Installed'].includes(i.status)?i.status:'Planned',note:String(i.note||'').slice(0,500),override:String(i.override||'').slice(0,500),retailer:String(i.retailer||'').slice(0,80),optional:!!i.optional}))}}
function view(b,owner){const ev=evaluate(b),mine=b.owner===owner,pr={...(b.profile||{})};if(!mine){delete pr.notes;delete pr.mileage}
return{id:b.id,name:b.name,type:b.type,vehicle:b.vehicle,vehicleName:vehicleInfo[b.vehicle].name,budget:b.budget,taxPct:b.taxPct,public:b.public,mine,updatedAt:b.updatedAt,profile:pr,catBudgets:b.catBudgets||{},totals:totals(b),plan:plan(b),template:b.kind==='sample',note:b.note,
items:b.items.map((i,n)=>({...i,note:mine?i.note:'',override:mine?i.override:'',name:parts[i.id].name,cat:parts[i.id].cat,price:parts[i.id].price,compat:ev[n].status,reasons:ev[n].reasons,overridden:ev[n].overridden}))}}
const summary=b=>({id:b.id,name:b.name,type:b.type,vehicle:b.vehicle,vehicleName:vehicleInfo[b.vehicle].name,budget:b.budget,public:b.public,count:b.items.length,total:totals(b).total,updatedAt:b.updatedAt});
const seed=s=>({id:s.id,name:s.name,type:s.type,vehicle:s.vehicle,budget:s.budget,taxPct:0,profile:{},catBudgets:{},items:s.items.map(i=>({...newItem(i),optional:!!(s.opt||[]).includes(i)})),note:s.note||s.tradeoff,kind:'sample'});
export function createServer({file,env=process.env,clock=()=>Date.now(),dataDir=env.WRENCH_DATA_DIR}){const store=new Store(file),prov=createProviders({parts,platforms,generations},env,clock()),datasets=dataDir?loadDir(dataDir):[];if(datasets.length)prov.price=new CompositePriceProvider(prov.price,datasets);
const fitStatus=(p,vid)=>baseFit(p,vid,{});
async function body(req){let n=0,c=[];for await(const x of req){n+=x.length;if(n>200000)throw bad(413,'Body too large');c.push(x)}try{return JSON.parse(Buffer.concat(c).toString()||'{}')}catch{throw bad(400,'Invalid JSON')}}
const mineCount=(o,kind)=>(kind==='t'?store.tall():store.all()).filter(x=>x.owner===o).length;
const create=(o,owner)=>{if(mineCount(owner)>=LIMITS.builds)throw bad(429,`Build limit reached (${LIMITS.builds}). Delete a build first.`);if(store.all().length>=LIMITS.total)throw bad(503,'Server build limit reached');const nb={...o,id:randomBytes(8).toString('hex'),owner,createdAt:Date.now(),updatedAt:Date.now()};store.put(nb);return view(nb,owner)};
async function api(req,res,u,owner){const m=req.method,p=u.pathname,q=u.searchParams;let r;
if(m==='GET'&&p==='/api/meta')return{vehicles:Object.entries(vehicleInfo).map(([id,v])=>({id,...v,bp:vehicles[id].bp,wheel:vehicles[id].wheel||null,clear:vehicles[id].clear??null,stock:generations[id].stock})),platforms:PLATFORMS,cats:CATS,types:TYPES,tags:TAGS,providers:Object.fromEntries(Object.entries(prov).map(([k,v])=>[k,{id:v.id,fixture:v.fixture}])),datasets:datasets.map(({offerList,...d})=>d),notice:datasets.length?`Sample data plus imported dataset(s): ${datasets.map(d=>d.name).join(', ')}. Sample records are illustrative and unverified; imported records carry their own sources.`:'Demo mode: all vehicles, parts, prices, retailers and builds are illustrative sample data. No fitment is verified.'};
if(m==='GET'&&(r=p.match(/^\/api\/vehicles\/([a-z0-9]+)$/))){const g=await prov.vehicle.getGeneration(r[1]);if(!g)throw bad(404,'Vehicle not found');return g}
if(m==='GET'&&p==='/api/parts'){let l=Object.values(parts);const s=(q.get('q')||'').toLowerCase(),vid=q.get('vehicle');if(vid&&!Object.hasOwn(vehicles,vid))throw bad(400,'unknown vehicle');
l=l.filter(x=>(!s||(x.name+x.brand).toLowerCase().includes(s))&&(!q.get('cat')||x.cat===q.get('cat'))&&(!q.get('cond')||x.cond===q.get('cond'))&&(!q.get('max')||x.price<=+q.get('max')));
l=l.map(x=>({...pub(x),fit:vid?fitStatus(x,vid):undefined}));if(vid&&q.get('fitOnly'))l=l.filter(x=>/Likely|Verified/.test(x.fit));
const so=q.get('sort');l.sort(so==='name'?(a,b)=>a.name.localeCompare(b.name):so==='new'?(a,b)=>b.id-a.id:(a,b)=>a.price-b.price);
const size=Math.min(100,Math.max(1,+q.get('pageSize')||8)),pages=Math.max(1,Math.ceil(l.length/size)),page=Math.min(pages,Math.max(1,+q.get('page')||1));return{items:l.slice((page-1)*size,page*size),total:l.length,page,pages}}
if(m==='GET'&&(r=p.match(/^\/api\/parts\/(\d+)$/))){const x=await prov.catalog.getPart(+r[1]);if(!x)throw bad(404,'Part not found');
const s=summarizeOffers(await prov.price.getOffers(x.id),{now:clock(),currency:'USD'}),hist=await prov.price.getPriceHistory(x.id),recs=await prov.fitment.getRecords(x.id);
return{...pub(x),listPrice:x.price,offers:s.offers,bestOffer:s.best,offerWarnings:s.warnings,priceHistory:hist.length?hist:null,priceSource:{provider:prov.price.id,fixture:s.offers.length?s.offers.every(o=>o.source.fixture):null},
fitment:Object.keys(generations).map(g=>{const f=evaluateFitment(x,vehicles[g],{}),mis=x.bp&&x.bp!==vehicles[g].bp;return{vehicle:g,name:generations[g].name,status:fitStatus(x,g),why:mis?`Bolt pattern ${x.bp} vs ${vehicles[g].bp}`:f.why,source:mis?'vehicle spec':f.src,confidence:mis?'medium':f.conf,records:recs.filter(y=>y.gen===g).map(y=>({effect:y.effect,trims:y.trims||null,engines:y.engines||null,years:y.years||null,requires:y.requires||[],confidence:y.confidence,source:`${y.source.name} · ${y.source.type}`,note:y.note||''}))}})}}
if(m==='GET'&&(r=p.match(/^\/api\/templates\/([sg]\d+)$/))){const f=[...samples,...guides].find(x=>x.id===r[1]);if(!f)throw bad(404,'Template not found');return view(seed(f),owner)}
if(m==='GET'&&p==='/api/community')return{builds:[...samples.map(s=>({...summary(seed(s)),sample:true,note:s.note})),...store.all().filter(b=>b.public).map(summary)]};
if(m==='GET'&&p==='/api/guides')return{guides:guides.map(g=>({...summary(seed(g)),tradeoff:g.tradeoff,editorial:true,sample:true}))};
if(m==='GET'&&p==='/api/builds')return{builds:store.all().filter(b=>b.owner===owner).map(summary)};
if(m==='GET'&&p==='/api/user-templates')return{templates:store.tall().filter(t=>t.owner===owner).map(t=>({id:t.id,name:t.name,vehicle:t.vehicle,vehicleName:vehicleInfo[t.vehicle].name,type:t.type,budget:t.budget,count:t.items.length,total:totals(t).total}))};
if(m==='POST'&&p==='/api/user-templates'){const b=await body(req),src=store.get(String(b.buildId));if(!src||src.owner!==owner)throw bad(404,'Build not found');if(mineCount(owner,'t')>=LIMITS.templates)throw bad(429,`Template limit reached (${LIMITS.templates})`);
const name=String(b.name||'').trim().slice(0,80);if(!name)throw bad(400,'Template name required');const {notes,mileage,nickname,...pr}=src.profile||{};
const t={id:randomBytes(8).toString('hex'),owner,name,vehicle:src.vehicle,type:src.type,budget:src.budget,taxPct:0,profile:pr,catBudgets:src.catBudgets||{},items:src.items.map(i=>({id:i.id,qty:i.qty,labor:i.labor,optional:!!i.optional})),createdAt:Date.now()};store.tput(t);return{id:t.id,name:t.name}}
if(m==='DELETE'&&(r=p.match(/^\/api\/user-templates\/([a-f0-9]+)$/))){const t=store.tget(r[1]);if(!t||t.owner!==owner)throw bad(404,'Template not found');store.tdel(t.id);return{ok:true}}
if(m==='POST'&&p==='/api/builds'){const b=await body(req);let src={name:b.name,type:b.type||'Street',vehicle:b.vehicle,budget:b.budget??5000,taxPct:0,profile:b.profile,items:[]};
if(b.from){const f=[...samples,...guides].find(x=>x.id===b.from);if(!f)throw bad(404,'Template not found');src={...seed(f),name:f.name+' (copy)'}}
else if(b.fromTemplate){const t=store.tget(String(b.fromTemplate));if(!t||t.owner!==owner)throw bad(404,'Template not found');src={...t,name:t.name+' (from template)',items:t.items.map(i=>({...newItem(i.id),qty:i.qty,labor:i.labor,optional:i.optional}))}}
return create(clean(src),owner)}
if(r=p.match(/^\/api\/builds\/([a-f0-9]+)(\/duplicate)?$/)){const b=store.get(r[1]);if(!b||(b.owner!==owner&&!b.public))throw bad(404,'Build not found');
if(m==='GET')return view(b,owner);
if(r[2]&&m==='POST')return create(clean({...b,name:b.name+' (copy)',public:false,profile:{...b.profile,notes:undefined,mileage:undefined}}),owner);
if(b.owner!==owner)throw bad(403,'Not your build');
if(m==='PUT'){const x=await body(req);const nb={...clean({...x,vehicle:b.vehicle},b),updatedAt:Date.now()};store.put(nb);return view(nb,owner)}
if(m==='DELETE'){store.del(b.id);return{ok:true}}}
throw bad(404,'Not found')}
return http.createServer(async(req,res)=>{const h={'x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'",'referrer-policy':'no-referrer'};
const out=(s,t,b,x={})=>{res.writeHead(s,{...h,'content-type':t,...x});res.end(b)};
try{const u=new URL(req.url,'http://x');if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'')&&!env.ALLOW_ANY_HOST)throw bad(400,'Unexpected Host header');if(req.method!=='GET'&&req.method!=='HEAD'){const o=req.headers.origin;if(o&&new URL(o).host!==req.headers.host)throw bad(403,'Cross-origin request blocked');if(!/^application\/json/.test(req.headers['content-type']||''))throw bad(415,'Content-Type must be application/json')}
const ck=/(?:^|; )wk=([a-f0-9]{32})/.exec(req.headers.cookie||'');const owner=ck?ck[1]:randomBytes(16).toString('hex');const sc=ck?{}:{'set-cookie':`wk=${owner}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`};
if(u.pathname.startsWith('/api/')){const j=await api(req,res,u,owner);return out(200,'application/json',JSON.stringify(j),{...sc,'cache-control':'no-store'})}
const f=FILES[u.pathname]||(SPA.test(u.pathname)&&FILES['/']);if(f&&req.method==='GET')return out(200,f[1]+'; charset=utf-8',readFileSync(path.join(PUB,f[0])),sc);
if(req.method==='GET')return out(404,'text/html; charset=utf-8',readFileSync(path.join(PUB,'index.html')),sc);throw bad(404,'Not found')}catch(e){const s=e.status||500;if(s===500)console.error(e);out(s,'application/json',JSON.stringify({error:s===500?'Internal error':e.message}))}})}
