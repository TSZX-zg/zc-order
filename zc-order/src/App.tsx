import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase, EDGE_FUNCTION_URL } from './lib/supabase';
import { Search, ShoppingCart, User, LogOut, X, CheckCircle, Plus, Trash2, Edit, Package, Store, Menu, Image, Eye, EyeOff, FileText, Bell, Download, Send, Users } from 'lucide-react';

interface Brand {
  id: number;
  name: string;
  description: string;
  location: string;
  image_url?: string;
  no_image_text?: string;
  business_hours?: string;
}

// 规格分组类型
interface SpecGroup {
  name: string;       // 分组名称：如"杯型"、"温度"、"甜度"、"小料"
  type: 'single' | 'multiple';  // single单选, multiple多选
  options: string[];  // 选项列表
  maxSelect?: number; // 最多可选数量，默认为1（单选）或999（多选）
}

interface Product {
  id: number;
  brand_id: number;
  name: string;
  description: string;
  price: number;
  specifications: string[];  // 兼容旧数据
  spec_groups?: SpecGroup[]; // 新分组规格结构
  image_url?: string;
  no_image_text?: string;
  categories?: number[];  // 所属分类ID数组
  tags?: string[];  // 商品标签数组
}

// 分类类型
interface Category {
  id: number;
  brand_id: number;
  name: string;
  created_at?: string;
}

interface CartItem extends Product {
  quantity: number;
  selectedSpecs?: string[];
  selectedSpecGroups?: { [groupName: string]: string[] };  // 分组选择结果
  specPrice?: number;  // 规格附加价格
}

