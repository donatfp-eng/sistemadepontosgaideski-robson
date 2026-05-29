import {
  pgTable, serial, text, boolean, timestamp, integer,
  numeric, date, jsonb, index, unique,
} from 'drizzle-orm/pg-core'

// ─── Users (admins & supervisors) ────────────────────────────────────────────
export const users = pgTable('users', {
  id:           serial('id').primaryKey(),
  name:         text('name').notNull(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role:         text('role').notNull(), // 'admin' | 'supervisor'
  active:       boolean('active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

// ─── Sectors ──────────────────────────────────────────────────────────────────
export const sectors = pgTable('sectors', {
  id:   serial('id').primaryKey(),
  name: text('name').notNull().unique(),
})

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = pgTable('employees', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  email:     text('email').notNull().unique(),
  role:      text('role').notNull(),
  sectorId:  integer('sector_id').references(() => sectors.id),
  active:    boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Supervisor Assignments ───────────────────────────────────────────────────
export const supervisorAssignments = pgTable('supervisor_assignments', {
  id:           serial('id').primaryKey(),
  employeeId:   integer('employee_id').notNull().references(() => employees.id),
  supervisorId: integer('supervisor_id').notNull().references(() => users.id),
  assignedAt:   timestamp('assigned_at').notNull().defaultNow(),
  removedAt:    timestamp('removed_at'),
})

// ─── Weekly Entries ───────────────────────────────────────────────────────────
export const weeklyEntries = pgTable('weekly_entries', {
  id:              serial('id').primaryKey(),
  employeeId:      integer('employee_id').notNull().references(() => employees.id),
  supervisorId:    integer('supervisor_id').notNull().references(() => users.id),
  weekStart:       date('week_start').notNull(),
  weekEnd:         date('week_end').notNull(),
  punctual:        boolean('punctual').notNull().default(false),
  attended:        boolean('attended').notNull().default(false),
  sport:           boolean('sport').notNull().default(false),
  workMonitorPct:  numeric('work_monitor_pct', { precision: 5, scale: 2 }),
  taskProcessPct:  numeric('task_process_pct', { precision: 5, scale: 2 }),
  coins:           numeric('coins', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.employeeId, t.weekStart),
}))

// ─── Quiz Entries ─────────────────────────────────────────────────────────────
export const quizEntries = pgTable('quiz_entries', {
  id:           serial('id').primaryKey(),
  employeeId:   integer('employee_id').notNull().references(() => employees.id),
  supervisorId: integer('supervisor_id').notNull().references(() => users.id),
  month:        integer('month').notNull(),
  year:         integer('year').notNull(),
  score:        numeric('score', { precision: 5, scale: 2 }).notNull(),
  passed:       boolean('passed').notNull().default(false),
  coins:        numeric('coins', { precision: 10, scale: 2 }).notNull().default('0'),
  notes:        text('notes'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.employeeId, t.month, t.year),
}))

// ─── Candidate Referrals ──────────────────────────────────────────────────────
export const candidateReferrals = pgTable('candidate_referrals', {
  id:            serial('id').primaryKey(),
  employeeId:    integer('employee_id').notNull().references(() => employees.id),
  supervisorId:  integer('supervisor_id').notNull().references(() => users.id),
  candidateName: text('candidate_name').notNull(),
  referralDate:  date('referral_date').notNull(),
  status:        text('status').notNull().default('pendente'),
  position:      text('position').notNull(),
  coins:         numeric('coins', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

// ─── Client Referrals ─────────────────────────────────────────────────────────
export const clientReferrals = pgTable('client_referrals', {
  id:           serial('id').primaryKey(),
  employeeId:   integer('employee_id').notNull().references(() => employees.id),
  supervisorId: integer('supervisor_id').notNull().references(() => users.id),
  clientName:   text('client_name').notNull(),
  referralDate: date('referral_date').notNull(),
  status:       text('status').notNull().default('pendente'),
  coins:        numeric('coins', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

// ─── Coin Config (singleton) ──────────────────────────────────────────────────
export const coinConfig = pgTable('coin_config', {
  id:                       serial('id').primaryKey(),
  punctualityCoinsPerWeek:  numeric('punctuality_coins_per_week', { precision: 10, scale: 2 }).notNull().default('1'),
  attendanceCoinsPerWeek:   numeric('attendance_coins_per_week',  { precision: 10, scale: 2 }).notNull().default('1'),
  sportCoinsPerEntry:       numeric('sport_coins_per_entry',      { precision: 10, scale: 2 }).notNull().default('1'),
  quizPassScore:            numeric('quiz_pass_score',            { precision: 10, scale: 2 }).notNull().default('7'),
  quizCoinsOnPass:          numeric('quiz_coins_on_pass',         { precision: 10, scale: 2 }).notNull().default('5'),
  workMonitorMaxScore:      numeric('work_monitor_max_score',     { precision: 10, scale: 2 }).notNull().default('100'),
  workMonitorMaxCoins:      numeric('work_monitor_max_coins',     { precision: 10, scale: 2 }).notNull().default('10'),
  taskProcessMaxScore:      numeric('task_process_max_score',     { precision: 10, scale: 2 }).notNull().default('100'),
  taskProcessMaxCoins:      numeric('task_process_max_coins',     { precision: 10, scale: 2 }).notNull().default('10'),
  clientReferralCoins:      numeric('client_referral_coins',      { precision: 10, scale: 2 }).notNull().default('20'),
  candidateReferralCoins:   numeric('candidate_referral_coins',   { precision: 10, scale: 2 }).notNull().default('5'),
  coinValueBrl:             numeric('coin_value_brl',             { precision: 10, scale: 2 }).notNull().default('1.25'),
  quarterlyBonusPct:        numeric('quarterly_bonus_pct',        { precision: 10, scale: 2 }).notNull().default('10'),
  updatedAt:                timestamp('updated_at').notNull().defaultNow(),
})

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id'),
  userName:  text('user_name'),
  action:    text('action').notNull(),
  entity:    text('entity'),
  entityId:  integer('entity_id'),
  before:    jsonb('before'),
  after:     jsonb('after'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Types ────────────────────────────────────────────────────────────────────
export type User              = typeof users.$inferSelect
export type NewUser           = typeof users.$inferInsert
export type Sector            = typeof sectors.$inferSelect
export type Employee          = typeof employees.$inferSelect
export type NewEmployee       = typeof employees.$inferInsert
export type WeeklyEntry       = typeof weeklyEntries.$inferSelect
export type NewWeeklyEntry    = typeof weeklyEntries.$inferInsert
export type QuizEntry         = typeof quizEntries.$inferSelect
export type CandidateReferral = typeof candidateReferrals.$inferSelect
export type ClientReferral    = typeof clientReferrals.$inferSelect
export type CoinConfig        = typeof coinConfig.$inferSelect
export type AuditLog          = typeof auditLogs.$inferSelect
