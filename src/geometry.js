// Wheel/tire math. Everything here is a MATHEMATICAL ESTIMATE from nominal sizes, not a verified fitment spec.
export const parseTire=s=>{const m=/^(\d{3})\/(\d{2})R(\d{2})$/.exec(String(s));return m?{w:+m[1],ar:+m[2],dia:+m[3]}:null};
export const overallDia=t=>t.dia*25.4+2*t.w*t.ar/100;            // mm
export const speedoErrPct=(n,o)=>(overallDia(n)/overallDia(o)-1)*100; // + means speedometer under-reads
// Edge shift (mm) of a new wheel vs the stock wheel. outer>0 = lip moves outward. Tire width change adds half the delta each side.
export function edgeShift(stock,wheel,tire,stockTire){const dw=(wheel.w-stock.w)*12.7,outer=dw+(stock.off-wheel.off),inner=dw+(wheel.off-stock.off),te=tire&&stockTire?(tire.w-stockTire.w)/2:0;return{outer,inner,tireOuter:outer+te,tireInner:inner+te}}
