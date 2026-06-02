# 部署指南

## 快速部署到 Vercel（推荐）

### 方式一：通过 GitHub 部署

1. **创建 GitHub 仓库**
   - 登录 GitHub，创建新仓库 `zc-order`
   - 将本地代码推送到 GitHub

2. **部署到 Vercel**
   - 访问 https://vercel.com
   - 使用 GitHub 账号登录
   - 点击 "New Project" → 导入 `zc-order` 仓库
   - 配置：
     - Framework Preset: `Vite`
     - Build Command: `pnpm build` 或 `npm run build`
     - Output Directory: `dist`
   - 点击 "Deploy"

### 方式二：通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 进入项目目录
cd zc-order

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

## 环境变量配置

部署时需要在 Vercel 项目设置中添加以下环境变量：

```
VITE_SUPABASE_URL=https://gondtjozadicmyczzcmo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmR0am96YWRpY215Y3p6Y21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzQzMzYsImV4cCI6MjA5NTU1MDMzNn0.IemBcvhvgvue85ro9NEniZAgsy3y2FD3vwcYaEqlylc
```

## 部署后配置

部署完成后，需要在 Supabase 后台配置 Edge Function 的允许域名：

1. 访问 Supabase Dashboard → API → Settings
2. 在 "Redirect URLs" 中添加您的 Vercel 域名
3. 保存设置

## 常见问题

### 1. 构建失败
- 确保 Node.js 版本 >= 18
- 运行 `pnpm install` 确保依赖安装完整

### 2. Supabase 连接失败
- 检查环境变量是否正确配置
- 确认 Supabase 项目的 URL 和 Anon Key 正确

### 3. Edge Function 部署
- Edge Functions 仍需通过 Supabase CLI 部署
- 运行: `supabase functions deploy send_order_email`
- 运行: `supabase functions deploy send_system_report`
