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
    const { user_email, user_name, items, total_amount, order_id, contact_phone, contact_wechat, contact_qq, contact_other, is_rejection, notification_message, notify_user } = await req.json();

    // 如果是用户通知，发送邮件给用户；否则发送给管理员
    const isUserNotification = notify_user === true;
    const recipientEmail = isUserNotification ? user_email : 'dlzydyx@hotmail.com';

    // 构建联系方式信息
    let contactInfo = '';
    if (contact_phone) contactInfo += `<p><strong>电话:</strong> ${contact_phone}</p>`;
    if (contact_wechat) contactInfo += `<p><strong>微信:</strong> ${contact_wechat}</p>`;
    if (contact_qq) contactInfo += `<p><strong>QQ:</strong> ${contact_qq}</p>`;
    if (contact_other) contactInfo += `<p><strong>其他联系方式:</strong> ${contact_other}</p>`;

    // 判断是订单通知还是拒绝通知
    const isOrderNotification = !is_rejection;
    
    // 根据通知类型生成不同的标题
    let title, subjectPrefix;
    if (isUserNotification) {
      // 用户订单状态通知（只发送状态更新）
      const statusMessages: { [key: string]: string } = {
        'received': '订单已接单',
        'in_progress': '订单处理中',
        'completed': '订单已完成',
        'rejected': '订单被拒绝',
        'cancelled': '订单已取消'
      };
      // 订单完成使用✅，其他使用📦
      const emoji = notification_message?.status === 'completed' ? '✅' : '📦';
      title = `${emoji} ${statusMessages[notification_message?.status] || '订单状态通知'}`;
      subjectPrefix = `订单状态更新 - ${statusMessages[notification_message?.status] || ''}`;
    } else {
      title = isOrderNotification ? '🎉 新订单通知' : '❌ 订单被拒绝';
      subjectPrefix = isOrderNotification ? '新订单通知' : '订单被拒绝';
    }

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
    .order-item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .total { font-size: 24px; font-weight: bold; color: #667eea; text-align: right; margin-top: 20px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .contact-info { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .rejection { background: #f8d7da; padding: 20px; border-radius: 8px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p>订单号: #${order_id}</p>
    </div>
    <div class="content">
      ${is_rejection ? `<div class="rejection"><h3>⚠️ 订单被拒绝</h3><p>${notification_message}</p></div>` : ''}
      <h3>客户信息</h3>
      <p><strong>姓名:</strong> ${user_name}</p>
      <p><strong>邮箱:</strong> ${user_email}</p>
      ${contactInfo ? `<div class="contact-info"><h4>联系方式:</h4>${contactInfo}</div>` : ''}
      
      ${isOrderNotification ? `
      <h3>订单详情</h3>
      ${items.map(item => {
        // 计算商品小计（包含规格价格）
        const itemTotal = (item.price + (item.spec_price || 0)) * item.quantity;
        return `
      <div class="order-item">
        <strong>${item.name}</strong>
        ${item.specifications ? `<br><small>规格: ${item.specifications}</small>` : ''}
        ${item.spec_price > 0 ? `<br><small class="text-orange-600">规格加价: +¥${item.spec_price}</small>` : ''}
        <br>¥${item.price} x ${item.quantity} = ¥${itemTotal}
      </div>
        `;
      }).join('')}
      
      <div class="total">
        合计: ¥${total_amount}
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>ZC代购点单预约系统 - 您的贴心代购服务</p>
    </div>
  </div>
</body>
</html>
    `;

    // 使用Resend发送邮件
    let subject;
    if (isUserNotification) {
      subject = `📦 订单状态更新 - 订单号 #${order_id}`;
    } else {
      subject = is_rejection 
        ? `❌ 订单被拒绝 - 订单号 #${order_id}`
        : `🎉 新订单通知 - 订单号 #${order_id}`;
    }
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'ZC代购系统 <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: subject,
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
      message: '订单已提交，邮件已发送',
      email_id: resendResult.id
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
