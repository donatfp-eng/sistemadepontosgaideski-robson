import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './api/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
