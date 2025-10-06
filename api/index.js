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

// 获取用户的所有思维导图基本信息（有用户ID）
app.get('/api/mindmaps/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('mindmaps')
      .select('id, name, created_at, user_id') // 只选择基本信息字段
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

// 获取所有思维导图基本信息（无用户ID）
app.get('/api/mindmaps', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mindmaps')
      .select('id, name, created_at, user_id') // 只选择基本信息字段
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({ mindmaps: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根据ID获取单个思维导图的数据信息（用于分块传输）
app.get('/api/mindmaps/:id/info', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('mindmaps')
      .select('id, name, created_at, user_id, length(data) as size')
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({ mindmap: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根据ID获取单个思维导图的完整数据（支持分块）
app.get('/api/mindmaps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start = 0, chunkSize = 1048576 } = req.query; // 默认1MB块大小
    
    const { data, error } = await supabase
      .from('mindmaps')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    const dataStr = data.data;
    const totalSize = dataStr.length;
    const chunkStart = parseInt(start);
    const chunkEnd = Math.min(chunkStart + parseInt(chunkSize), totalSize);
    const chunkData = dataStr.substring(chunkStart, chunkEnd);
    
    res.status(200).json({
      mindmap: {
        id: data.id,
        name: data.name,
        created_at: data.created_at,
        user_id: data.user_id
      },
      chunk: {
        start: chunkStart,
        end: chunkEnd,
        total: totalSize,
        data: chunkData
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 分块上传相关API

// 初始化上传任务
app.post('/api/upload/init', async (req, res) => {
  try {
    const { name, userId, totalSize, chunkCount } = req.body;
    
    // 生成一个唯一的上传ID
    const uploadId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // 存储上传任务信息（在实际生产环境中，应该使用数据库存储这些信息）
    const uploadInfo = {
      uploadId,
      name,
      userId,
      totalSize,
      chunkCount,
      receivedChunks: new Set(),
      createdAt: new Date().toISOString()
    };
    
    // 为了简化演示，使用内存存储上传任务信息
    // 在实际生产环境中，应该使用数据库存储
    global.uploadTasks = global.uploadTasks || {};
    global.uploadTasks[uploadId] = uploadInfo;
    
    res.status(200).json({
      uploadId,
      message: '上传任务已初始化'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传文件块
app.post('/api/upload/chunk', async (req, res) => {
  try {
    const { uploadId, chunkIndex, chunkData } = req.body;
    
    // 检查上传任务是否存在
    global.uploadTasks = global.uploadTasks || {};
    const uploadInfo = global.uploadTasks[uploadId];
    
    if (!uploadInfo) {
      return res.status(400).json({ error: '上传任务不存在' });
    }
    
    // 检查块索引是否有效
    if (chunkIndex < 0 || chunkIndex >= uploadInfo.chunkCount) {
      return res.status(400).json({ error: '无效的块索引' });
    }
    
    // 存储块数据（在实际生产环境中，应该使用文件系统或对象存储）
    if (!uploadInfo.chunks) {
      uploadInfo.chunks = [];
    }
    
    uploadInfo.chunks[chunkIndex] = chunkData;
    uploadInfo.receivedChunks.add(chunkIndex);
    
    // 检查是否所有块都已上传
    const isComplete = uploadInfo.receivedChunks.size === uploadInfo.chunkCount;
    
    res.status(200).json({
      uploadId,
      chunkIndex,
      received: uploadInfo.receivedChunks.size,
      total: uploadInfo.chunkCount,
      isComplete
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 完成上传并保存到数据库
app.post('/api/upload/complete', async (req, res) => {
  try {
    const { uploadId } = req.body;
    
    // 检查上传任务是否存在
    global.uploadTasks = global.uploadTasks || {};
    const uploadInfo = global.uploadTasks[uploadId];
    
    if (!uploadInfo) {
      return res.status(400).json({ error: '上传任务不存在' });
    }
    
    // 检查是否所有块都已上传
    if (uploadInfo.receivedChunks.size !== uploadInfo.chunkCount) {
      return res.status(400).json({ error: '尚未接收所有块' });
    }
    
    // 合并所有块
    let mergedData = '';
    for (let i = 0; i < uploadInfo.chunkCount; i++) {
      mergedData += uploadInfo.chunks[i];
    }
    
    // 解析JSON数据
    let parsedData;
    try {
      // 首先检查mergedData是否存在且有效
      if (!mergedData) {
        return res.status(400).json({ error: '上传的数据为空或undefined' });
      }
      
      // 尝试解析JSON
      parsedData = JSON.parse(mergedData);
    } catch (e) {
      console.error('JSON解析错误:', e);
      // 提供更详细的错误信息
      return res.status(400).json({
        error: '无效的JSON数据',
        details: e.message,
        dataType: typeof mergedData,
        dataLength: mergedData ? mergedData.length : 0
      });
    }
    
    // 保存到数据库
    try {
      const { data: savedMap, error } = await supabase
        .from('mindmaps')
        .insert([{
          name: uploadInfo.name,
          data: mergedData,
          user_id: uploadInfo.userId || null,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('保存思维导图失败:', error);
        // 如果是行级安全策略错误，尝试不使用用户ID重新保存
        if (error.message.includes('row-level security policy') && uploadInfo.userId) {
          console.log('尝试不带用户ID重新保存...');
          const { data: savedMapNoUser, error: errorNoUser } = await supabase
            .from('mindmaps')
            .insert([{
              name: uploadInfo.name,
              data: mergedData,
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
          
          // 清理上传任务
          delete global.uploadTasks[uploadId];
          
          return res.status(201).json({
            message: '思维导图已保存（未关联用户）',
            data: savedMapNoUser
          });
        }
        throw error;
      }
      
      // 清理上传任务
      delete global.uploadTasks[uploadId];
      
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
