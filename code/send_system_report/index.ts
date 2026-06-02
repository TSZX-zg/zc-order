Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://gondtjozadicmyczzcmo.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // 获取今日开始和结束时间
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // 获取统计数据
    // 1. 今日订单数
    const todayOrdersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?created_at=gte.${todayStart}&created_at=lt.${todayEnd}&select=id,total_amount,status`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    const todayOrders = await todayOrdersRes.json();
    const todayOrderCount = Array.isArray(todayOrders) ? todayOrders.length : 0;
    const todayRevenue = Array.isArray(todayOrders) 
      ? todayOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) 
      : 0;

    // 2. 订单状态分布
    const allOrdersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=status`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    const allOrders = await allOrdersRes.json();
    const totalOrderCount = Array.isArray(allOrders) ? allOrders.length : 0;
    
    const statusCounts: { [key: string]: number } = {
      'pending': 0,
      'received': 0,
      'in_progress': 0,
      'completed': 0,
      'rejected': 0
    };
    
    if (Array.isArray(allOrders)) {
      allOrders.forEach((order: any) => {
        const status = order.status || 'pending';
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        }
      });
    }

    // 3. 用户数量
    const usersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?select=id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    const users = await usersRes.json();
    const userCount = Array.isArray(users) ? users.length : 0;

    // 4. 商品数量
    const productsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    const products = await productsRes.json();
    const productCount = Array.isArray(products) ? products.length : 0;

    // 5. 品牌数量
    const brandsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/brands?select=id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    const brands = await brandsRes.json();
    const brandCount = Array.isArray(brands) ? brands.length : 0;

    // 6. 今日待处理订单
    const todayPendingOrders = Array.isArray(todayOrders) 
      ? todayOrders.filter((o: any) => o.status === 'pending').length 
      : 0;
    const todayProcessingOrders = Array.isArray(todayOrders) 
      ? todayOrders.filter((o: any) => o.status === 'received' || o.status === 'in_progress').length 
      : 0;
    const todayCompletedOrders = Array.isArray(todayOrders) 
      ? todayOrders.filter((o: any) => o.status === 'completed').length 
      : 0;

    // 确定是早间简报还是晚间简报
    const hour = now.getHours();
    const reportType = hour < 12 ? '早间' : '晚间';
    const reportTime = now.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
    .status-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
    .status-card { background: white; padding: 15px; border-radius: 8px; text-align: center; }
    .status-number { font-size: 24px; font-weight: bold; }
    .status-label { font-size: 12px; color: #666; }
    .status-pending { color: #f59e0b; }
    .status-received { color: #3b82f6; }
    .status-processing { color: #8b5cf6; }
    .status-completed { color: #10b981; }
    .status-rejected { color: #ef4444; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ZC代购系统${reportType}简报</h1>
      <p>生成时间: ${reportTime}</p>
    </div>
    <div class="content">
      <h3>📈 今日概览</h3>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-number">${todayOrderCount}</div>
          <div class="stat-label">今日订单</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">¥${todayRevenue.toFixed(2)}</div>
          <div class="stat-label">今日营收</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${userCount}</div>
          <div class="stat-label">注册用户</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${productCount}</div>
          <div class="stat-label">在售商品</div>
        </div>
      </div>

      <h3>📦 订单状态分布（总计）</h3>
      <div class="status-grid">
        <div class="status-card">
          <div class="status-number status-pending">${statusCounts.pending}</div>
          <div class="status-label">待接单</div>
        </div>
        <div class="status-card">
          <div class="status-number status-received">${statusCounts.received}</div>
          <div class="status-label">已接单</div>
        </div>
        <div class="status-card">
          <div class="status-number status-processing">${statusCounts.in_progress}</div>
          <div class="status-label">处理中</div>
        </div>
        <div class="status-card">
          <div class="status-number status-completed">${statusCounts.completed}</div>
          <div class="status-label">已完成</div>
        </div>
        <div class="status-card">
          <div class="status-number status-rejected">${statusCounts.rejected}</div>
          <div class="status-label">已拒绝</div>
        </div>
      </div>

      <div class="highlight">
        <h3>📋 今日订单处理情况</h3>
        <p><strong>待处理:</strong> ${todayPendingOrders} 单</p>
        <p><strong>处理中:</strong> ${todayProcessingOrders} 单</p>
        <p><strong>已完成:</strong> ${todayCompletedOrders} 单</p>
      </div>

      <h3>🏪 店铺信息</h3>
      <p>品牌数量: ${brandCount}</p>
      <p>总订单数: ${totalOrderCount}</p>
    </div>
    <div class="footer">
      <p>ZC代购点单预约系统 - 系统简报</p>
      <p>此邮件由系统自动发送</p>
    </div>
  </div>
</body>
</html>
    `;

    // 发送邮件
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'ZC代购系统 <onboarding@resend.dev>',
        to: ['dlzydyx@hotmail.com'],
        subject: `📊 ZC代购系统${reportType}简报 - ${reportTime}`,
        html: emailHtml,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      return new Response(JSON.stringify({ 
        success: false, 
        error: '邮件发送失败',
        details: resendResult 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: '系统简报已发送',
      email_id: resendResult.id,
      stats: {
        todayOrderCount,
        todayRevenue,
        userCount,
        productCount,
        brandCount,
        statusCounts
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
