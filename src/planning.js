// Build planning summary: required/recommended supporting parts, unresolved questions, core vs optional cost, category budgets.
import {vehicles,parts} from './data.js';import {evaluate,requiredTags,baseFit,TAGS,totals} from './engine.js';
const add=(m,t,name)=>{const e=m.get(t)||{tag:t,label:TAGS[t]||t,neededBy:[]};if(!e.neededBy.includes(name))e.neededBy.push(name);m.set(t,e)};
export function plan(b){const v=vehicles[b.vehicle],ev=evaluate(b),have=new Set(b.items.map(i=>parts[i.id].tag).filter(Boolean)),inb=new Set(b.items.map(i=>i.id)),need=new Map(),rec=new Map();
const sugg=t=>Object.values(parts).filter(q=>q.tag===t&&!inb.has(q.id)&&baseFit(q,b.vehicle,b.profile||{})==='Likely Compatible').slice(0,3).map(q=>({id:q.id,name:q.name,price:q.price}));
b.items.forEach(i=>{const p=parts[i.id];for(const t of requiredTags(p,v,b))if(!have.has(t))add(need,t,p.name);for(const t of p.recommends||[])if(!have.has(t))add(rec,t,p.name)});
const fin=m=>[...m.values()].map(e=>({...e,suggestions:sugg(e.tag)}));
const unresolved=[];ev.forEach((e,n)=>{const bad=e.reasons.filter(r=>!r.advisory&&r.status!=='Likely Compatible'&&r.status!=='Verified Fitment');if(!bad.length||e.overridden)return;const kind=bad.every(r=>r.src==='dependency rule')?'dependency':bad.some(r=>r.src==='conflict rule')?'conflict':'question';unresolved.push({id:e.id,name:parts[e.id].name,status:e.status,kind,reasons:bad.map(r=>r.why)})});
const t=totals(b),spent={};b.items.forEach(i=>{const c=parts[i.id].cat;spent[c]=(spent[c]||0)+parts[i.id].price*i.qty+(i.labor||0)});
const cb=b.catBudgets||{},categories=[...new Set([...Object.keys(spent),...Object.keys(cb)])].map(cat=>({cat,spent:spent[cat]||0,budget:cb[cat]??null,over:cb[cat]!=null&&(spent[cat]||0)>cb[cat]}));
return{required:fin(need),recommended:fin(rec),unresolved,coreCost:t.core,optionalCost:t.optional,remaining:t.remaining,categories,counts:{required:need.size,recommended:rec.size,unresolved:unresolved.length,optional:b.items.filter(i=>i.optional).length}}}
