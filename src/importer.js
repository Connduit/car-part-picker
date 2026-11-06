// Dataset importer: load operator-supplied JSON (parts, fitment records, offers) from WRENCH_DATA_DIR. All-or-nothing validation per file.
// The app cannot verify that a dataset is true; it only enforces shape, provenance fields and the rules for claiming "verified".
import {readdirSync,readFileSync,statSync} from 'node:fs';import path from 'node:path';
import {parts as PARTS,vehicles} from './data.js';import {CATS} from './extra.js';import {parseTire} from './geometry.js';import {validateOffer,summarizeOffers} from './providers/index.js';import {VERIFIABLE} from './fitment.js';
const SRC=['manufacturer','retailer','community','illustrative_sample'],CONF=['high','medium','low'],TAG=/^[a-z0-9-]{1,20}$/,KEY=/^[A-Za-z0-9 ._/+()-]{1,40}$/,BAD=new Set(['__proto__','constructor','prototype']);
const LIM={parts:5000,fitment:50000,offers:50000,file:5e6,files:20};
export function validateDataset(ds,{parts=PARTS}={}){const e=[],add=m=>{if(e.length<50)e.push(m)};if(!ds||typeof ds!=='object'||Array.isArray(ds))return['dataset must be a JSON object'];
const m=ds.meta;if(!m||typeof m.name!=='string'||!m.name.trim()||m.name.length>80)add('meta.name is required (max 80 chars)');if(!m||!Number.isFinite(Date.parse(m?.asOf)))add('meta.asOf must be an ISO date');
const P=Array.isArray(ds.parts)?ds.parts:[],F=Array.isArray(ds.fitment)?ds.fitment:[],O=Array.isArray(ds.offers)?ds.offers:[];for(const k of['parts','fitment','offers'])if(ds[k]!=null&&!Array.isArray(ds[k]))add(k+' must be an array');
if(P.length>LIM.parts||F.length>LIM.fitment||O.length>LIM.offers)add('dataset too large');
const ids=new Set(),tags=a=>Array.isArray(a)&&a.length<=10&&a.every(t=>typeof t==='string'&&TAG.test(t));
P.forEach((p,n)=>{const w=`parts[${n}]`;if(!p||typeof p!=='object')return add(w+' must be an object');
if(!Number.isInteger(p.id)||p.id<1000||p.id>999999)add(`${w}.id must be an integer 1000-999999`);else if(Object.hasOwn(parts,p.id)||ids.has(p.id))add(`${w}.id ${p.id} already exists`);ids.add(p.id);
if(!CATS.includes(p.cat))add(`${w}.cat must be one of: ${CATS.join(', ')}`);if(typeof p.name!=='string'||!p.name.trim()||p.name.length>120)add(`${w}.name is required (max 120)`);if(!(Number.isFinite(p.price)&&p.price>=0&&p.price<1e7))add(`${w}.price must be a number >= 0`);
if(p.brand!=null&&(typeof p.brand!=='string'||p.brand.length>60))add(`${w}.brand invalid`);if(p.cond!=null&&!['new','used','refurbished'].includes(p.cond))add(`${w}.cond invalid`);
if(p.tire!=null&&!parseTire(p.tire))add(`${w}.tire must look like 255/35R18`);for(const k of['wheelW','off','wheelDia'])if(p[k]!=null&&!Number.isFinite(p[k]))add(`${w}.${k} must be a number`);
if(p.bp!=null&&!/^\dx\d{2,3}(\.\d)?$/.test(p.bp))add(`${w}.bp must look like 5x114.3`);if(p.wheelW!=null&&(p.off==null||p.wheelDia==null||p.bp==null))add(`${w}: wheels need wheelW, off, wheelDia and bp together`);
for(const k of['tag','slot'])if(p[k]!=null&&!TAG.test(p[k]))add(`${w}.${k} invalid`);for(const k of['needs','recommends'])if(p[k]!=null&&!tags(p[k]))add(`${w}.${k} must be a short list of tags`);
if(p.spec!=null){if(typeof p.spec!=='object'||Array.isArray(p.spec)||Object.keys(p.spec).length>20)add(`${w}.spec must be an object (max 20 entries)`);else for(const[k,v]of Object.entries(p.spec))if(!KEY.test(k)||BAD.has(k)||typeof v!=='string'||v.length>120)add(`${w}.spec["${k.slice(0,20)}"] invalid`)}});
const known=id=>ids.has(id)||Object.hasOwn(parts,id);
F.forEach((r,n)=>{const w=`fitment[${n}]`;if(!r||typeof r!=='object')return add(w+' must be an object');if(!known(r.part))add(`${w}.part ${r.part} is unknown`);if(!Object.hasOwn(vehicles,r.gen))add(`${w}.gen "${String(r.gen).slice(0,20)}" is not a known generation`);
if(!['fits','excludes'].includes(r.effect))add(`${w}.effect must be fits or excludes`);const s=r.source;if(!s||!SRC.includes(s.type)||typeof s.name!=='string'||!s.name.trim())add(`${w}.source needs a valid type (${SRC.join('/')}) and name`);
if(!CONF.includes(r.confidence))add(`${w}.confidence must be high, medium or low`);
if(r.verified!=null&&typeof r.verified!=='boolean')add(`${w}.verified must be boolean`);
if(r.verified===true&&!(s&&VERIFIABLE.includes(s.type)&&typeof s.ref==='string'&&s.ref.trim()&&Number.isFinite(Date.parse(s.asOf))))add(`${w}: verified:true requires source.type manufacturer/retailer plus source.ref and source.asOf`);
for(const k of['trims','engines'])if(r[k]!=null&&!(Array.isArray(r[k])&&r[k].length<=20&&r[k].every(x=>typeof x==='string'&&x.length<=40)))add(`${w}.${k} must be a list of strings`);
if(r.years!=null&&!(Array.isArray(r.years)&&r.years.length===2&&r.years.every(Number.isInteger)&&r.years[0]<=r.years[1]))add(`${w}.years must be [from,to]`);if(r.requires!=null&&!tags(r.requires))add(`${w}.requires must be a short list of tags`);if(r.note!=null&&(typeof r.note!=='string'||r.note.length>300))add(`${w}.note too long`)});
O.forEach((o,n)=>{const bad=validateOffer(o);if(bad.length)add(`offers[${n}] invalid: ${bad.join(', ')}`);else if(!known(o.partId))add(`offers[${n}].partId ${o.partId} is unknown`)});
return e}
// Applies a validated dataset to the live catalog. Throws before changing anything if invalid.
export function applyDataset(ds,{parts=PARTS}={}){const e=validateDataset(ds,{parts});if(e.length)throw new Error('Invalid dataset: '+e.join('; '));const name=ds.meta.name.trim();
for(const p of ds.parts||[]){const t=p.tire?parseTire(p.tire):undefined;parts[p.id]={id:p.id,cat:p.cat,name:p.name,price:p.price,brand:p.brand||'Unbranded',cond:p.cond||'new',fit:[],records:[],spec:Object.fromEntries(Object.entries(p.spec||{})),dataset:name,imported:true,...(p.bp&&{bp:p.bp}),...(p.wheelW!=null&&{wheelW:p.wheelW,off:p.off,wheelDia:p.wheelDia}),...(t&&{tire:t,tireW:t.w}),...(p.tag&&{tag:p.tag}),...(p.slot&&{slot:p.slot}),...(p.needs&&{needs:p.needs}),...(p.recommends&&{recommends:p.recommends})}}
for(const r of ds.fitment||[])parts[r.part].records=[...(parts[r.part].records||[]),{part:r.part,gen:r.gen,effect:r.effect,source:{...r.source},confidence:r.confidence,verified:r.verified===true,...(r.trims&&{trims:r.trims}),...(r.engines&&{engines:r.engines}),...(r.years&&{years:r.years}),...(r.requires&&{requires:r.requires}),...(r.note&&{note:r.note})}];
return{name,asOf:ds.meta.asOf,parts:(ds.parts||[]).length,fitment:(ds.fitment||[]).length,offers:(ds.offers||[]).length,verifiedRecords:(ds.fitment||[]).filter(r=>r.verified===true).length,offerList:ds.offers||[]}}
export function loadDir(dir,{parts=PARTS}={}){const files=readdirSync(dir,{withFileTypes:true}).filter(d=>d.isFile()&&d.name.endsWith('.json')).map(d=>d.name).sort();if(files.length>LIM.files)throw new Error(`Too many dataset files (max ${LIM.files})`);const out=[];
for(const f of files){const fp=path.join(dir,f);if(statSync(fp).size>LIM.file)throw new Error(`${f}: file too large (max ${LIM.file} bytes)`);let ds;try{ds=JSON.parse(readFileSync(fp,'utf8'))}catch(x){throw new Error(`${f}: not valid JSON (${x.message})`)}try{out.push(applyDataset(ds,{parts}))}catch(x){throw new Error(`${f}: ${x.message}`)}}return out}
// Price provider that serves dataset offers for imported parts (never invents fixture offers for them) and falls back to the fixture base for sample parts.
export class CompositePriceProvider{id='composite-price';fixture=false;constructor(base,datasets,parts=PARTS){this.base=base;this.parts=parts;this.by=new Map();for(const d of datasets)for(const o of d.offerList)this.by.set(o.partId,[...(this.by.get(o.partId)||[]),o])}
async getOffers(id){if(this.by.has(id))return this.by.get(id);return this.parts[id]?.imported?[]:this.base.getOffers(id)}async getPriceHistory(id){return this.base.getPriceHistory(id)}}
