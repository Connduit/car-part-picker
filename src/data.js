// ILLUSTRATIVE SAMPLE DATA. No record is verified; set ver:true only with a cited source.
// wheel: SAMPLE width (in) / offset (mm) envelopes, unverified.
export const vehicles={nb:{id:'nb',bp:'4x100',wheel:{w:[6,8.5],off:[20,45]}},nd:{id:'nd',bp:'4x100',wheel:{w:[6,9],off:[25,50]}},brz:{id:'brz',bp:'5x100',wheel:{w:[6.5,9],off:[30,55]}}};
export const parts={
1:{id:1,cat:'Engine',name:'Turbo kit (sample)',fit:['nb','nd'],needs:['inj','tune'],price:3400},
2:{id:2,cat:'Fuel',name:'Injectors (sample)',tag:'inj',fit:['nb','nd','brz'],price:420},
3:{id:3,cat:'ECU',name:'ECU tune (sample)',tag:'tune',fit:['nb','nd'],price:900},
4:{id:4,cat:'Suspension',name:'Coilovers A (sample)',fit:['nb','nd','brz'],price:1100},
5:{id:5,cat:'Suspension',name:'Coilovers B (sample)',fit:['nb','nd'],price:1300},
6:{id:6,cat:'Wheels',name:'17x9 4x100 (sample)',bp:'4x100',wheelW:9,off:45,fit:['nb','nd'],price:1600},
7:{id:7,cat:'Wheels',name:'17x7 5x100 (sample)',bp:'5x100',wheelW:7,off:48,fit:['brz'],price:900},
8:{id:8,cat:'Tires',name:'245/40R17 (sample)',tireW:245,fit:['nb','nd','brz'],price:780}};
