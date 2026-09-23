# ADR 002: Build-time migrations

The Vercel build resolves Neon pooled and direct URLs, generates Prisma, applies committed migrations when a database is present, and continues with a clear no-database message otherwise.