function AppContent() {
  // 格式化订单号：从1开始，显示为00001格式，超过5位数自动增加
  const formatOrderNumber = (num: number): string => {
    const numStr = num.toString();
    if (numStr.length <= 5) {
      return numStr.padStart(5, '0');
    }
    return numStr;
  };

  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserList, setShowUserList] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedSpecGroups, setSelectedSpecGroups] = useState<{ [groupName: string]: string[] }>({});
  const [itemQuantity, setItemQuantity] = useState(1);
  
  // 订单确认弹窗
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);
  const [emailUsable, setEmailUsable] = useState(true);
  const [contactPhone, setContactPhone] = useState('');
  const [contactWechat, setContactWechat] = useState('');
  const [contactQQ, setContactQQ] = useState('');
  const [contactOther, setContactOther] = useState('');
  
  // 用户协议
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  
  // 管理员用户管理
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [userManagementPassword, setUserManagementPassword] = useState('');
  const [userManagementAuth, setUserManagementAuth] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // 通知管理
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  
  // 站内通知
  const [showInbox, setShowInbox] = useState(false);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 管理员内部标签页
  const [adminTab, setAdminTab] = useState<'products' | 'categories' | 'users' | 'notifications' | 'settings'>('products');
  const [userAgreementContent, setUserAgreementContent] = useState(`代购服务协议

欢迎使用ZC代购·预约系统！在使用本系统前，请仔细阅读以下服务条款：

1. 服务说明
本系统提供商品代购预约服务，用户可以通过本系统提交代购需求，代购员将根据用户需求进行商品采购。

2. 订单处理
用户提交订单后，代购员将尽快处理。订单确认后，用户需按照约定方式完成付款。

3. 联系方式
请确保提供的联系方式（邮箱、电话、微信、QQ等）真实有效，以便代购员与您取得联系。

4. 商品质量
代购商品按照用户指定要求购买，如因商品本身质量问题，可协商退换。

5. 隐私保护
我们尊重并保护用户隐私，您的个人信息仅用于订单处理和必要联系，不会泄露给第三方。

6. 免责声明
因不可抗力因素导致无法完成代购时，本系统不承担责任，但会尽可能协调解决。

使用本系统即表示您同意以上服务条款`);
  
  // Admin states
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [newBrandLocation, setNewBrandLocation] = useState('');
  const [newBrandImageUrl, setNewBrandImageUrl] = useState('');
  const [newBrandNoImageText, setNewBrandNoImageText] = useState('');
  const [newBrandBusinessHours, setNewBrandBusinessHours] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductSpecs, setNewProductSpecs] = useState('');
  const [newProductSpecGroups, setNewProductSpecGroups] = useState('');  // JSON格式的分组规格
  
  // 灵活规格设置 - 每个选项可以设置价格
  interface SpecOption {
    name: string;
    price: number;  // 额外价格，0表示不涨价
  }
  interface SpecGroupEditor {
    id: number;
    name: string;
    type: 'single' | 'multi';
    options: SpecOption[];
    maxSelect: number;  // 最多可选数量
  }
  const [specGroupsEditor, setSpecGroupsEditor] = useState<SpecGroupEditor[]>([
    { id: 1, name: '杯型', type: 'single', options: [{ name: '', price: 0 }], maxSelect: 1 }
  ]);
  
  // 添加规格组
  const addSpecGroup = () => {
    setSpecGroupsEditor([...specGroupsEditor, { 
      id: Date.now(), 
      name: '新规格', 
      type: 'single', 
      options: [{ name: '', price: 0 }],
      maxSelect: 1 
    }]);
  };
  
  // 删除规格组
  const removeSpecGroup = (id: number) => {
    if (specGroupsEditor.length > 1) {
      setSpecGroupsEditor(specGroupsEditor.filter(g => g.id !== id));
    }
  };
  
  // 更新规格组名称
  const updateSpecGroupName = (id: number, name: string) => {
    setSpecGroupsEditor(specGroupsEditor.map(g => g.id === id ? { ...g, name } : g));
  };
  
  // 更新规格组类型
  const updateSpecGroupType = (id: number, type: 'single' | 'multi') => {
    setSpecGroupsEditor(specGroupsEditor.map(g => g.id === id ? { ...g, type } : g));
  };
  
  // 添加选项
  const addSpecOption = (groupId: number) => {
    setSpecGroupsEditor(specGroupsEditor.map(g => 
      g.id === groupId ? { ...g, options: [...(g.options || []), { name: '', price: 0 }] } : g
    ));
  };
  
  // 删除选项
  const removeSpecOption = (groupId: number, optIndex: number) => {
    setSpecGroupsEditor(specGroupsEditor.map(g => 
      g.id === groupId ? { ...g, options: (g.options || []).filter((_, i) => i !== optIndex) } : g
    ));
  };
  
  // 更新选项
  const updateSpecOption = (groupId: number, optIndex: number, value: string) => {
    setSpecGroupsEditor(specGroupsEditor.map(g => 
      g.id === groupId ? { 
        ...g, 
        options: (g.options || []).map((o: any, i: number) => i === optIndex ? { ...o, name: value } : o) 
      } : g
    ));
  };
  
  // 更新选项价格
  const updateSpecOptionPrice = (groupId: number, optIndex: number, value: string) => {
    const price = parseFloat(value) || 0;
    setSpecGroupsEditor(specGroupsEditor.map(g => 
      g.id === groupId ? { 
        ...g, 
        options: (g.options || []).map((o, i) => i === optIndex ? { ...o, price } : o) 
      } : g
    ));
  };
  
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductNoImageText, setNewProductNoImageText] = useState('');
  const [newProductCategories, setNewProductCategories] = useState<number[]>([]);
  const [newProductTags, setNewProductTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchBrands();
    checkIsAdmin();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchProducts(selectedBrand.id);
    }
  }, [selectedBrand]);

  async function checkIsAdmin() {
    if (user?.email) {
      const { data } = await supabase.from('admins').select('*').eq('email', user.email).single();
      setIsAdmin(!!data);
    }
  }

  useEffect(() => {
    checkIsAdmin();
  }, [user]);

  // 实时更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function fetchBrands() {
    const { data } = await supabase.from('brands').select('*');
    if (data) {
      setBrands(data);
      if (data.length > 0) {
        setSelectedBrand(data[0]);
      }
    }
  }

  // 获取分类
  async function fetchCategories(brandId: number) {
    const { data } = await supabase.from('categories').select('*').eq('brand_id', brandId).order('id');
    if (data) {
      setCategories(data);
    }
  }

  // 添加分类
  async function addCategory() {
    if (!selectedBrand || !newCategoryName.trim()) return;
    const { data, error } = await supabase.from('categories').insert({
      brand_id: selectedBrand.id,
      name: newCategoryName.trim()
    }).select();
    if (!error && data) {
      setNewCategoryName('');
      fetchCategories(selectedBrand.id);
    }
  }

  // 删除分类
  async function deleteCategory(id: number) {
    if (!selectedBrand) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories(selectedBrand.id);
  }

  async function fetchProducts(brandId: number) {
    const { data } = await supabase.from('products').select('*').eq('brand_id', brandId);
    if (data) {
      const productsWithSpecs = data.map((p: any) => {
        let specGroups = null;
        try {
          if (p.spec_groups) {
            const parsed = JSON.parse(p.spec_groups);
            specGroups = Array.isArray(parsed) ? parsed : null;
          }
        } catch (e) {
          console.error('解析spec_groups失败:', e);
          specGroups = null;
        }
        return {
          ...p,
          specifications: p.specifications ? JSON.parse(p.specifications) : [],
          spec_groups: specGroups,
        };
      });
      setProducts(productsWithSpecs);
    }
  }

  async function fetchAllProducts() {
    const { data } = await supabase.from('products').select('*');
    if (data) {
      const productsWithSpecs = data.map((p: any) => {
        let specGroups = null;
        try {
          if (p.spec_groups) {
            const parsed = JSON.parse(p.spec_groups);
            specGroups = Array.isArray(parsed) ? parsed : null;
          }
        } catch (e) {
          console.error('解析spec_groups失败:', e);
          specGroups = null;
        }
        return {
          ...p,
          specifications: p.specifications ? JSON.parse(p.specifications) : [],
          spec_groups: specGroups,
        };
      });
      setProducts(productsWithSpecs);
    }
  }

  // Admin functions
  async function addBrand() {
    if (!newBrandName) return;
    const { error } = await supabase.from('brands').insert({
      name: newBrandName,
      description: newBrandDesc,
      location: newBrandLocation,
      image_url: newBrandImageUrl || null,
      no_image_text: newBrandNoImageText || null,
      business_hours: newBrandBusinessHours || null,
    });
    if (!error) {
      fetchBrands();
      setNewBrandName('');
      setNewBrandDesc('');
      setNewBrandLocation('');
      setNewBrandImageUrl('');
      setNewBrandNoImageText('');
      setNewBrandBusinessHours('');
    }
  }

  async function updateBrand() {
    if (!editingBrand || !newBrandName) return;
    const { error } = await supabase.from('brands').update({
      name: newBrandName,
      description: newBrandDesc,
      location: newBrandLocation,
      image_url: newBrandImageUrl || null,
      no_image_text: newBrandNoImageText || null,
      business_hours: newBrandBusinessHours || null,
    }).eq('id', editingBrand.id);
    if (!error) {
      fetchBrands();
      setEditingBrand(null);
      setNewBrandImageUrl('');
      setNewBrandNoImageText('');
      setNewBrandBusinessHours('');
    }
  }

  async function deleteBrand(id: number) {
    await supabase.from('brands').delete().eq('id', id);
    await supabase.from('products').delete().eq('brand_id', id);
    fetchBrands();
  }

  async function addProduct() {
    if (!selectedBrand || !newProductName || !newProductPrice) return;
    
    // 生成规格JSON（包含每个选项的价格和最多可选数量）
    const specGroupsData = specGroupsEditor
      .map(g => ({ 
        name: g.name || '规格', 
        type: g.type || 'single', 
        maxSelect: g.maxSelect || (g.type === 'single' ? 1 : 999),
        options: (g.options || []).filter(o => o.name && o.name.trim()).map(o => ({
          name: o.name.trim(),
          price: o.price || 0
        }))
      }))
      .filter(g => g.options.length > 0);

    const { error } = await supabase.from('products').insert({
      brand_id: selectedBrand.id,
      name: newProductName,
      description: newProductDesc,
      price: parseFloat(newProductPrice),
      spec_groups: specGroupsData,
      image_url: newProductImageUrl || null,
      no_image_text: newProductNoImageText || null,
      categories: newProductCategories.length > 0 ? newProductCategories : [],
      tags: newProductTags.length > 0 ? newProductTags : [],
    });
    if (!error) {
      fetchProducts(selectedBrand.id);
      setNewProductName('');
      setNewProductDesc('');
      setNewProductPrice('');
      setSpecGroupsEditor([{ id: 1, name: '新规格', type: 'single', options: [{ name: '', price: 0 }], maxSelect: 1 }]);
      setNewProductImageUrl('');
      setNewProductNoImageText('');
      setNewProductCategories([]);
      setNewProductTags([]);
    }
  }

  async function updateProduct() {
    if (!editingProduct || !newProductName || !newProductPrice) return;
    
    // 生成规格JSON（包含每个选项的价格和最多可选数量）
    const specGroupsData = specGroupsEditor
      .map(g => ({ 
        name: g.name || '规格', 
        type: g.type || 'single', 
        maxSelect: g.maxSelect || (g.type === 'single' ? 1 : 999),
        options: (g.options || []).filter(o => o.name && o.name.trim()).map(o => ({
          name: o.name.trim(),
          price: o.price || 0
        }))
      }))
      .filter(g => g.options.length > 0);

    const { error } = await supabase.from('products').update({
      name: newProductName,
      description: newProductDesc,
      price: parseFloat(newProductPrice),
      spec_groups: specGroupsData,
      image_url: newProductImageUrl || null,
      no_image_text: newProductNoImageText || null,
      categories: newProductCategories.length > 0 ? newProductCategories : [],
      tags: newProductTags.length > 0 ? newProductTags : [],
    }).eq('id', editingProduct.id);
    if (!error) {
      if (selectedBrand) fetchProducts(selectedBrand.id);
      setEditingProduct(null);
      setSpecGroupsEditor([{ id: 1, name: '新规格', type: 'single', options: [{ name: '', price: 0 }], maxSelect: 1 }]);
      setNewProductImageUrl('');
      setNewProductNoImageText('');
      setNewProductCategories([]);
      setNewProductTags([]);
    }
  }

  async function deleteProduct(id: number) {
    await supabase.from('products').delete().eq('id', id);
    if (selectedBrand) fetchProducts(selectedBrand.id);
  }

  // 获取所有用户（管理员）
  async function fetchAllUsers() {
    // 获取用户资料和密码
    const { data: profiles } = await supabase.from('user_profiles').select('*');
    const { data: auths } = await supabase.from('user_auth').select('*');
    
    if (profiles) {
      // 合并用户资料和密码
      const usersWithPassword = profiles.map(p => {
        const auth = auths?.find(a => a.user_id === p.id);
        return { ...p, password: auth?.password_hash || '-' };
      });
      setAllUsers(usersWithPassword);
    }
  }

  // 获取所有订单（管理员）
  async function fetchAllOrders() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) {
      setAllOrders(data);
    }
  }

  // 获取通知日志
  async function fetchNotificationLogs() {
    const { data } = await supabase.from('notification_logs').select('*').order('created_at', { ascending: false });
    if (data) {
      setNotificationLogs(data);
    }
  }

  // 获取用户站内通知
  async function fetchUserNotifications() {
    if (!user?.email) return;
    const { data } = await supabase.from('notification_logs')
      .select('*')
      .eq('user_email', user.email)
      .order('created_at', { ascending: false });
    if (data) {
      setUserNotifications(data);
    }
  }

  // 发送订单状态通知
  async function sendOrderNotification(orderId: number, status: 'received' | 'in_progress' | 'completed' | 'rejected' | 'cancelled', customMessage?: string) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    // 取消接单和完成订单时直接更新状态，不检查重复
    if (status !== 'cancelled' && status !== 'completed') {
      // 检查是否已存在相同订单和状态的通知，避免重复发送
      const { data: existingLog } = await supabase.from('notification_logs')
        .select('id')
        .eq('order_id', orderId)
        .eq('status', status)
        .single();
      
      if (existingLog) {
        console.log('该订单状态已通知，跳过重复发送');
        return;
      }
    }

    const statusMessages: { [key: string]: string } = {
      received: '您的订单已接单',
      in_progress: '您的订单正在处理中',
      completed: '您的订单已完成',
      rejected: '抱歉，您的订单已被拒绝',
      cancelled: '您的订单已取消接单'
    };

    const statusLabels: { [key: string]: string } = {
      received: '已接单',
      in_progress: '进行中',
      completed: '已完成',
      rejected: '已拒绝',
      cancelled: '已取消'
    };

    const message = customMessage || statusMessages[status];

    // 更新订单状态（取消接单时改回pending）
    const updateStatus = status === 'cancelled' ? 'pending' : status;
    const { error: updateError } = await supabase.from('orders').update({
      status: updateStatus
    }).eq('id', orderId);

    if (updateError) {
      console.error('更新订单状态失败:', updateError);
      return;
    }

    // 保存通知日志
    const { data: logData, error: logError } = await supabase.from('notification_logs').insert({
      order_id: orderId,
      user_email: order.user_email,
      status: status,
      message: message,
      notification_type: 'email'
    }).select().single();

    if (logError) {
      console.error('保存通知日志失败:', logError);
      return;
    }

    // 发送邮件通知（如果用户的邮箱可用，则发送邮件给用户；始终发送邮件给管理员）
    const userEmailUsable = order.email_usable !== false; // 默认true
    
    try {
      // 发送邮件给管理员
      await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmR0am96YWRpY215Y3p6Y21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzQzMzYsImV4cCI6MjA5NTU1MDMzNn0.IemBcvhvgvue85ro9NEniZAgsy3y2FD3vwcYaEqlylc`,
        },
        body: JSON.stringify({
          user_email: order.user_email,
          user_name: order.user_name,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          total_amount: order.total_amount,
          order_id: orderId,
          notification_message: message,
          is_rejection: status === 'rejected',
          contact_phone: order.contact_phone,
          contact_wechat: order.contact_wechat,
          contact_qq: order.contact_qq,
          contact_other: order.contact_other,
        }),
      });

      // 如果用户邮箱可用，发送邮件通知给用户
      if (userEmailUsable && order.user_email) {
        await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmR0am96YWRpY215Y3p6Y21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzQzMzYsImV4cCI6MjA5NTU1MDMzNn0.IemBcvhvgvue85ro9NEniZAgsy3y2FD3vwcYaEqlylc`,
          },
          body: JSON.stringify({
            user_email: order.user_email,
            user_name: order.user_name,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            total_amount: order.total_amount,
            order_id: orderId,
            notification_message: { status, message },
            is_rejection: status === 'rejected',
            notify_user: true,
          }),
        });
      }
    } catch (e) {
      console.error('发送邮件失败:', e);
    }

    // 生成HTML文件内容
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>订单状态通知 - ${orderId}</title>
</head>
<body>
  <h2>ZC代购·预约系统 订单通知</h2>
  <p>订单编号: ${orderId}</p>
  <p>状态: ${statusLabels[status]}</p>
  <p>消息: ${message}</p>
  <p>用户邮箱: ${order.user_email}</p>
  <p>用户姓名: ${order.user_name}</p>
  <p>联系方式: ${order.contact_phone || '-'} / ${order.contact_wechat || '-'} / ${order.contact_qq || '-'} / ${order.contact_other || '-'}</p>
  <hr>
  <p>商品明细:</p>
  <ul>
    ${(typeof order.items === 'string' ? JSON.parse(order.items) : order.items).map((item: any) => 
      `<li>${item.name} - ¥${item.price} x ${item.quantity} ${item.specifications ? '(' + item.specifications + ')' : ''}</li>`
    ).join('')}
  </ul>
  <p>订单总金额: ¥${order.total_amount}</p>
  <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
