// ILLUSTRATIVE SAMPLE PARTS. Names, specs and prices are invented for the demo; none is a real product or verified fitment.
import {parts} from './data.js';import {parseTire} from './geometry.js';import {ILLUSTRATIVE,registerFitment} from './fitment.js';
const ALL='na nb nc nd brz gr86 ap1 z33 s550 e46 mk7';
// [id,category,name,price,generations,specs,props]
const D=[
[16,'Exhaust','Cold air intake (sample)',280,'na nb nc nd brz gr86 mk7','Type=Cold air intake;Filter=Cone',{}],
[17,'Exhaust','Equal-length header (sample)',650,'brz nc nd','Type=Equal-length header;Material=Stainless',{}],
[18,'Exhaust','Axle-back exhaust (sample)',420,'z33 s550 e46 mk7 ap1','Type=Axle-back;Material=Stainless',{}],
[19,'Suspension','Lowering springs (sample)',260,'na nb nc nd brz gr86 mk7 s550 z33','Type=Lowering springs;Drop=~1 in',{}],
[20,'Suspension','Front & rear sway bar kit (sample)',380,'na nb nc nd brz gr86 mk7 s550 z33','Type=Sway bar kit;Adjustable=Yes',{slot:'sway'}],
[21,'Drivetrain','Performance clutch kit (sample)',520,'na nb nc nd brz gr86 z33 s550','Type=Clutch kit;Torque rating=sample only',{}],
[22,'Drivetrain','Limited-slip differential (sample)',900,'nb nc z33','Type=LSD;Style=Helical',{}],
[23,'Chassis','Strut tower brace (sample)',140,'na nb nc nd brz gr86 mk7','Type=Strut brace;Material=Aluminum',{}],
[24,'Exterior','Front splitter (sample)',360,'nd brz gr86 s550','Type=Front splitter;Material=ABS',{}],
[25,'Exterior','Rear wing (sample)',480,'brz gr86 z33 s550 mk7 e46','Type=Rear wing;Material=Aluminum',{}],
[26,'Brakes','Performance brake pads (sample)',120,ALL,'Type=Pads;Compound=Street/track',{}],
[27,'Brakes','Stainless brake lines (sample)',95,ALL,'Type=Braided lines;Quantity=Set',{}],
[28,'Brakes','6-pot big brake kit (sample)',2600,'s550 e46 z33','Pistons=6;Rotor=380 mm;Minimum wheel=17 in',{needs:['w17']}],
[29,'Cooling','Oil cooler kit (sample)',380,'nb nc nd brz gr86 s550 z33','Type=Oil cooler;Rows=13',{tag:'oilcool'}],
[30,'Engine','Supercharger kit (sample)',5200,'nc s550 z33','Type=Supercharger;Boost=sample only',{needs:['inj','tune'],recommends:['fpump','oilcool'],slot:'fi'}],
[31,'Fuel','High-flow fuel pump (sample)',210,'nb nd nc brz gr86 s550 mk7 z33','Type=In-tank pump;Flow=sample only',{tag:'fpump'}],
[32,'ECU','Handheld tuner (sample)',450,'brz gr86 s550 z33 mk7','Type=Handheld tuner;Tuning=Not included',{tag:'tune'}],
[33,'Wheels','18x9.5 +22 5x114.3 wheel set (sample)',1900,'nc s550 z33','Material=Flow-formed',{bp:'5x114.3',wheelW:9.5,off:22,wheelDia:18,tag:'w17'}],
[34,'Wheels','18x8.5 +35 5x100 wheel set (sample)',1500,'brz gr86','Material=Cast',{bp:'5x100',wheelW:8.5,off:35,wheelDia:18,tag:'w17'}],
[35,'Wheels','17x8 +38 5x112 wheel set (sample)',1300,'mk7','Material=Cast',{bp:'5x112',wheelW:8,off:38,wheelDia:17,tag:'w17'}],
[36,'Wheels','17x8 +30 5x120 wheel set (sample)',1750,'e46','Material=Forged',{bp:'5x120',wheelW:8,off:30,wheelDia:17,tag:'w17'}],
[37,'Wheels','15x7 +30 4x100 wheel set (sample)',520,'na nb','Material=Cast',{bp:'4x100',wheelW:7,off:30,wheelDia:15}],
[38,'Tires','205/50R15 street tire set (sample)',520,'na nb','Type=Street;Quantity=Set of 4',{tire:'205/50R15'}],
[39,'Tires','225/45R17 summer tire set (sample)',720,'nb nd brz gr86 mk7','Type=Summer;Quantity=Set of 4',{tire:'225/45R17'}],
[40,'Tires','255/35R18 summer tire set (sample)',980,'nc brz gr86 s550 z33','Type=Summer;Quantity=Set of 4',{tire:'255/35R18'}],
[41,'Safety','4-point harness & bar (sample)',340,'na nb nc nd brz gr86','Type=Harness bar + harness',{}],
[42,'Misc','Alignment & corner balance service (sample)',180,ALL,'Type=Service;Labor=Included',{}]];
const gens={};
for(const[id,cat,name,price,g,spec,pr]of D){const p={id,cat,name,price,brand:'Sample Brand '+id,cond:'new',fit:g.split(' '),...pr};if(p.tire){p.spec=Object.fromEntries(spec.split(';').map(x=>x.split('=')));p.tire=parseTire(pr.tire);p.tireW=p.tire.w;p.spec.Size=pr.tire}else p.spec=Object.fromEntries(spec.split(';').map(x=>x.split('=')));
if(p.wheelW){p.spec.Size=`${p.wheelDia}x${p.wheelW}`;p.spec.Offset='+'+p.off;p.spec['Bolt pattern']=p.bp}parts[id]=p}
const note='Sample fitment record (illustrative)';
const base=()=>Object.values(parts).flatMap(p=>(p.fit||[]).map(gen=>({part:p.id,gen,effect:'fits',source:ILLUSTRATIVE,confidence:'low',note})));
export function buildRecords(){const R=base();
// Trim-restricted and exclusion examples (illustrative) plus a record-level required supporting mod.
const drop=(part,gen)=>{const i=R.findIndex(r=>r.part===part&&r.gen===gen);if(i>=0)R.splice(i,1)};
for(const[part,gen,trims]of[[22,'nd',['Sport','Grand Touring']],[22,'brz',['Premium']]]){drop(part,gen);R.push({part,gen,effect:'fits',trims,source:ILLUSTRATIVE,confidence:'low',note:'Illustrative record limited to listed trims'})}
R.push({part:22,gen:'nd',effect:'excludes',trims:['Club'],source:ILLUSTRATIVE,confidence:'low',note:'Illustrative exclusion example for the Club trim'});
R.push({part:17,gen:'gr86',effect:'excludes',source:ILLUSTRATIVE,confidence:'low',note:'Illustrative exclusion example: listed as not for this generation'});
drop(30,'nc');R.push({part:30,gen:'nc',effect:'fits',requires:['fpump'],source:ILLUSTRATIVE,confidence:'low',note:'Illustrative record that lists an upgraded fuel pump as required'});
return R}
export const registerSampleFitment=()=>registerFitment(parts,buildRecords());
