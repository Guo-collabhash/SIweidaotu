# Supabase 配置指南

## 1. 登录到 Supabase

1. 访问 [Supabase 官网](https://supabase.com/)
2. 登录到您的账户
3. 选择您的项目 `fvegckzomexsuukrtdkc.supabase.co`

## 2. 获取匿名密钥 (ANON KEY)

1. 在项目仪表盘左侧菜单中，点击 **设置 (Settings)**
2. 选择 **API** 选项卡
3. 在 **项目 API 密钥** 部分，复制 **anon 公钥** 的值
4. 打开您的 `.env` 文件，将这个值粘贴到 `SUPABASE_ANON_KEY` 字段中：

```
SUPABASE_ANON_KEY=复制的公钥值
```

## 3. 创建 mindmaps 表

1. 在项目仪表盘左侧菜单中，点击 **数据库 (Database)**
2. 选择 **表 (Tables)** 选项卡
3. 点击 **创建新表 (Create a new table)** 按钮
4. 设置表名为 `mindmaps`
5. 添加以下字段：
   
   | 字段名 | 数据类型 | 约束 | 说明 |
   |-------|---------|------|------|
   | id | uuid | 主键，默认值: uuid_generate_v4() | 自动生成的唯一标识符 |
   | name | text | 必填 | 思维导图的名称 |
   | data | jsonb | 必填 | 思维导图的JSON数据 |
   | user_id | uuid | 可选 | 关联的用户ID（如果需要） |
   | created_at | timestamp | 默认值: now() | 创建时间

6. 点击 **保存 (Save)** 按钮创建表

## 4. 设置表的安全策略

为了解决"new row violates row-level security policy for table 'mindmaps'"错误，您需要正确配置行级安全策略。以下是详细步骤：

### 4.1 配置mindmaps表的权限

1. 在 `mindmaps` 表的页面中，点击 **权限 (Permissions)** 选项卡
2. 点击 **添加策略 (Add Policy)**
3. 选择 **定义自己的策略 (Define your own policy)**
4. 在策略配置页面：
   - **策略名称**: 输入一个有意义的名称，例如 "allow_all_access"
   - **对于操作类型**: 选择 **ALL** (或根据需要选择特定操作)
   - **安全性**: 选择 **PERMISSIVE**
   - **目标角色**: 选择 **public**
   - **USING 表达式**: 输入 `true` (允许所有人查看数据)
   - **WITH CHECK 表达式**: 输入 `true` (允许所有人修改数据)
5. 点击 **保存策略**

### 4.2 如果您看到需要手动填写SQL的界面

如果您在创建策略时没有看到预设选项，而是看到了SQL编辑界面，请使用以下SQL语句：

```sql
CREATE POLICY "allow_all_access" ON "public"."mindmaps" 
AS PERMISSIVE FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);
```

这个策略将允许所有人对`mindmaps`表进行所有操作（select、insert、update、delete）。

### 4.2 配置users表的权限

如果您打算使用用户认证功能，还需要为users表设置适当的权限：

1. 在 `users` 表的页面中，点击 **权限 (Permissions)** 选项卡
2. 对于 `select`、`insert`、`update` 和 `delete` 权限，设置适当的策略

### 4.3 禁用匿名访问限制（可选）

如果您希望允许未登录用户也能保存思维导图，可以：

1. 在左侧菜单中，点击 **认证 (Authentication)**
2. 选择 **设置 (Settings)** 选项卡
3. 在 **JWT 设置** 部分，将 **允许匿名访问** 设置为启用

## 5. 用户认证指南

为了更好地使用思维导图的保存功能，建议用户先登录：

1. 访问应用的登录页面（应用启动后会提供）
2. 注册一个新账户或使用现有账户登录
3. 登录成功后，系统会记住您的用户身份
4. 之后再尝试保存思维导图到数据库

这样可以确保您的思维导图正确关联到您的账户，也能避免行级安全策略限制导致的保存失败问题。

## 5. 运行应用

1. 确保您已更新 `.env` 文件中的所有必要配置
2. 在命令行中运行 `npm install` 安装所有依赖
3. 运行 `npm start` 启动服务器
4. 打开浏览器并访问 `http://localhost:3000`
5. 创建思维导图后，点击 "文件" -> "保存到数据库" 来保存您的工作

## 6. 故障排除

如果遇到问题，请检查：

- `.env` 文件中的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
- `mindmaps` 表是否已正确创建并配置了适当的权限
- 浏览器的控制台是否有任何错误信息
- 服务器的控制台输出是否有任何错误信息

如果您需要进一步的帮助，请参考 [Supabase 文档](https://supabase.com/docs) 或联系我们的支持团队。