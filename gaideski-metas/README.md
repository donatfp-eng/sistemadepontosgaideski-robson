# Gaideski Metas — Sistema de Gamificação

Sistema interno de gamificação e metas para a Gaideski Contabilidade.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Vercel Serverless Functions (TypeScript)
- **Banco**: PostgreSQL via [Neon](https://neon.tech) (serverless, gratuito)
- **Auth**: JWT via cookie HttpOnly
- **ORM**: Drizzle ORM

---

## Deploy (passo a passo)

### 1. Criar banco no Neon

1. Acesse [neon.tech](https://neon.tech) → crie uma conta gratuita
2. Crie um novo projeto chamado `gaideski-metas`
3. Copie a **Connection String** (formato: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)

### 2. Subir no GitHub

```bash
git init
git add .
git commit -m "chore: projeto inicial gaideski metas"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/gaideski-metas.git
git push -u origin main
```

### 3. Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) → clique em **Add New Project**
2. Conecte o repositório `gaideski-metas`
3. Em **Environment Variables**, adicione:
   - `DATABASE_URL` → cole a connection string do Neon
   - `JWT_SECRET` → gere um segredo: `openssl rand -base64 32`
   - `NODE_ENV` → `production`
4. Clique em **Deploy**

### 4. Criar as tabelas e seed

Após o primeiro deploy, rode localmente:

```bash
# Instale as dependências
npm install

# Crie um arquivo .env com as variáveis (copie o .env.example)
cp .env.example .env
# Edite o .env com sua DATABASE_URL

# Crie as tabelas no banco
npm run db:push

# Popule com dados iniciais
npm run db:seed
```

### 5. Acessar o sistema

Abra a URL do Vercel e faça login com:

- **Admin**: `admin@gaideski.com.br` / `admin123`
- **Supervisor**: `ana@gaideski.com.br` / `sup123`

> ⚠️ **Troque as senhas após o primeiro acesso!**

---

## Desenvolvimento local

```bash
npm install
cp .env.example .env  # configure DATABASE_URL
npm run db:push
npm run db:seed
npm run dev
```

## Modo TV

Acesse `/tv` para o painel de telão (sem login). Atualiza automaticamente a cada 30 segundos.

Para proteger com token: adicione `TV_ACCESS_TOKEN=seu-token` nas variáveis e acesse `/tv?token=seu-token`.
