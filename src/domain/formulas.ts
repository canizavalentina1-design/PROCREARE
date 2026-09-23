/** @status unvalidated - livestock specialist review pending. Units: kg/day. */
export function averageDailyGain(weighings: Array<{ date: Date; weightKg: number }>) {
  if (weighings.length < 2) return null;
  const sorted = [...weighings].sort((a,b)=>a.date.getTime()-b.date.getTime());
  const first = sorted[0], last = sorted[sorted.length-1];
  const days = (last.date.getTime()-first.date.getTime())/86400000;
  if (days <= 0) return null;
  return Math.round(((last.weightKg-first.weightKg)/days)*1000)/1000;
}
/** @status unvalidated - returns completed calendar months. */
export function ageInMonths(birthDate: Date, at = new Date()) {
  let months=(at.getFullYear()-birthDate.getFullYear())*12+at.getMonth()-birthDate.getMonth();
  if (at.getDate()<birthDate.getDate()) months--;
  return Math.max(0,months);
}
/** @status unvalidated - kg projection using kg/day and elapsed days. */
export function projectedWeight(last:{date:Date;weightKg:number}, adg:number, date:Date) { return last.weightKg + adg*Math.max(0,(date.getTime()-last.date.getTime())/86400000); }
/** @status unvalidated - kg/day difference from farm target. */
export function gainVsTarget(adg:number|null,target:number|null) { return adg===null||target===null?null:Math.round((adg-target)*1000)/1000; }
