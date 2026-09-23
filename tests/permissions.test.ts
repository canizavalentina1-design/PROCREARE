import { describe, expect, it } from "vitest";
import { can } from "../src/server/authz/permissions";
describe("permissions",()=>{it("keeps reader read-only",()=>{expect(can("READER","view")).toBe(true);expect(can("READER","editAnimals")).toBe(false);expect(can("READER","sales")).toBe(false)});it("keeps farm creation owner-only",()=>expect(can("MANAGER","createFarms")).toBe(false));});
