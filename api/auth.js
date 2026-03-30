import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const { action, username, password, targetUser, newStatus } = req.body;

  // 初始化預設帳號 (如果 KV 是空的)
  let users = await kv.get('wiki_users');
  if (!users) {
    users = [
      { username: 'alphabet', password: "asdfghjkl;'", role: 'user', status: 'active' },
      { username: 'admin', password: 'admin123', role: 'admin', status: 'active' }
    ];
    await kv.set('wiki_users', users);
  }

  // 1. 登入邏輯
  if (action === 'login') {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ message: '帳號或密碼錯誤' });
    if (user.status === 'suspended') return res.status(403).json({ message: '帳號已被停權' });
    return res.status(200).json({ success: true, role: user.role, username: user.username });
  }

  // 2. 管理員操作 (需驗證管理員權限，這裡簡化邏輯)
  if (action === 'list') return res.status(200).json(users);

  if (action === 'add') {
    if (users.find(u => u.username === username)) return res.status(400).json({ message: '用戶名已存在' });
    users.push({ username, password, role: 'user', status: 'active' });
    await kv.set('wiki_users', users);
    return res.status(200).json({ success: true });
  }

  if (action === 'toggle') {
    users = users.map(u => u.username === targetUser ? { ...u, status: newStatus } : u);
    await kv.set('wiki_users', users);
    return res.status(200).json({ success: true });
  }

  if (action === 'delete') {
    users = users.filter(u => u.username !== targetUser);
    await kv.set('wiki_users', users);
    return res.status(200).json({ success: true });
  }

  return res.status(400).send('Invalid Action');
}
