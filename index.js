require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化Supabase客户端
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 中间件 - 增加请求体大小限制以支持大型思维导图
app.use(express.json({ limit: '50mb' }));

// 配置静态文件服务
app.use(express.static(__dirname));

// 根路径路由 - 服务index.html文件
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 注册路由
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    // 验证输入
    if (!email || !password || !username) {
      return res.status(400).json({ error: '所有字段都是必需的' });
    }
    
    // 检查用户是否已存在
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建新用户
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, username }])
      .select();
    
    if (insertError) {
      throw insertError;
    }
    
    res.status(201).json({ message: '注册成功', user: newUser[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 登录路由
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码都是必需的' });
    }
    
    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return res.status(401).json({ error: '用户不存在或密码错误' });
    }
    
    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户不存在或密码错误' });
    }
    
    res.status(200).json({ message: '登录成功', user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 保存思维导图数据到数据库
app.post('/api/save-mindmap', async (req, res) => {
  try {
    const { data, name, userId } = req.body;
    
    // 验证输入
    if (!data || !name) {
      return res.status(400).json({ error: '思维导图数据和名称是必需的' });
    }
    
    console.log('尝试保存思维导图到数据库:', { name, userId: userId || '未登录用户' });
    
    // 尝试保存到数据库
    try {
      const { data: savedMap, error } = await supabase
        .from('mindmaps')
        .insert([{
          name,
          data: JSON.stringify(data),
          user_id: userId || null,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('保存思维导图失败:', error);
        // 如果是行级安全策略错误，尝试不使用用户ID重新保存
        if (error.message.includes('row-level security policy') && userId) {
          console.log('尝试不带用户ID重新保存...');
          const { data: savedMapNoUser, error: errorNoUser } = await supabase
            .from('mindmaps')
            .insert([{
              name,
              data: JSON.stringify(data),
              user_id: null,
              created_at: new Date().toISOString()
            }])
            .select();
            
          if (errorNoUser) {
            console.error('不带用户ID保存也失败:', errorNoUser);
            return res.status(403).json({
              error: '保存失败: 请检查您的登录状态或Supabase权限设置',
              details: errorNoUser.message
            });
          }
          return res.status(201).json({
            message: '思维导图已保存（未关联用户）',
            data: savedMapNoUser
          });
        }
        throw error;
      }
      
      return res.status(201).json({
        message: '思维导图已成功保存到数据库！',
        data: savedMap
      });
    } catch (error) {
      console.error('保存过程中发生错误:', error);
      return res.status(500).json({
        error: '保存失败: ' + error.message,
        details: error.details || ''
      });
    }
    
    console.log('思维导图保存成功:', savedMap[0].id);
    res.status(201).json({ message: '思维导图保存成功', map: savedMap[0] });
  } catch (error) {
    console.error('保存思维导图时发生错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取用户的所有思维导图（有用户ID）
app.get('/api/mindmaps/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('mindmaps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({ mindmaps: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取所有思维导图（无用户ID）
app.get('/api/mindmaps', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mindmaps')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({ mindmaps: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
