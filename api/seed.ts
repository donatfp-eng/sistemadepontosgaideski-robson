import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema.js'
import { sectors, employees, users, supervisorAssignments, coinConfig, candidateReferrals, weeklyEntries } from './schema.js'
import bcryptjs from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql as any, { schema })

async function seed() {
  console.log('🌱 Iniciando seed com dados reais...')

  // Limpar tabelas
  await db.delete(candidateReferrals)
  await db.delete(weeklyEntries)
  await db.delete(supervisorAssignments)
  await db.delete(employees)
  await db.delete(users)
  await db.delete(sectors)
  await db.delete(coinConfig)

  // COIN CONFIG
  await db.insert(coinConfig).values({
    id: 1,
    punctualityCoinsPerWeek: '1.00',
    attendanceCoinsPerWeek: '1.00',
    sportCoinsPerEntry: '4.00',
    quizPassScore: '7.00',
    quizCoinsOnPass: '15.00',
    taskProcessMaxScore: '100.00',
    taskProcessMaxCoins: '8.75',
    clientReferralCoins: '100.00',
    candidateReferralCoins: '5.00',
    coinValueBrl: '1.25',
    quarterlyBonusPct: '10.00',
    workMonitorMaxScore: '69.00',
    workMonitorMaxCoins: '5.00',
  })
  console.log('✅ Coin config')

  // SECTORS
  await db.insert(sectors).values([
    { id: 3, name: 'Departamento Pessoal' },
    { id: 4, name: 'Adm' },
    { id: 7, name: 'RH' },
    { id: 9, name: 'Comercial' },
    { id: 10, name: 'Contábil' },
    { id: 11, name: 'Financeiro' },
    { id: 12, name: 'Fiscal' },
    { id: 13, name: 'Societário' },
  ])
  console.log('✅ Setores: 8')

  // USERS
  const hash = await bcryptjs.hash('admin123', 10)
  await db.insert(users).values([
    { id: 1, name: 'Administrador', email: 'admin@gaideski.com.br', passwordHash: hash, role: 'admin', active: true },
    { id: 2, name: 'Simone Plattes', email: 'simone@gaideskicontabilidade.com.br', passwordHash: hash, role: 'admin', active: true },
    { id: 3, name: 'Maiara Gaideski', email: 'maiara@grupogaideski.com.br', passwordHash: hash, role: 'admin', active: true },
    { id: 4, name: 'Robson Gaideski', email: 'robson@gaideskicontabilidade.com.br', passwordHash: hash, role: 'admin', active: true },
    { id: 5, name: 'Jorge Dona', email: 'jorge.dona@grupogaideski.com.br', passwordHash: hash, role: 'admin', active: true },
    { id: 6, name: 'Flavia Parize', email: 'flavia.parize@grupogaideski.com.br', passwordHash: hash, role: 'admin', active: true },
    { id: 7, name: 'Tatiane Bueno', email: 'tatiane.bueno@grupogaideski.com.br', passwordHash: hash, role: 'admin', active: true },
    { id: 8, name: 'Pedro Henrique', email: 'pedro.henrique@grupogaideski.com.br', passwordHash: hash, role: 'admin', active: true },
  ])
  console.log('✅ Usuários: 8')

  // EMPLOYEES
  await db.insert(employees).values([
    { id: 1, name: 'AMANDA MORAES DA SILVA', email: 'amanda.silva@gaideskicontabilidade.com.br', role: 'AUXILIAR ADMINISTRATIVO', sectorId: 4, active: true },
    { id: 2, name: 'NAJELA KAUANNA MACIEL COCHENSKI', email: 'recepcao@grupogaideski.com.br', role: 'AUXILIAR ADMINISTRATIVO', sectorId: 4, active: true },
    { id: 3, name: 'THALITA FREITAS DA SILVA', email: 'thalita.silva@grupogaideski.com.br', role: 'AUXILIAR ADMINISTRATIVO', sectorId: 13, active: true },
    { id: 4, name: 'DARCE CARDOSO DA SILVA', email: 'darce@gaideski.com.br', role: 'Administrativo', sectorId: 4, active: true },
    { id: 5, name: 'JOAO VICTOR ARAUJO JANTSCH', email: 'joao.jantsch@grupogaideski.com.br', role: 'ASSISTENTE COMERCIAL SENIOR', sectorId: 9, active: true },
    { id: 6, name: 'FLAVIA PARIZE', email: 'flavia.parize@grupogaideski.com.br', role: 'ADMINISTRATIVO', sectorId: 4, active: true },
    { id: 7, name: 'SIMONE PLATTES', email: 'simone@gaideskicontabilidade.com.br', role: 'SUPERVISORA', sectorId: 10, active: true },
    { id: 8, name: 'JORGE DONA', email: 'jorge.dona@grupogaideski.com.br', role: 'COMERCIAL', sectorId: 9, active: true },
    { id: 9, name: 'ANTONIO BRITO', email: 'antonio.brito@planiconcontabilidade.com.br', role: 'CONTABIL', sectorId: 10, active: true },
    { id: 10, name: 'DALTON GEIER VIEIRA', email: 'dalton@gaideskicontabilidade.com.br', role: 'ASSISTENTE CONTABIL', sectorId: 10, active: true },
    { id: 11, name: 'JULIA PEREIRA DO NASCIMENTO', email: 'julia.nascimento@gaideskicontabilidade.com.br', role: 'ASSISTENTE CONTABIL', sectorId: 10, active: true },
    { id: 12, name: 'MARCIO LUIZ DA SILVA', email: 'marcio.braga@gaideskicontabilidade.com.br', role: 'ANALISTA CONTÁBIL', sectorId: 10, active: true },
    { id: 13, name: 'SANDRO PTAK', email: 'sandro@gaideskicontabilidade.com.br', role: 'ANALISTA CONTABIL SENIOR', sectorId: 10, active: true },
    { id: 14, name: 'ALINE GENTIL DE LARA DO NASCIMENTO SILVA', email: 'aline.gentil@gaideskicontabilidade.com.br', role: 'ASSISTENTE DEPARTAMENTO PESSOAL', sectorId: 3, active: true },
    { id: 15, name: 'FERNANDA DE ALMEIDA RAMOS', email: 'fernanda@gaideskicontabilidade.com.br', role: 'ANALISTA DEPARTAMENTO PESSOAL', sectorId: 3, active: true },
    { id: 16, name: 'SIMONE DE OLIVEIRA RIBEIRO SILVA', email: 'simone.silva@gaideskicontabilidade.com.br', role: 'ANALISTA JR NÍVEL I DP', sectorId: 3, active: true },
    { id: 17, name: 'CRISTIANE ANDRADE MACHADO', email: 'cristiane.machado@grupogaideski.com.br', role: 'ASSISTENTE FINANCEIRO', sectorId: 11, active: true },
    { id: 18, name: 'ADRIANA ZIGTIK', email: 'adriana.zigtik@gaideskicontabilidade.com.br', role: 'ASSISTENTE FISCAL', sectorId: 12, active: true },
    { id: 19, name: 'ALICE LIMA DA SILVA', email: 'alice.silva@gaideskicontabilidade.com.br', role: 'ASSISTENTE FISCAL', sectorId: 12, active: true },
    { id: 20, name: 'ANDREA ALINE MENDES', email: 'andrea.mendes@gaideskicontabilidade.com.br', role: 'ASSISTENTE FISCAL', sectorId: 12, active: true },
    { id: 21, name: 'CAMILA ANDRADE RAMOS', email: 'camila.ramos@gaideskicontabilidade.com.br', role: 'AUXILIAR FISCAL PLENO', sectorId: 12, active: true },
    { id: 22, name: 'CRISTIANE DA SILVA RABELLO', email: 'cristiane.rabello@gaideskicontabilidade.com.br', role: 'ANALISTA FISCAL', sectorId: 12, active: true },
    { id: 23, name: 'GABRIELLE LUCIA RABINOVICI LUCCHESI', email: 'gabrielle.rabinovici@gaideskicontabilidade.com.br', role: 'ASSISTENTE FISCAL', sectorId: 12, active: true },
    { id: 24, name: 'JULIO CESAR DA FONSECA BARBOSA', email: 'julio.cezar@gaideskicontabilidade.com.br', role: 'ANALISTA FISCAL', sectorId: 12, active: true },
    { id: 25, name: 'LETICIA APARECIDA SEIXAS DE LIMA ALMEIDA', email: 'leticia@gaideskicontabilidade.com.br', role: 'ANALISTA FISCAL PLENO', sectorId: 12, active: true },
    { id: 26, name: 'TATIANE BUENO DOS SANTOS', email: 'tatiane.bueno@grupogaideski.com.br', role: 'ANALISTA RECURSOS HUMANOS SENIOR', sectorId: 7, active: true },
    { id: 27, name: 'CASSIANE CORDEIRO DA SILVA', email: 'cassiane.silva@grupogaideski.com.br', role: 'ASSIST. DEP. SOCIETÁRIO SENIOR', sectorId: 13, active: true },
    { id: 28, name: 'MICHELE VANESSA DE OLIVEIRA WEIMER', email: 'michele.weimer@grupogaideski.com.br', role: 'ASSISTENTE SOCIETARIO', sectorId: 13, active: true },
    { id: 29, name: 'PEDRO HENRIQUE LINDBECK', email: 'pedro.henrique@grupogaideski.com.br', role: 'SUPERVISOR SOCIETARIO ADMINISTRATIVO', sectorId: 13, active: true },
    { id: 30, name: 'WALLACI KAINÃ BUENO', email: 'wallaci.bueno@grupogaideski.com.br', role: 'AUXILIAR SOCIETARIO', sectorId: 13, active: true },
  ])
  console.log('✅ Colaboradores: 30')

  // SUPERVISOR ASSIGNMENTS
  await db.insert(supervisorAssignments).values([
    { id: 7, employeeId: 7, supervisorId: 1 },
    { id: 8, employeeId: 3, supervisorId: 8 },
  ])
  console.log('✅ Supervisor assignments: 2')

  // CANDIDATE REFERRALS
  await db.insert(candidateReferrals).values([
    { id: 1, employeeId: 6, supervisorId: 7, candidateName: 'Najela Kauanna Maciel Cochenski', referralDate: '2026-05-04', status: 'aprovado', position: 'Auxiliar administrativo', coins: '5.00' },
    { id: 2, employeeId: 8, supervisorId: 4, candidateName: 'Geovana Dona', referralDate: '2026-05-11', status: 'aprovado', position: 'Atendimento', coins: '5.00' },
    { id: 3, employeeId: 22, supervisorId: 7, candidateName: 'PAULA C. HENRIQUES', referralDate: '2026-05-21', status: 'aprovado', position: 'Contábil', coins: '5.00' },
  ])
  console.log('✅ Indicações de candidatos: 3')

  console.log('\n🎉 Seed concluído!')
  console.log('📧 Todos os usuários: senha = admin123')
}

seed().catch(console.error)
