// Structured fitment records.
// record: {part, gen, effect:'fits'|'excludes', trims?, engines?, years?:[a,b], source:{type,name,ref?,asOf?}, confidence:'high'|'medium'|'low',
//          verified?:boolean (only honored when source.type is 'manufacturer' or 'retailer'), note?, requires?:[tag]}
export const ILLUSTRATIVE={type:'illustrative_sample',name:'WrenchPicker sample'};
export const VERIFIABLE=['manufacturer','retailer'];
export function applicability(r,profile={}){for(const[k,pk]of[['trims','trim'],['engines','engine']])if(r[k]){const v=profile[pk];if(v==null)return'unknown';if(!r[k].includes(v))return'no'}
if(r.years){const y=profile.year;if(y==null)return'unknown';if(y<r.years[0]||y>r.years[1])return'no'}return'yes'}
const label=r=>`${r.source.name} · ${r.source.type}${r.source.asOf?' · '+r.source.asOf:''}`;
const restr=r=>[r.trims&&'trim: '+r.trims.join('/'),r.engines&&'engine: '+r.engines.join('/'),r.years&&'years: '+r.years.join('-')].filter(Boolean).join(', ');
// Returns {status,why,src,conf,requires}. Never claims Verified unless a verifiable-source record says so.
export function evaluateFitment(p,v,profile={}){
if(!p.records)return p.fit.includes(v.id)?{status:p.ver?'Verified Fitment':'Likely Compatible',why:p.ver?'Verified record':'Unverified sample record',src:'sample',conf:'low',requires:[]}:{status:'Unknown',why:'No fitment record for this vehicle (missing data, not a confirmed conflict)',src:'none',conf:'none',requires:[]};
const rs=p.records.filter(r=>r.gen===v.id).map(r=>[r,applicability(r,profile)]);
const ex=rs.find(([r,a])=>r.effect==='excludes'&&a==='yes');if(ex)return{status:'Incompatible',why:ex[0].note||'Known exclusion for this vehicle',src:label(ex[0]),conf:ex[0].confidence,requires:[]};
const fit=rs.filter(([r])=>r.effect==='fits'),yes=fit.filter(([,a])=>a==='yes');
if(yes.length){const [r]=yes[0],ver=r.verified===true&&VERIFIABLE.includes(r.source.type);return{status:ver?'Verified Fitment':'Likely Compatible',why:(r.note||'Fitment record listed')+(ver?'':' (not independently verified)'),src:label(r),conf:r.confidence,requires:[...new Set(yes.flatMap(([x])=>x.requires||[]))]}}
const unk=fit.find(([,a])=>a==='unknown');if(unk)return{status:'Unknown',why:`Fitment record is limited (${restr(unk[0])}); set the vehicle profile to confirm`,src:label(unk[0]),conf:'none',requires:[]};
if(fit.length)return{status:'Unknown',why:`Records exist only for other trims/engines/years (${restr(fit[0][0])}); not a confirmed incompatibility`,src:label(fit[0][0]),conf:'none',requires:[]};
return{status:'Unknown',why:'No fitment record for this vehicle (missing data, not a confirmed conflict)',src:'none',conf:'none',requires:[]}}
export const registerFitment=(parts,records)=>{for(const p of Object.values(parts))p.records=records.filter(r=>r.part===p.id)};
