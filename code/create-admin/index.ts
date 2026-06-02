Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    // 使用Supabase Auth Admin API创建用户（不需要邮箱验证）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // 直接确认邮箱，不需要验证
      }),
    });

    const userData = await createUserResponse.json();

    if (!createUserResponse.ok) {
      console.error('Error creating user:', userData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: userData.message || '创建用户失败' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 检查admins表中是否已有该邮箱，如果没有则添加
    const checkAdminResponse = await fetch(`${supabaseUrl}/rest/v1/admins?email=eq.${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
    });

    const existingAdmins = await checkAdminResponse.json();
    
    if (!existingAdmins || existingAdmins.length === 0) {
      // 添加到admins表
      await fetch(`${supabaseUrl}/rest/v1/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ email }),
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: '管理员账号创建成功',
      user_id: userData.id
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
