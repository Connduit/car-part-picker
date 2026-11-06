// Vehicle model: platform -> generation -> trims (engine + drivetrain). ALL VALUES ARE ILLUSTRATIVE SAMPLES, not manufacturer data.
// Generation ids double as the `vehicle` key used by builds and the compatibility engine.
import {vehicles} from './data.js';import {parseTire} from './geometry.js';
export const SOURCE={type:'illustrative_sample',name:'WrenchPicker sample',note:'Not verified against manufacturer data'};
const T=(...a)=>a;
export const platforms=[
{id:'mx5',make:'Mazda',model:'MX-5 Miata',gens:[
{id:'na',code:'NA',years:[1989,1997],bp:'4x100',stock:{dia:14,w:5.5,off:45,tire:'185/60R14'},env:{w:[5.5,7.5],off:[25,45]},clear:15,wt:2100,engines:{b6:['1.6L I4',115],b8:['1.8L I4',128]},trims:[T('Base 1.6','b6','RWD'),T('Base 1.8','b8','RWD')]},
{id:'nb',code:'NB',years:[1999,2005],bp:'4x100',stock:{dia:15,w:6,off:40,tire:'195/50R15'},env:{w:[6,8.5],off:[20,45]},clear:18,wt:2300,engines:{bp:['1.8L I4',140]},trims:[T('Base','bp','RWD'),T('Sport','bp','RWD')]},
{id:'nc',code:'NC',years:[2006,2015],bp:'5x114.3',stock:{dia:16,w:6.5,off:55,tire:'205/50R16'},env:{w:[6.5,9],off:[30,55]},clear:18,wt:2450,engines:{mz:['2.0L I4',170]},trims:[T('Sport','mz','RWD'),T('Touring','mz','RWD'),T('Grand Touring','mz','RWD')]},
{id:'nd',code:'ND',years:[2016,null],bp:'4x100',stock:{dia:17,w:7,off:45,tire:'205/45R17'},env:{w:[6,9],off:[25,50]},clear:20,wt:2330,engines:{sa:['2.0L I4',181]},trims:[T('Sport','sa','RWD'),T('Club','sa','RWD'),T('Grand Touring','sa','RWD')]}]},
{id:'brz',make:'Subaru / Toyota',model:'BRZ / GR86 twins',gens:[
{id:'brz',make:'Subaru',model:'BRZ',code:'ZC6',years:[2013,2020],bp:'5x100',stock:{dia:17,w:7,off:48,tire:'215/45R17'},env:{w:[6.5,9],off:[30,55]},clear:20,wt:2760,engines:{fa20:['2.0L H4',200]},trims:[T('Premium','fa20','RWD'),T('Limited','fa20','RWD')]},
{id:'gr86',make:'Toyota',model:'GR86',code:'ZN8',years:[2022,null],bp:'5x100',stock:{dia:17,w:7.5,off:48,tire:'215/45R17'},env:{w:[6.5,9],off:[30,55]},clear:20,wt:2830,engines:{fa24:['2.4L H4',228]},trims:[T('Base','fa24','RWD'),T('Premium','fa24','RWD')]}]},
{id:'s2k',make:'Honda',model:'S2000',gens:[{id:'ap1',code:'AP1',years:[2000,2003],bp:'5x114.3',stag:true,stock:{dia:16,w:6.5,off:55,tire:'205/55R16'},wt:2790,engines:{f20:['2.0L I4',240]},trims:[T('Base','f20','RWD')]}]},
{id:'350z',make:'Nissan',model:'350Z',gens:[{id:'z33',code:'Z33',years:[2003,2009],bp:'5x114.3',stock:{dia:17,w:7.5,off:30,tire:'225/45R17'},wt:3200,engines:{vq:['3.5L V6',287]},trims:[T('Base','vq','RWD'),T('Touring','vq','RWD'),T('Track','vq','RWD')]}]},
{id:'mustang',make:'Ford',model:'Mustang',gens:[{id:'s550',code:'S550',years:[2015,2023],bp:'5x114.3',stock:{dia:18,w:8,off:50,tire:'235/50R18'},wt:3700,engines:{eb:['2.3L I4 turbo',310],gt:['5.0L V8',435]},trims:[T('EcoBoost','eb','RWD'),T('GT','gt','RWD'),T('GT Performance Pack','gt','RWD')]}]},
{id:'3',make:'BMW',model:'M3',gens:[{id:'e46',code:'E46',years:[2001,2006],bp:'5x120',stag:true,stock:{dia:18,w:8,off:47,tire:'225/45R18'},wt:3450,engines:{s54:['3.2L I6',333]},trims:[T('M3','s54','RWD')]}]},
{id:'golf',make:'Volkswagen',model:'Golf GTI',gens:[{id:'mk7',code:'Mk7',years:[2015,2021],bp:'5x112',stock:{dia:17,w:7.5,off:49,tire:'225/45R17'},wt:3050,engines:{ea:['2.0L I4 turbo',220]},trims:[T('S','ea','FWD'),T('SE','ea','FWD'),T('Autobahn','ea','FWD')]}]}];
export const generations={};
for(const pl of platforms)for(const g of pl.gens){const make=g.make||pl.make,model=g.model||pl.model,engines=Object.entries(g.engines).map(([id,[name,hp]])=>({id,name:name+' (sample)',hp})),trims=g.trims.map(([name,engine,drive])=>({name,engine,drive})),yl=g.years[1]?`${g.years[0]}–${g.years[1]}`:`${g.years[0]}–present`;
const tire=parseTire(g.stock.tire);
generations[g.id]={id:g.id,platform:pl.id,make,model,code:g.code,name:`${make} ${model} (${g.code})`,years:g.years,yearsLabel:yl,engines,trims,drives:[...new Set(trims.map(t=>t.drive))],bp:g.bp,stock:{...g.stock,tireSpec:tire},env:g.env||null,clear:g.clear??null,staggered:!!g.stag,weight:'~'+g.wt.toLocaleString('en-US')+' lb',stockHp:Math.max(...engines.map(e=>e.hp))};
vehicles[g.id]={...(vehicles[g.id]||{}),id:g.id,bp:g.bp,wheel:g.env?{...g.env}:undefined,stock:{...g.stock,tireSpec:tire},stockTire:tire,clear:g.clear,staggered:!!g.stag,years:g.years,trims:g.trims.map(t=>t[0]),source:SOURCE}}
export const yearsOf=g=>{const e=g.years[1]??new Date().getFullYear()+1,a=[];for(let y=g.years[0];y<=e;y++)a.push(y);return a};
// Validate + normalize an editable vehicle profile. Returns {profile,errors}. Unknown keys are dropped; trim implies engine/drivetrain.
export function normalizeProfile(genId,p){const g=Object.hasOwn(generations,genId)?generations[genId]:null,e=[];p=p&&typeof p==='object'?p:{};const o={};
if(!g)return{profile:{},errors:['unknown vehicle']};
if(p.year!=null&&p.year!==''){const y=+p.year;if(!Number.isInteger(y)||!yearsOf(g).includes(y))e.push(`year must be within ${g.yearsLabel}`);else o.year=y}
if(p.trim){const t=g.trims.find(x=>x.name===p.trim);if(!t)e.push('unknown trim for this vehicle');else{o.trim=t.name;o.engine=t.engine;o.drivetrain=t.drive}}
if(p.engine&&!o.engine){if(!g.engines.some(x=>x.id===p.engine))e.push('unknown engine for this vehicle');else o.engine=p.engine}
else if(p.engine&&o.engine&&p.engine!==o.engine)e.push('engine does not match the selected trim');
if(p.drivetrain&&!o.drivetrain){if(!g.drives.includes(p.drivetrain))e.push('unknown drivetrain for this vehicle');else o.drivetrain=p.drivetrain}
for(const[k,n]of[['nickname',60],['notes',1000]])if(p[k]!=null&&p[k]!==''){if(typeof p[k]!=='string'||p[k].length>n)e.push(`${k} must be text up to ${n} characters`);else o[k]=p[k]}
if(p.mileage!=null&&p.mileage!==''){const m=+p.mileage;if(!Number.isInteger(m)||m<0||m>2000000)e.push('mileage must be 0-2,000,000');else o.mileage=m}
return{profile:o,errors:e}}
