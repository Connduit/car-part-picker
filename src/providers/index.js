// Data-provider interfaces. The app talks only to these; real integrations implement the same methods (see docs/INTEGRATIONS.md).
// Nothing here reaches the network. The only implementations are local sample/fixture providers, and they say so in every record.
/** @typedef {{partId:number,retailer:string,price:{amount:number,currency:string},availability:'in_stock'|'out_of_stock'|'backorder'|'unknown',url:string|null,shippingAmount:number|null,observedAt:string,source:{provider:string,type:'fixture'|'affiliate_feed'|'manufacturer'|'api',fixture:boolean,label:string}}} Offer */
export const CONTRACTS={
 vehicle:['listPlatforms','getGeneration'],            // vehicle database: platforms -> generations -> trims/engines
 catalog:['searchParts','getPart'],                    // manufacturer catalog: part identity + specifications
 fitment:['getRecords'],                               // fitment records (see src/fitment.js record shape)
 price:['getOffers','getPriceHistory']};               // authorized retailer feed / pricing service -> Offer[]
export function assertProvider(kind,p){const need=CONTRACTS[kind];if(!need)throw new Error('Unknown provider kind '+kind);const miss=need.filter(m=>typeof p?.[m]!=='function');if(miss.length)throw new Error(`Provider for "${kind}" is missing: ${miss.join(', ')}`);if(!p.id||typeof p.fixture!=='boolean')throw new Error(`Provider for "${kind}" must expose id and fixture (true for sample/fixture data)`);return p}
const AV=['in_stock','out_of_stock','backorder','unknown'];
export function validateOffer(o){const e=[];if(!o||typeof o!=='object')return['not an object'];if(!Number.isInteger(o.partId))e.push('partId');if(!o.retailer||typeof o.retailer!=='string')e.push('retailer');if(!(o.price&&Number.isFinite(o.price.amount)&&o.price.amount>=0))e.push('price.amount');if(!/^[A-Z]{3}$/.test(o.price?.currency||''))e.push('price.currency (ISO 4217)');if(!AV.includes(o.availability))e.push('availability');if(!(typeof o.observedAt==='string'&&Number.isFinite(Date.parse(o.observedAt))))e.push('observedAt (ISO timestamp)');if(!(o.source&&o.source.provider&&typeof o.source.fixture==='boolean'))e.push('source.provider/fixture');if(o.url!=null&&!/^https:\/\//.test(o.url))e.push('url must be https');return e}
export const DAY=864e5;
export const isStale=(o,now=Date.now(),maxAgeMs=7*DAY)=>now-Date.parse(o.observedAt)>maxAgeMs;
// Usable = fresh, orderable, in the wanted currency. Stale or out-of-stock offers are shown but never used as "best" and never silently priced in.
export function summarizeOffers(list,{now=Date.now(),maxAgeMs=7*DAY,currency='USD'}={}){const offers=[],warnings=[];for(const o of list){const bad=validateOffer(o);if(bad.length){warnings.push('Dropped invalid offer: '+bad.join(', '));continue}const stale=isStale(o,now,maxAgeMs),ageDays=Math.floor((now-Date.parse(o.observedAt))/DAY),usable=!stale&&o.availability!=='out_of_stock'&&o.price.currency===currency;offers.push({...o,stale,ageDays,usable})}
const best=offers.filter(o=>o.usable).sort((a,b)=>a.price.amount-b.price.amount)[0]||null;if(!best)warnings.push('No fresh, in-stock offer available; show list price only as a sample.');if(offers.some(o=>o.stale))warnings.push('Some offers are older than '+Math.round(maxAgeMs/DAY)+' days and are excluded from the best price.');return{offers,best,warnings}}
const FX={provider:'fixture',type:'fixture',fixture:true,label:'Sample fixture, not live data'};
export class FixturePriceProvider{id='fixture-price';fixture=true;
 constructor(parts,{now=Date.now()}={}){this.parts=parts;this.now=now}
 async getOffers(id){const p=this.parts[id];if(!p)return[];const t=d=>new Date(this.now-d*DAY).toISOString(),o=(retailer,mult,age,av)=>({partId:p.id,retailer,price:{amount:Math.round(p.price*mult),currency:'USD'},availability:av,url:null,shippingAmount:null,observedAt:t(age),source:FX});
 return[o('Sample Retailer A',1,1,id%7===0?'out_of_stock':'in_stock'),o('Sample Retailer B',1.04,20,'in_stock'),o('Sample Retailer C',1.02,2,id%5===0?'backorder':'in_stock')]}
 async getPriceHistory(){return[]}}
export class SampleVehicleProvider{id='sample-vehicles';fixture=true;constructor(platforms,generations){this.p=platforms;this.g=generations}async listPlatforms(){return this.p}async getGeneration(id){return Object.hasOwn(this.g,id)?this.g[id]:null}}
export class SampleCatalogProvider{id='sample-catalog';fixture=true;constructor(parts){this.parts=parts}async getPart(id){return Object.hasOwn(this.parts,id)?this.parts[id]:null}async searchParts(q=''){q=q.toLowerCase();return Object.values(this.parts).filter(p=>!q||(p.name+p.brand).toLowerCase().includes(q))}}
export class SampleFitmentProvider{id='sample-fitment';fixture=true;constructor(parts){this.parts=parts}async getRecords(partId){return this.parts[partId]?.records||[]}}
const IMPLEMENTED={fixture:true,sample:true};
// WRENCH_<KIND>_PROVIDER selects an implementation. Only "fixture"/"sample" exist; anything else fails loudly instead of pretending.
export function createProviders({parts,platforms,generations},env=process.env,now=Date.now()){
for(const k of['VEHICLE','CATALOG','FITMENT','PRICE']){const v=env['WRENCH_'+k+'_PROVIDER'];if(v&&!IMPLEMENTED[v])throw new Error(`WRENCH_${k}_PROVIDER="${v}" is not implemented in this build. See docs/INTEGRATIONS.md to add one.`)}
return{vehicle:assertProvider('vehicle',new SampleVehicleProvider(platforms,generations)),catalog:assertProvider('catalog',new SampleCatalogProvider(parts)),fitment:assertProvider('fitment',new SampleFitmentProvider(parts)),price:assertProvider('price',new FixturePriceProvider(parts,{now}))}}
