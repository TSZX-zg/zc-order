# 茶饮点餐系统 (zc-order)

一个基于 React + Supabase 的茶饮点餐管理系统，支持商品规格自定义、分类管理、订单通知等功能。

## 功能特性

- 🏪 多品牌管理
- 📦 商品规格自定义（支持每个选项设置价格）
- 🏷️ 商品标签（低负担、冷热皆宜等）
- 📂 分类管理
- 🛒 购物车功能
- 📧 邮件通知（订单状态更新）
- 📊 系统简报（每日自动发送）

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS + Vite
- **后端**: Supabase (PostgreSQL, Auth, Edge Functions)
- **邮件**: Resend

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
VITE_SUPABASE_URL=https://gondtjozadicmyczzcmo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmR0am96YWRpY215Y3p6Y21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzQzMzYsImV4cCI6MjA5NTU1MDMzNn0.IemBcvhvgvue85ro9NEniZAgsy3y2FD3vwcYaEqlylc
```

### 3. 启动开发服务器

```bash
pnpm dev
```

### 4. 构建生产版本

```bash
pnpm build
```

## 部署

### Vercel 部署

详见 [VERCEL.md](./VERCEL.md)

### Supabase Edge Functions 部署

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 部署函数
supabase functions deploy send_order_email
supabase functions deploy send_system_report
```

## 项目结构

```
zc-order/
├── src/
│   ├── App.tsx          # 主应用组件
│   ├── main.tsx        # 入口文件
│   ├── lib/
│   │   └── supabase.ts  # Supabase 客户端
│   └── contexts/
│       └── AuthContext.tsx  # 认证上下文
├── public/             # 静态资源
├── code/              # Edge Functions
│   ├── send_order_email/
│   └── send_system_report/
├── index.html
├── vite.config.ts
└── package.json
```

## 许可证

MIT
