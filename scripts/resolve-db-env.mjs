const pooled = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || pooled;
if (pooled) process.env.DATABASE_URL = pooled;
if (direct) process.env.DATABASE_URL_UNPOOLED = direct;
const args = process.argv.slice(2);
if (args[0] === '--') process.argv.splice(0, 0, ...args.slice(1));
if (args.length && args[0] === '--') process.exit(0);
