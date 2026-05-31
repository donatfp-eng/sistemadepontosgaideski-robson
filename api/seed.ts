import { db } from './_db'
import { users, sectors, employees, supervisorAssignments, coinConfig } from './schema'
import * as bcrypt from 'bcryptjs'

async function seed() {
  console.log('🌱 Iniciando seed...')

  // coin_config
  await db.insert(coinConfig).values({}).onConflictDoNothing()
  console.log('✅ coin_config criado')

  // Users
  const adminHash = await bcrypt.hash('admin123', 10)
  const supHash   = await bcrypt.hash('sup123', 10)

  const [admin] = await db.insert(users).values({
    name: 'Administrador', email: 'admin@gaideski.com.br',
    passwordHash: adminHash, role: 'admin',
  }).onConflictDoNothing().returning()

  const [ana] = await db.insert(users).values({
    name: 'Ana Lima', email: 'ana@gaideski.com.br',
    passwordHash: supHash, role: 'supervisor',
  }).onConflictDoNothing().returning()

  console.log('✅ Usuários criados')

  // Sectors
  const [contab] = await db.insert(sectors).values({ name: 'Contabilidade' }).onConflictDoNothing().returning()
  const [fiscal] = await db.insert(sectors).values({ name: 'Fiscal' }).onConflictDoNothing().returning()
  const [dp]     = await db.insert(sectors).values({ name: 'Departamento Pessoal' }).onConflictDoNothing().returning()

  // Get IDs
  const sContab = contab?.id || (await db.select().from(sectors).where(eq => eq(sectors.name, 'Contabilidade')))[0]?.id
  const sFiscal = fiscal?.id || (await db.select().from(sectors).where(eq => eq(sectors.name, 'Fiscal')))[0]?.id
  const sDp     = dp?.id     || (await db.select().from(sectors).where(eq => eq(sectors.name, 'Departamento Pessoal')))[0]?.id

  console.log('✅ Setores criados')

  // Employees
  const empData = [
    { name: 'João Silva',     email: 'joao@gaideski.com.br',     role: 'Analista Contábil',   sectorId: sContab },
    { name: 'Maria Santos',   email: 'maria@gaideski.com.br',    role: 'Auxiliar Contábil',   sectorId: sContab },
    { name: 'Pedro Alves',    email: 'pedro@gaideski.com.br',    role: 'Analista Fiscal',     sectorId: sFiscal },
    { name: 'Fernanda Costa', email: 'fernanda@gaideski.com.br', role: 'Auxiliar Fiscal',     sectorId: sFiscal },
    { name: 'Juliana Mendes', email: 'juliana@gaideski.com.br',  role: 'Analista DP',         sectorId: sDp },
    { name: 'Ricardo Borges', email: 'ricardo@gaideski.com.br',  role: 'Auxiliar DP',         sectorId: sDp },
  ]

  const anaId = ana?.id || (await db.select().from(users).where(eq => eq(users.email, 'ana@gaideski.com.br')))[0]?.id

  for (const emp of empData) {
    const [created] = await db.insert(employees).values(emp).onConflictDoNothing().returning()
    if (created && anaId) {
      await db.insert(supervisorAssignments).values({ employeeId: created.id, supervisorId: anaId }).onConflictDoNothing()
    }
  }

  console.log('✅ Colaboradores criados')
  console.log('\n🎉 Seed concluído!')
  console.log('📧 Admin:      admin@gaideski.com.br / admin123')
  console.log('📧 Supervisor: ana@gaideski.com.br   / sup123')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
