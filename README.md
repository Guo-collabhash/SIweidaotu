# Supabase 登录注册系统

这是一个基于Express和Supabase的简单登录注册系统后端。

## 功能特性

- 用户注册
- 用户登录
- 密码加密存储
- RESTful API

## 技术栈

- Node.js
- Express
- Supabase
- bcrypt
- dotenv

## 安装和配置

### 前提条件

- Node.js 已安装
- Supabase 账号

### 安装依赖

```bash
npm install
```

### 环境配置

创建 `.env` 文件并配置以下环境变量：

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=3000
```

### Supabase 配置

1. 登录到 [Supabase](https://supabase.com/)
2. 创建一个新项目
3. 在数据库中创建 `users` 表，包含以下字段：
   - `id` (自动生成的UUID，主键)
   - `email` (字符串，唯一)
   - `password` (字符串)
   - `username` (字符串)
4. 确保在Supabase的认证设置中允许Email/Password认证

## 运行项目

```bash
npm start
```

服务器将运行在 http://localhost:3000

## API 端点

### 注册

**POST** `/api/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}
```

**响应**:
```json
{
  "message": "注册成功",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### 登录

**POST** `/api/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "message": "登录成功",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

## 安全性考虑

- 密码使用bcrypt进行加密存储
- 错误消息尽量不泄露敏感信息
- 建议在生产环境中使用HTTPS

## 开发说明

- 该项目仅包含后端API，需要前端应用程序配合使用
- 可以根据需求扩展更多功能，如忘记密码、用户信息更新等

## 注意事项

- 请确保保护好您的.env文件，不要将其提交到版本控制系统
- 在生产环境中，建议使用更严格的安全措施，如JWT令牌认证等