</body>
</html>`;

    // 保存HTML到notification_html字段
    await supabase.from('notification_logs').update({
      html_content: htmlContent
    }).eq('id', logData.id);

    fetchNotificationLogs();
    fetchAllOrders();
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 计算选中规格的附加价格
  const calculateSpecPrice = (product: Product, selectedGroups: { [groupName: string]: string[] }): number => {
    if (!product.spec_groups || !selectedGroups) return 0;
    let totalSpecPrice = 0;
    
    for (const group of product.spec_groups) {
      const selectedOptions = selectedGroups[group.name] || [];
      for (const optionName of selectedOptions) {
        const option = group.options?.find((o: any) => o && (o.name === optionName || o === optionName));
        if (option && typeof option === 'object') {
          totalSpecPrice += (option as any).price || 0;
        }
      }
    }
    return totalSpecPrice;
  };

  const cartTotal = cart.reduce((sum, item) => {
    const specPrice = item.specPrice || 0;
    return sum + (item.price + specPrice) * item.quantity;
  }, 0);

  function addToCart(product: Product) {
    // 使用分组规格或旧格式
    const hasSpecGroups = product.spec_groups && product.spec_groups.length > 0;
    
    // 计算规格附加价格
    const specPrice = hasSpecGroups ? calculateSpecPrice(product, selectedSpecGroups) : 0;
    
    if (hasSpecGroups) {
      // 分组规格：生成唯一key
      const specsKey = JSON.stringify(selectedSpecGroups);
      const existingItem = cart.find(item => item.id === product.id && JSON.stringify(item.selectedSpecGroups) === specsKey);
      if (existingItem) {
        setCart(cart.map(item => 
          item.id === product.id && JSON.stringify(item.selectedSpecGroups) === specsKey
            ? { ...item, quantity: item.quantity + itemQuantity }
            : item
        ));
      } else {
        setCart([...cart, { ...product, quantity: itemQuantity, selectedSpecGroups: { ...selectedSpecGroups }, specPrice }]);
      }
    } else {
      // 旧格式兼容
      const specsKey = selectedSpecs.sort().join(',');
      const existingItem = cart.find(item => item.id === product.id && (item.selectedSpecs?.sort().join(',') || '') === specsKey);
      if (existingItem) {
        setCart(cart.map(item => 
          item.id === product.id && (item.selectedSpecs?.sort().join(',') || '') === specsKey
            ? { ...item, quantity: item.quantity + itemQuantity }
            : item
        ));
      } else {
        setCart([...cart, { ...product, quantity: itemQuantity, selectedSpecs, specPrice: 0 }]);
      }
    }
    setSelectedProduct(null);
    setSelectedSpecs([]);
    setSelectedSpecGroups({});
    setItemQuantity(1);
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, delta: number) {
    const newCart = [...cart];
    newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
    setCart(newCart);
  }

  // 提交订单（带联系方式）
  async function submitOrderWithContact() {
    if (!user || cart.length === 0 || isSubmitting) return;
    
    // 防止重复提交
    setIsSubmitting(true);

    // 验证：如果邮箱不可用，必须填写至少一个联系方式
    if (!emailUsable && !contactPhone && !contactWechat && !contactQQ && !contactOther) {
      setIsSubmitting(false);
      alert('请至少填写一种联系方式（电话、微信、QQ或其他）');
      return;
    }

    const orderItems = cart.map(item => {
      // 生成规格描述（兼容新旧格式）
      let specDescription = '';
      if (item.selectedSpecGroups && Object.keys(item.selectedSpecGroups).length > 0) {
        // 新分组格式
        specDescription = Object.entries(item.selectedSpecGroups)
          .map(([groupName, options]) => `${groupName}: ${options.join(', ')}`)
          .join(' | ');
      } else if (item.selectedSpecs && item.selectedSpecs.length > 0) {
        // 旧格式
        specDescription = item.selectedSpecs.join(', ');
      }
      
      return {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specifications: specDescription,
        spec_groups: item.selectedSpecGroups || null,  // 保存分组规格
        spec_price: item.specPrice || 0,  // 保存规格附加价格
      };
    });

    // 保存订单到数据库
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      user_id: user.id,
      user_email: user.email,
      user_name: user.user_metadata?.name || name,
      items: orderItems,
      total_amount: cartTotal,
      status: 'pending',
      contact_phone: contactPhone || null,
      contact_wechat: contactWechat || null,
      contact_qq: contactQQ || null,
      contact_other: contactOther || null,
      email_usable: emailUsable,
    }).select().single();

    if (orderError) {
      setIsSubmitting(false);
      alert('订单保存失败: ' + orderError.message);
      return;
    }

    // 发送邮件通知（新订单只发给管理员，不发给用户）
    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmR0am96YWRpY215Y3p6Y21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzQzMzYsImV4cCI6MjA5NTU1MDMzNn0.IemBcvhvgvue85ro9NEniZAgsy3y2FD3vwcYaEqlylc`,
        },
        body: JSON.stringify({
          user_email: user.email,
          user_name: user.user_metadata?.name || name,
          items: orderItems,
          total_amount: cartTotal,
          order_id: orderData?.id,
          contact_phone: contactPhone,
          contact_wechat: contactWechat,
          contact_qq: contactQQ,
          contact_other: contactOther,
          notify_user: false, // 新订单只发给管理员
        }),
      });

      const result = await response.json();
      setIsSubmitting(false);
      if (result.success) {
        setOrderTotal(cartTotal);
        setCart([]);
        setShowCart(false);
        setShowOrderConfirm(false);
        // 重置联系方式
        setContactPhone('');
        setContactWechat('');
        setContactQQ('');
        setContactOther('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert('邮件发送失败，但订单已保存');
      }
    } catch (error) {
      alert('提交订单时出错: ' + error);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        alert(error.message);
      } else {
        // 登录成功后检查并创建用户资料
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', email)
          .single();
        
        if (!existingProfile) {
          // 创建用户资料（从注册时填写的联系信息）
          await supabase.from('user_profiles').insert({
            email: email,
            name: name,
            phone: contactPhone || null,
            wechat: contactWechat || null,
            qq: contactQQ || null,
          });
        }
        
        // 登录成功后也检查是否在订单中留下了联系方式，更新到用户资料
        const { data: recentOrder } = await supabase
          .from('orders')
          .select('contact_phone, contact_wechat, contact_qq, contact_other')
          .eq('user_email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (recentOrder && (!existingProfile || !existingProfile.phone)) {
          await supabase
            .from('user_profiles')
            .update({
              phone: recentOrder.contact_phone,
              wechat: recentOrder.contact_wechat,
              qq: recentOrder.contact_qq,
              other_contact: recentOrder.contact_other,
            })
            .eq('email', email);
        }
        
        // 重置联系信息
        setContactPhone('');
        setContactWechat('');
        setContactQQ('');
        
        setShowAuth(false);
      }
    } else {
      const { error } = await signUp(email, password, name, { 
        phone: contactPhone, 
        wechat: contactWechat, 
        qq: contactQQ 
      });
      if (error) {
        alert(error.message);
      } else {
        // 重置联系信息
        setContactPhone('');
        setContactWechat('');
        setContactQQ('');
        
        alert('注册成功！请登录邮箱验证后登录。');
        setIsLogin(true);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  // Admin Panel
  if (isAdmin && showAdminPanel) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-600">ZC代购管理系统</h1>
            <div className="flex gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => { setAdminTab('products'); if (selectedBrand) fetchCategories(selectedBrand.id); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${adminTab === 'products' ? 'bg-white text-purple-700 shadow' : 'text-gray-600'}`}
                >
                  <Package size={18} /> 商品管理
                </button>

                <button
                  onClick={() => { setAdminTab('users'); fetchAllUsers(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${adminTab === 'users' ? 'bg-white text-purple-700 shadow' : 'text-gray-600'}`}
                >
                  <Users size={18} /> 用户管理
                </button>
                <button
                  onClick={() => { setAdminTab('notifications'); fetchAllOrders(); fetchNotificationLogs(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${adminTab === 'notifications' ? 'bg-white text-purple-700 shadow' : 'text-gray-600'}`}
                >
                  <Bell size={18} /> 订单通知
                </button>
                <button
                  onClick={() => setAdminTab('settings')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${adminTab === 'settings' ? 'bg-white text-purple-700 shadow' : 'text-gray-600'}`}
                >
                  <FileText size={18} /> 系统设置
                </button>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                返回用户端
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                <LogOut size={20} /> 退出登录
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* 商品管理标签页 */}
          {adminTab === 'products' && (
          <>
          {/* 品牌管理 */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Store className="w-6 h-6" /> 品牌管理
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <input
                type="text"
                placeholder="品牌名称"
                value={editingBrand ? newBrandName : ''}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="描述"
                value={editingBrand ? newBrandDesc : ''}
                onChange={(e) => setNewBrandDesc(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="位置"
                value={editingBrand ? newBrandLocation : ''}
                onChange={(e) => setNewBrandLocation(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="图片URL"
                value={editingBrand ? newBrandImageUrl : ''}
                onChange={(e) => setNewBrandImageUrl(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="无图显示文字"
                value={editingBrand ? newBrandNoImageText : ''}
                onChange={(e) => setNewBrandNoImageText(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="营业时间，如：09:00-21:00"
                value={editingBrand ? newBrandBusinessHours : ''}
                onChange={(e) => setNewBrandBusinessHours(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <button
                onClick={editingBrand ? updateBrand : addBrand}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {editingBrand ? '更新' : '添加'}
              </button>
            </div>
            <div className="space-y-2">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {brand.image_url ? (
                      <img src={brand.image_url} alt={brand.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {brand.no_image_text || brand.name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">{brand.name}</span>
                      <span className="text-gray-500 text-sm ml-2">{brand.description} | {brand.location}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingBrand(brand); setNewBrandName(brand.name); setNewBrandDesc(brand.description || ''); setNewBrandLocation(brand.location || ''); setNewBrandImageUrl(brand.image_url || ''); setNewBrandNoImageText(brand.no_image_text || ''); setNewBrandBusinessHours(brand.business_hours || ''); }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => deleteBrand(brand.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 分类管理 */}
          {selectedBrand && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-6 h-6" /> {selectedBrand.name} - 分类管理
            </h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="新分类名称"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                添加分类
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <p className="text-gray-500">暂无分类，请添加</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="font-medium">{cat.name}</span>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          )}

          {/* 商品管理 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-6 h-6" /> 商品管理
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <select
                value={selectedBrand?.id || ''}
                onChange={(e) => { const b = brands.find(b => b.id === parseInt(e.target.value)); setSelectedBrand(b || null); }}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">选择品牌</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="商品名称"
                value={editingProduct ? newProductName : newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="描述"
                value={editingProduct ? newProductDesc : newProductDesc}
                onChange={(e) => setNewProductDesc(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="number"
                placeholder="价格"
                value={editingProduct ? newProductPrice : newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="图片URL"
                value={editingProduct ? newProductImageUrl : ''}
                onChange={(e) => setNewProductImageUrl(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            
            {/* 分类和标签设置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">选择分类（可多选）</label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[42px]">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProductCategories.includes(cat.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewProductCategories([...newProductCategories, cat.id]);
                          } else {
                            setNewProductCategories(newProductCategories.filter(id => id !== cat.id));
                          }
                        }}
                        className="rounded text-purple-600"
                      />
                      <span className="text-sm">{cat.name}</span>
                    </label>
                  ))}
                  {categories.length === 0 && <span className="text-gray-400 text-sm">暂无分类</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">商品标签（用逗号分隔）</label>
                <input
                  type="text"
                  placeholder="低负担, 冷热皆宜, 爆款"
                  value={newProductTags.join(', ')}
                  onChange={(e) => setNewProductTags(e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                  className="px-4 py-2 border rounded-lg w-full"
                />
              </div>
            </div>
            
            {/* 灵活规格设置 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">商品规格</h4>
                <button
                  onClick={addSpecGroup}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  + 添加规格组
                </button>
              </div>
              <div className="space-y-4">
                {specGroupsEditor.map((group) => (
                  <div key={group.id} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => updateSpecGroupName(group.id, e.target.value)}
                        placeholder="规格名称"
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <select
                        value={group.type}
                        onChange={(e) => {
                          const newType = e.target.value as 'single' | 'multi';
                          updateSpecGroupType(group.id, newType);
                          // 单选时默认最多1个，多选时默认最多3个
                          setSpecGroupsEditor(specGroupsEditor.map(g => 
                            g.id === group.id ? { ...g, type: newType, maxSelect: newType === 'single' ? 1 : 3 } : g
                          ));
                        }}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="single">单选</option>
                        <option value="multi">多选</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">最多选</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={group.maxSelect || 1}
                          onChange={(e) => setSpecGroupsEditor(specGroupsEditor.map(g => 
                            g.id === group.id ? { ...g, maxSelect: parseInt(e.target.value) || 1 } : g
                          ))}
                          className="w-12 px-1 py-1 border rounded text-sm text-center"
                        />
                        <span className="text-xs text-gray-500">项</span>
                      </div>
                      {specGroupsEditor.length > 1 && (
                        <button
                          onClick={() => removeSpecGroup(group.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-2"
                        >
                          删除组
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {(group.options || [{ name: '', price: 0 }]).map((opt: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={opt?.name || ''}
                            onChange={(e) => updateSpecOption(group.id, idx, e.target.value)}
                            placeholder={`选项${idx + 1}`}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                          />
                          <input
                            type="number"
                            value={opt?.price || 0}
                            onChange={(e) => updateSpecOptionPrice(group.id, idx, e.target.value)}
                            placeholder="+¥"
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                          {(group.options || [{ name: '', price: 0 }]).length > 1 && (
                            <button
                              onClick={() => removeSpecOption(group.id, idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addSpecOption(group.id)}
                      className="text-sm text-purple-600 hover:text-purple-800 mt-1"
                    >
                      + 添加选项
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="无图显示文字"
                value={editingProduct ? newProductNoImageText : ''}
                onChange={(e) => setNewProductNoImageText(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <button
                onClick={editingProduct ? updateProduct : addProduct}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {editingProduct ? '更新商品' : '添加商品'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{product.name}</span>
                    <span className="text-gray-500 text-sm ml-2">¥{product.price}</span>
                    <p className="text-xs text-gray-400">{brands.find(b => b.id === product.brand_id)?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { 
                        // 解析spec_groups（可能是字符串或数组或已解析的对象）
                        let groups: any[] = [];
                        const specGroupsData = product.spec_groups;
                        if (specGroupsData) {
                          if (typeof specGroupsData === 'string') {
                            try {
                              groups = JSON.parse(specGroupsData);
                            } catch (e) {
                              console.error('解析规格失败:', e);
                              groups = [];
                            }
                          } else if (Array.isArray(specGroupsData)) {
                            groups = specGroupsData;
                          }
                        }
                        console.log('编辑商品规格数据:', groups);
                        // 转换为编辑器格式（支持带价格的选项）
                        const editorGroups: SpecGroupEditor[] = groups.length > 0 
                          ? groups.map((g: any, idx: number) => ({
                              id: idx,
                              name: g?.name || '新规格',
                              type: (g?.type === 'multi' ? 'multi' : 'single') as 'single' | 'multi',
                              maxSelect: g?.maxSelect || (g?.type === 'single' ? 1 : 999),
                              options: ((g?.options || []).length > 0 
                                ? g.options.map((o: any) => ({ 
                                    name: o?.name || '', 
                                    price: typeof o?.price === 'number' ? o.price : 0 
                                  }))
                                : [{ name: '', price: 0 }]) as SpecOption[]
                            }))
                          : [{ id: 1, name: '新规格', type: 'single' as const, options: [{ name: '', price: 0 }], maxSelect: 1 }];
                        setSpecGroupsEditor(editorGroups);
                        setEditingProduct(product); 
                        setNewProductName(product.name); 
                        setNewProductDesc(product.description || ''); 
                        setNewProductPrice(product.price.toString());
                        setNewProductCategories(product.categories || []);
                        setNewProductTags(product.tags || []);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}

          {/* 用户管理标签页 */}
          {adminTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" /> 用户管理
              </h2>
              {!userManagementAuth && (
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="请输入管理密码"
                    value={userManagementPassword}
                    onChange={(e) => setUserManagementPassword(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={() => {
                      if (userManagementPassword === 'TSZX2444666668888888') {
                        setUserManagementAuth(true);
                        fetchAllUsers();
                      } else {
                        alert('密码错误');
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    验证
                  </button>
                </div>
              )}
              {userManagementAuth && (
                <button
                  onClick={() => setUserManagementAuth(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  退出管理
                </button>
              )}
            </div>

            {userManagementAuth ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">邮箱</th>
                      <th className="px-4 py-2 text-left">密码</th>
                      <th className="px-4 py-2 text-left">姓名</th>
                      <th className="px-4 py-2 text-left">电话</th>
                      <th className="px-4 py-2 text-left">微信</th>
                      <th className="px-4 py-2 text-left">QQ</th>
                      <th className="px-4 py-2 text-left">其他</th>
                      <th className="px-4 py-2 text-left">注册时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => (
                      <tr key={user.id} className="border-t">
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2 text-red-600 font-mono">{user.password}</td>
                        <td className="px-4 py-2">{user.name || '-'}</td>
                        <td className="px-4 py-2">{user.phone || '-'}</td>
                        <td className="px-4 py-2">{user.wechat || '-'}</td>
                        <td className="px-4 py-2">{user.qq || '-'}</td>
                        <td className="px-4 py-2">{user.other_contact || '-'}</td>
                        <td className="px-4 py-2">{new Date(user.created_at).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allUsers.length === 0 && <p className="text-center text-gray-500 py-4">暂无用户数据</p>}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>请输入管理密码查看用户信息</p>
              </div>
            )}
          </div>
          )}

          {/* 订单通知标签页 */}
          {adminTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-6 h-6" /> 订单列表
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">订单ID</th>
                      <th className="px-4 py-2 text-left">用户邮箱</th>
                      <th className="px-4 py-2 text-left">姓名</th>
                      <th className="px-4 py-2 text-left">联系方式</th>
                      <th className="px-4 py-2 text-left">金额</th>
                      <th className="px-4 py-2 text-left">状态</th>
                      <th className="px-4 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((order) => (
                      <tr key={formatOrderNumber(order.order_number || order.id)} className="border-t">
                        <td className="px-4 py-2">{formatOrderNumber(order.order_number || order.id)}</td>
                        <td className="px-4 py-2">{order.user_email}</td>
                        <td className="px-4 py-2">{order.user_name}</td>
                        <td className="px-4 py-2 text-sm">
                          {order.contact_phone && <div>电话: {order.contact_phone}</div>}
                          {order.contact_wechat && <div>微信: {order.contact_wechat}</div>}
                          {order.contact_qq && <div>QQ: {order.contact_qq}</div>}
                          {order.contact_other && <div>其他: {order.contact_other}</div>}
                          {!order.contact_phone && !order.contact_wechat && !order.contact_qq && !order.contact_other && <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-2">¥{order.total_amount}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'received' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                            order.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {order.status === 'pending' ? '待接单' : 
                             order.status === 'received' ? '已接单' :
                             order.status === 'in_progress' ? '进行中' :
                             order.status === 'rejected' ? '已拒绝' : '已完成'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {order.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => sendOrderNotification(order.id, 'received')}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                >
                                  接单
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('请输入拒绝原因（如：商品缺货/价格变动等）');
                                    if (reason) {
                                      sendOrderNotification(order.id, 'rejected', `抱歉，您的订单已被拒绝。原因：${reason}`);
                                    }
                                  }}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                >
                                  拒绝
                                </button>
                              </>
                            )}
                            {order.status === 'received' && (
                              <>
                                <button
                                  onClick={() => sendOrderNotification(order.id, 'in_progress')}
                                  className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                                >
                                  进行中
                                </button>
                                <button
                                  onClick={() => sendOrderNotification(order.id, 'completed')}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                >
                                  完成
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('确定要取消接单吗？')) {
                                      sendOrderNotification(order.id, 'cancelled');
                                    }
                                  }}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                >
                                  取消接单
                                </button>
                              </>
                            )}
                            {order.status === 'in_progress' && (
                              <>
                                <button
                                  onClick={() => sendOrderNotification(order.id, 'completed')}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                >
                                  完成
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('确定要取消接单吗？')) {
                                      sendOrderNotification(order.id, 'cancelled');
                                    }
                                  }}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                >
                                  取消接单
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allOrders.length === 0 && <p className="text-center text-gray-500 py-4">暂无订单</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6" /> 通知日志
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 text-left">订单ID</th>
                      <th className="px-4 py-2 text-left">用户邮箱</th>
                      <th className="px-4 py-2 text-left">状态</th>
                      <th className="px-4 py-2 text-left">消息</th>
                      <th className="px-4 py-2 text-left">时间</th>
                      <th className="px-4 py-2 text-left">下载</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationLogs.map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="px-4 py-2">{log.id}</td>
                        <td className="px-4 py-2">{log.order_id}</td>
                        <td className="px-4 py-2">{log.user_email}</td>
                        <td className="px-4 py-2">{log.status}</td>
                        <td className="px-4 py-2 text-sm">{log.message}</td>
                        <td className="px-4 py-2 text-sm">{new Date(log.created_at).toLocaleString('zh-CN')}</td>
                        <td className="px-4 py-2">
                          {log.html_content ? (
                            <button
                              onClick={() => {
                                const blob = new Blob([log.html_content], { type: 'text/html' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `通知_${log.order_id}_${log.status}.html`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                            >
                              <Download size={14} /> 下载
                            </button>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {notificationLogs.length === 0 && <p className="text-center text-gray-500 py-4">暂无通知记录</p>}
              </div>
            </div>
          </div>
          )}

          {/* 系统设置标签页 */}
          {adminTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" /> 用户协议设置
            </h2>
            <p className="text-gray-600 text-sm mb-4">编辑用户在注册和下单前需要同意的用户协议内容</p>
            <textarea
              value={userAgreementContent}
              onChange={(e) => setUserAgreementContent(e.target.value)}
              className="w-full h-96 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              placeholder="请输入用户协议内容..."
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={async () => {
                  // 保存到localStorage模拟持久化
                  localStorage.setItem('userAgreement', userAgreementContent);
                  alert('用户协议已保存');
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                保存设置
              </button>
            </div>
          </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-full"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            {/* 状态指示 + 实时时间 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 hidden sm:inline">在线·随时响应</span>
              </div>
              <div className="text-sm text-gray-600 hidden md:block">
                <span className="mr-2">{currentTime.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                <span className="font-medium">{currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索商品..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 用户/购物车 */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* 购物车图标 - 普通用户显示 */}
                  {!isAdmin && (
                    <button
                      onClick={() => setShowCart(true)}
                      className="relative p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ShoppingCart className="w-6 h-6 text-gray-700" />
                      {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {cart.length}
                        </span>
                      )}
                    </button>
                  )}
                  {/* 管理后台按钮 - 管理员显示 */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
                    >
                      <Package className="w-5 h-5" />
                      管理后台
                    </button>
                  )}
                  {/* 站内通知入口 - 普通用户显示 */}
                  {!isAdmin && (
                    <button
                      onClick={() => { fetchUserNotifications(); setShowInbox(true); }}
                      className="relative p-2 hover:bg-gray-100 rounded-full"
                    >
                      <Bell className="w-6 h-6 text-gray-700" />
                    </button>
                  )}
                  <button
                    onClick={signOut}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <LogOut className="w-6 h-6 text-gray-700" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
                >
                  <User className="w-5 h-5" />
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主体区域 - Flex容器 */}
      <div className="flex">
        {/* 品牌列表侧边栏 */}
        {showSidebar && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowSidebar(false)}>
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}
        <aside className={`
          fixed md:sticky top-14 md:top-16 left-0 z-40 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] w-64 bg-white shadow-lg md:shadow-none transform transition-transform duration-300
          ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}>
        <div className="p-4 overflow-y-auto h-full">
          <h3 className="font-bold text-gray-800 mb-3">选择品牌</h3>
          <div className="space-y-2">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => {
                  setSelectedBrand(brand);
                  fetchCategories(brand.id);
                  setShowSidebar(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition ${
                  selectedBrand?.id === brand.id 
                    ? 'bg-purple-100 text-purple-700 font-medium' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {brand.image_url ? (
                    <img src={brand.image_url} alt={brand.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Store className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{brand.name}</p>
                    <p className="text-xs text-gray-500 truncate">{brand.location}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 主内容区 - 新布局 */}
      <main className="flex-1 min-w-0">
        <div className="flex flex-col">
          {/* 顶部供应商信息栏 */}
          {selectedBrand ? (
            <div className="bg-white shadow-sm sticky top-14 md:top-16 z-30">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-bold text-lg text-gray-800">{selectedBrand.name}</h1>
                    {selectedBrand.business_hours && (
                      <p className="text-xs text-gray-500 mt-0.5">🕐 {selectedBrand.business_hours}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {selectedBrand.location}
                  </div>
                </div>
              </div>
              {/* 分类标签 - 移动端横向滚动 */}
              <div className="px-4 pb-3 overflow-x-auto flex gap-2 scrollbar-hide">
                <button
                  onClick={() => {}}
                  className="flex-shrink-0 px-4 py-1.5 bg-purple-600 text-white text-sm rounded-full font-medium"
                >
                  全部
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className="flex-shrink-0 px-4 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* 商品列表 */}
          <div className="px-4 py-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* 商品图片 */}
                <div className="relative">
                  {product.image_url ? (
                    <div className="w-full h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
                      <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">
                      {product.no_image_text || '暂无图片'}
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{product.name}</h3>
                  {/* 商品标签 */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(product.tags || []).map((tag: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                    {(product.tags || []).length === 0 && (
                      <span className="text-xs text-gray-400">优质商品</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-bold text-purple-600">¥{product.price}</span>
                      <span className="text-xs text-gray-400">起</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (user && !isAdmin) {
                          try {
                            const { data: latestProduct, error } = await supabase
                              .from('products')
                              .select('*')
                              .eq('id', product.id)
                              .single();
                            
                            if (error) {
                              console.error('获取商品失败:', error);
                              setSelectedProduct(product);
                            } else if (latestProduct) {
                              let specGroups = null;
                              try {
                                if (latestProduct.spec_groups) {
                                  const parsed = typeof latestProduct.spec_groups === 'string' 
                                    ? JSON.parse(latestProduct.spec_groups) 
                                    : latestProduct.spec_groups;
                                  specGroups = Array.isArray(parsed) ? parsed : null;
                                }
                              } catch (e) {
                                console.error('解析spec_groups失败:', e);
                              }
                              
                              setSelectedProduct({
                                ...latestProduct,
                                spec_groups: specGroups
                              });
                            } else {
                              setSelectedProduct(product);
                            }
                          } catch (err) {
                            console.error('获取商品出错:', err);
                            setSelectedProduct(product);
                          }
                          
                          setSelectedSpecs([]);
                          setSelectedSpecGroups({});
                          setItemQuantity(1);
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg font-medium"
                    >
                      选规格
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </main>
      </div>

      {/* 登录/注册弹窗 */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAuth(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{isLogin ? '登录' : '注册'}</h3>
              <button onClick={() => setShowAuth(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">姓名</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">电话（选填）</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="用于紧急联系"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">微信（选填）</label>
                  <input
                    type="text"
                    value={contactWechat}
                    onChange={(e) => setContactWechat(e.target.value)}
                    placeholder="用于紧急联系"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">QQ号（选填）</label>
                  <input
                    type="number"
                    value={contactQQ}
                    onChange={(e) => setContactQQ(e.target.value)}
                    placeholder="用于紧急联系"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                </>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition"
              >
                {isLogin ? '登录' : '注册'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600">
              {isLogin ? '没有账号？' : '已有账号？'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-600 font-medium ml-1"
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* 购物车底部栏 - 普通用户登录后显示 */}
      {cart.length > 0 && user && !isAdmin && (
        <div className="fixed bottom-16 left-0 right-0 bg-white shadow-lg border-t">
          {/* 警示语 */}
          <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
            <p className="text-xs text-orange-700 text-center">⚠️ 请确认商品规格选择无误，提交后无法修改</p>
          </div>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-gray-600">合计：</span>
              <span className="text-2xl font-bold text-purple-600">¥{cartTotal}</span>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-medium hover:opacity-90 transition"
            >
              去结算 ({cart.length})
            </button>
          </div>
        </div>
      )}

      {/* 商品规格选择弹窗 */}
      {selectedProduct && user && !isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* 商品图片 */}
            {selectedProduct.image_url ? (
              <div className="w-full h-48 bg-gray-50 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400">
                {selectedProduct.no_image_text || '暂无图片'}
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedProduct.name}</h3>
                <p className="text-gray-500">{selectedProduct.description}</p>
              </div>
              <span className="text-2xl font-bold text-purple-600">¥{selectedProduct.price}</span>
            </div>

            {/* 规格选择 - 分组模式 */}
            {selectedProduct.spec_groups && selectedProduct.spec_groups.length > 0 ? (
              <div className="mb-4 space-y-4">
                {selectedProduct.spec_groups.map((group, gIdx) => (
                  <div key={gIdx}>
                    <p className="text-sm text-gray-600 mb-2">
                      {group?.name || '规格'} {group?.type === 'single' ? '（必选）' : '（可多选）'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(group?.options || []).map((option: any, oIdx: number) => {
                        const optionName = option?.name || '';
                        const optionPrice = option?.price || 0;
                        const currentGroup = selectedSpecGroups[group?.name || ''] || [];
                        const isSelected = currentGroup.includes(optionName);
                        return (
                          <button
                            key={oIdx}
                            onClick={() => {
                              if (group?.type === 'single') {
                                // 单选
                                setSelectedSpecGroups({
                                  ...selectedSpecGroups,
                                  [group.name]: [optionName]
                                });
                              } else {
                                // 多选
                                if (isSelected) {
                                  setSelectedSpecGroups({
                                    ...selectedSpecGroups,
                                    [group.name]: currentGroup.filter(o => o !== optionName)
                                  });
                                } else {
                                  setSelectedSpecGroups({
                                    ...selectedSpecGroups,
                                    [group.name]: [...currentGroup, optionName]
                                  });
                                }
                              }
                            }}
                            className={`px-4 py-2 rounded-full border-2 transition ${
                              isSelected
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 text-gray-700 hover:border-green-300'
                            }`}
                          >
                            {optionName}{optionPrice > 0 ? ` (+¥${optionPrice})` : optionPrice < 0 ? ` (¥${optionPrice})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 兼容旧格式 - 简单多选 */
              selectedProduct.specifications && selectedProduct.specifications.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">选择规格（可多选）</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.specifications.map((spec, idx) => {
                      const isSelected = selectedSpecs.includes(spec);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSpecs(selectedSpecs.filter(s => s !== spec));
                            } else {
                              setSelectedSpecs([...selectedSpecs, spec]);
                            }
                          }}
                          className={`px-4 py-2 rounded-full border-2 transition ${
                            isSelected
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 text-gray-700 hover:border-green-300'
                          }`}
                        >
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">数量</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl hover:border-purple-500"
                >
                  -
                </button>
                <span className="text-xl font-medium">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity(itemQuantity + 1)}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl hover:border-purple-500"
                >
                  +
                </button>
              </div>
            </div>

            {/* 计算当前选中规格的附加价格 */}
            {(() => {
              const currentSpecPrice = selectedProduct?.spec_groups ? calculateSpecPrice(selectedProduct, selectedSpecGroups) : 0;
              const totalPrice = (selectedProduct?.price || 0) + currentSpecPrice;
              return (
                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition"
                >
                  加入购物车 - ¥{totalPrice * itemQuantity}
                  {currentSpecPrice > 0 && <span className="text-xs ml-1 opacity-80">(含规格+¥{currentSpecPrice})</span>}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* 购物车弹窗 */}
      {showCart && user && !isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowCart(false)}>
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">购物车</h3>
              <button onClick={() => setShowCart(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">购物车是空的</p>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 py-4 border-b">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      {item.selectedSpecGroups && Object.keys(item.selectedSpecGroups).length > 0 && (
                        <p className="text-sm text-gray-500">
                          {Object.entries(item.selectedSpecGroups).map(([groupName, options]) => 
                            options.map(opt => `${groupName}: ${opt}`).join(', ')
                          ).join(' | ')}
                        </p>
                      )}
                      {item.selectedSpecs && item.selectedSpecs.length > 0 && (
                        <p className="text-sm text-gray-500">{item.selectedSpecs.join(', ')}</p>
                      )}
                      <p className="text-purple-600 font-bold">
                        ¥{item.price}
                        {item.specPrice && item.specPrice > 0 && (
                          <span className="text-xs text-orange-500 ml-1">(+¥{item.specPrice})</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-red-500 text-sm"
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">合计</span>
                  <span className="text-2xl font-bold text-purple-600">¥{cartTotal}</span>
                </div>
                <button
                  onClick={() => {
                    // 重置联系方式
                    setEmailUsable(true);
                    setContactPhone('');
                    setContactWechat('');
                    setContactQQ('');
                    setContactOther('');
                    setShowOrderConfirm(true);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition"
                >
                  提交订单
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 订单确认弹窗 */}
      {showOrderConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOrderConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">确认订单</h3>
              <button onClick={() => setShowOrderConfirm(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  请确保您的邮箱 <strong>{user?.email}</strong> 可正常使用。如果不可用，请填写以下联系方式（必填至少一项），以便后续联系您。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emailUsable"
                  checked={emailUsable}
                  onChange={(e) => setEmailUsable(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="emailUsable" className="text-gray-700">我的邮箱可以正常使用</label>
              </div>

              {!emailUsable && (
                <div className="space-y-3">
                  <p className="text-red-600 text-sm font-medium">请至少填写一项联系方式（必填）：</p>
                  <input
                    type="tel"
                    placeholder="电话"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="微信"
                    value={contactWechat}
                    onChange={(e) => setContactWechat(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="number"
                    placeholder="QQ号"
                    value={contactQQ}
                    onChange={(e) => setContactQQ(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="其他联系方式"
                    value={contactOther}
                    onChange={(e) => setContactOther(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="pt-4">
                <p className="text-gray-600 text-sm mb-2">订单金额：<span className="text-2xl font-bold text-purple-600">¥{cartTotal}</span></p>
                <button
                  onClick={submitOrderWithContact}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition"
                >
                  确认提交
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">订单提交成功！</h3>
            <p className="text-gray-600">订单金额：¥{orderTotal}</p>
            <p className="text-gray-500 text-sm mt-2">代购小助手会尽快处理您的订单</p>
          </div>
        </div>
      )}

      {/* 底部版权 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 text-center text-sm text-gray-500 flex justify-center items-center gap-4">
        © ZC代购·预约系统
        <button onClick={() => setShowUserAgreement(true)} className="text-purple-600 hover:underline">
          用户协议
        </button>
      </div>

      {/* 站内通知弹窗 */}
      {showInbox && user && !isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInbox(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">站内通知</h3>
              <button onClick={() => setShowInbox(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {userNotifications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暂无通知</p>
              ) : (
                userNotifications.map((notif) => (
                  <div key={notif.id} className={`p-4 rounded-lg border ${
                    notif.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    notif.status === 'completed' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">
                          {notif.status === 'rejected' ? '❌ 订单被拒绝' :
                           notif.status === 'completed' ? '✅ 订单已完成' :
                           notif.status === 'received' ? '📦 订单已接单' :
                           notif.status === 'in_progress' ? '🔄 订单进行中' : '通知'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          订单号: #{notif.order_id} · {new Date(notif.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      {notif.html_content && isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const blob = new Blob([notif.html_content], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `通知_${notif.order_id}_${notif.status}.html`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="text-purple-600 hover:text-purple-800 text-sm"
                        >
                          下载
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 用户协议弹窗 */}
      {showUserAgreement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUserAgreement(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">用户协议</h3>
              <button onClick={() => setShowUserAgreement(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="prose max-w-none text-gray-600 text-sm whitespace-pre-wrap">
              {(localStorage.getItem('userAgreement') || userAgreementContent)}
              <p className="text-gray-500 text-xs mt-4">使用本系统即表示您同意以上服务条款</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
