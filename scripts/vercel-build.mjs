import { spawnSync } from "node:child_process";
const run = (cmd, args) => { const r = spawnSync(cmd,args,{stdio:"inherit",env:process.env}); if(r.status!==0) process.exit(r.status ?? 1); };
const pooled = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || pooled;
if (pooled) process.env.DATABASE_URL = pooled;
if (direct) process.env.DATABASE_URL_UNPOOLED = direct;
run("npx",["prisma","generate"]);
if (pooled) { let ok=false; for(let i=0;i<3&&!ok;i++){ const r=spawnSync("npx",["prisma","migrate","deploy"],{stdio:"inherit",env:process.env}); ok=r.status===0; if(!ok) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000*(i+1)); } if(!ok) process.exit(1); } else console.log("No database connected — skipping migrations");
run("npx",["next","build"]);
