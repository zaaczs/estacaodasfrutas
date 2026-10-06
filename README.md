# Estação das Frutas

Sistema de gestão para hortifruti - controle de pedidos, estoque, produtos e clientes.

## Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **ORM:** Prisma
- **Banco:** SQLite (arquivo local, sem configuração)
- **Auth:** NextAuth com Credentials + bcrypt

## Pré-requisitos

- Node.js 18+
## Instalação

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env` na raiz do projeto:

```env
NEXTAUTH_SECRET="gere-um-secret-aleatorio-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

3. Gere o Prisma Client e crie o banco (arquivo prisma/dev.db é criado automaticamente):

```bash
npm run db:generate
npm run db:push
```

4. Execute o seed para criar usuários e dados de exemplo:

```bash
npm run db:seed
```

**Usuários admin:**
- Admin: `admin@gmail.com` / `123456`
- Atendente: `atendente@gmail.com` / `123456`

5. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Funcionalidades

- **Dashboard:** vendas do dia, pedidos, estoque baixo, produtos mais vendidos
- **Produtos:** CRUD, importação CSV, exportação CSV
- **Pedidos:** novo pedido com carrinho, finalização com baixa automática de estoque
- **Impressão:** cupom térmico via QZ Tray e ESC/POS
- **Estoque:** entradas, ajustes, histórico de movimentações
- **Clientes:** cadastro de clientes
- **Exportação CSV:** produtos, pedidos, movimentações
- **Auth:** login com roles (Admin / Atendente) - atendente não pode excluir produtos

## Estrutura

```
/app
  /dashboard    - Dashboard com métricas
  /produtos     - Listagem e CRUD de produtos
  /pedidos      - Lista e novo pedido
  /estoque      - Controle de estoque
  /clientes     - Cadastro de clientes
/api
  /products     - CRUD produtos
  /orders       - Pedidos e finalização
  /stock        - Movimentações
  /customers    - CRUD clientes
  /auth         - NextAuth + register
  /export       - Exportação CSV
/lib
  db.ts         - Prisma client
  auth.ts       - NextAuth config
  services/     - Lógica de negócio
```

## Regras de negócio

- **Finalização de pedido:** baixa automática do estoque, cria `StockMovement` tipo SALE
- **Cancelamento:** reverte estoque, cria movimentação tipo ADJUSTMENT
- **Estoque negativo:** impedido em todas as operações
- **Estoque baixo:** alerta quando `stock <= minStock`
