import { describe, expect, it } from "vitest";
import { ageInMonths, averageDailyGain, gainVsTarget } from "../src/domain/formulas";
describe("formulas",()=>{
  it("computes daily gain",()=>expect(averageDailyGain([{date:new Date("2025-01-01"),weightKg:100},{date:new Date("2025-01-11"),weightKg:120}])).toBe(2));
  it("returns null for insufficient data",()=>expect(averageDailyGain([])).toBeNull());
  it("computes age and target delta",()=>{expect(ageInMonths(new Date("2025-01-15"),new Date("2025-03-14"))).toBe(1);expect(gainVsTarget(1.2,1)).toBe(.2)});
});
