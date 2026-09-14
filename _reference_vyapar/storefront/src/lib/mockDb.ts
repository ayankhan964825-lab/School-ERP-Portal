import fs from 'node:fs/promises';
import path from 'node:path';
import catalogData from '../../../catalog_data.json';


const DB_DIR = path.resolve(process.cwd(), '.data');
const ORDERS_FILE = path.join(DB_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');
const PRODUCTS_FILE = path.join(DB_DIR, 'products.json');
const COUPONS_FILE = path.join(DB_DIR, 'coupons.json');
const BLOG_FILE = path.join(DB_DIR, 'blog.json');
const CUSTOMERS_FILE = path.join(DB_DIR, 'customers.json');
const ADDRESSES_FILE = path.join(DB_DIR, 'addresses.json');
const NOTIFICATIONS_FILE = path.join(DB_DIR, 'notifications.json');
const STAFF_FILE = path.join(DB_DIR, 'staff.json');
const AFFILIATES_FILE = path.join(DB_DIR, 'affiliates.json');
const AFFILIATE_OFFERS_FILE = path.join(DB_DIR, 'affiliate_offers.json');
const PAYOUTS_FILE = path.join(DB_DIR, 'payouts.json');
const MASTER_ORDERS_FILE = path.join(DB_DIR, 'master_orders.json');
async function ensureFile(filePath: string, defaultContent: string = '[]') {
  try { await fs.access(filePath); }
  catch { await fs.writeFile(filePath, defaultContent, 'utf-8'); }
}


export async function ensureDb() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    await ensureFile(ORDERS_FILE, '[]');
    await ensureFile(SETTINGS_FILE, '{}');
    await ensureFile(PRODUCTS_FILE, '[]');
    await ensureFile(COUPONS_FILE, '[]');
    await ensureFile(BLOG_FILE, '[]');
    await ensureFile(CUSTOMERS_FILE, '[]');
    await ensureFile(ADDRESSES_FILE, '[]');
    await ensureFile(NOTIFICATIONS_FILE, '[]');
    await ensureFile(STAFF_FILE, '[]');
    await ensureFile(AFFILIATES_FILE, '[]');
    await ensureFile(AFFILIATE_OFFERS_FILE, '[]');
    await ensureFile(PAYOUTS_FILE, '[]');
    await ensureFile(MASTER_ORDERS_FILE, '[]');
  } catch (err) {
    console.error('Error ensuring mock DB:', err);
  }
}

async function readJson(file: string): Promise<any> {
  await ensureDb();
  const data = await fs.readFile(file, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeJson(file: string, data: any) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ---- ORDERS ----
export async function saveOrder(order: any) {
  const orders = await readJson(ORDERS_FILE);
  const newOrder = {
    ...order,
    createdAt: new Date().toISOString(),
    status: order.status || 'placed'
  };
  orders.push(newOrder);
  await writeJson(ORDERS_FILE, orders);

  // Also create a notification
  await addNotification('order', newOrder.orderId, `New order #${newOrder.orderId} from ${order.customer?.name || 'Guest'} — ₹${order.amount}`);

  if (order.affiliate_id && order.affiliate_commission > 0) {
    const affiliates = await getAffiliates();
    const affIndex = affiliates.findIndex((a: any) => a.id === order.affiliate_id);
    if (affIndex !== -1) {
      affiliates[affIndex].total_earnings = (affiliates[affIndex].total_earnings || 0) + order.affiliate_commission;
      await writeJson(AFFILIATES_FILE, affiliates);
    }
  }

  return newOrder;
}

export async function saveMarketplaceOrder(masterOrder: any, subOrders: any[]) {
  await ensureDb();
  const masterOrders = await readJson(MASTER_ORDERS_FILE);
  const newMasterOrder = {
    ...masterOrder,
    id: masterOrder.displayId || `VYP-OD${Date.now()}`,
    created_at: new Date().toISOString()
  };
  masterOrders.push(newMasterOrder);
  await writeJson(MASTER_ORDERS_FILE, masterOrders);
  
  const orders = await readJson(ORDERS_FILE);
  for (const sub of subOrders) {
    const newSubOrder = {
      ...sub,
      orderId: sub.orderId || `OD${Date.now()}`,
      status: 'placed',
      master_order_id: newMasterOrder.id,
      created_at: new Date().toISOString()
    };
    orders.push(newSubOrder);
    await addNotification('order', newSubOrder.orderId, `New marketplace order #${newSubOrder.orderId} — ₹${sub.amount}`, sub.storeId);
  }
  await writeJson(ORDERS_FILE, orders);
  
  return { success: true, masterId: newMasterOrder.id, orderId: newMasterOrder.id };
}

export async function getOrders() {
  return readJson(ORDERS_FILE);
}

export async function updateOrderStatus(orderId: string, status: string) {
  const orders = await readJson(ORDERS_FILE);
  const idx = orders.findIndex((o: any) => o.orderId === orderId);
  if (idx > -1) {
    orders[idx].status = status;
    await writeJson(ORDERS_FILE, orders);
    return orders[idx];
  }
  return null;
}

// ---- SETTINGS ----
export async function getSettings() {
  await ensureDb();
  const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
  return JSON.parse(data || '{}');
}

export async function saveSettings(newSettings: any) {
  const settings = await getSettings();
  const updated = { ...settings, ...newSettings };
  await writeJson(SETTINGS_FILE, updated);
  return updated;
}

// ---- COUPONS ----
export async function getCoupons() {
  return readJson(COUPONS_FILE);
}

export async function saveCoupon(coupon: any) {
  const coupons = await readJson(COUPONS_FILE);
  const newCoupon = {
    id: 'CPN-' + Date.now(),
    ...coupon,
    used_count: 0,
    is_active: true,
    is_public: coupon.is_public !== undefined ? coupon.is_public : true,
    created_at: new Date().toISOString()
  };
  coupons.push(newCoupon);
  await writeJson(COUPONS_FILE, coupons);
  return newCoupon;
}

export async function updateCoupon(id: string, updates: any) {
  const coupons = await readJson(COUPONS_FILE);
  const idx = coupons.findIndex((c: any) => c.id === id);
  if (idx > -1) {
    coupons[idx] = { ...coupons[idx], ...updates };
    await writeJson(COUPONS_FILE, coupons);
    return coupons[idx];
  }
  return null;
}

export async function deleteCoupon(id: string) {
  const coupons = await readJson(COUPONS_FILE);
  const filtered = coupons.filter((c: any) => c.id !== id);
  await writeJson(COUPONS_FILE, filtered);
}

export async function validateCoupon(codes: string | string[], orderTotal: number, customerPhone?: string, customerEmail?: string) {
  const codeArray = Array.isArray(codes) ? codes : (codes ? [codes] : []);
  if (codeArray.length === 0) return { valid: true, discount: 0, coupons: [] };

  // For simplicity in mockDb, we'll only validate the first code
  const code = codeArray[0];

  const coupons = await readJson(COUPONS_FILE);
  let coupon = coupons.find((c: any) => c.code?.toUpperCase() === code.toUpperCase() && c.is_active);
  
  if (coupon && coupon.affiliate_id) {
    const affiliates = await getAffiliates();
    const aff = affiliates.find((a: any) => a.id === coupon.affiliate_id);
    if (aff) {
      if (
        (customerEmail && aff.email && customerEmail.toLowerCase() === aff.email.toLowerCase()) ||
        (customerPhone && aff.phone && customerPhone === aff.phone)
      ) {
        return { valid: false, error: 'You cannot use your own referral code.' };
      }

      coupon._is_affiliate = true;
      coupon._affiliate_id = aff.id;

      const offers = await getAffiliateOffers();
      const activeOffer = offers.find((o: any) => o.is_active);
      if (activeOffer) {
        coupon._commission_percentage = activeOffer.commission_percentage;
        coupon.discount_value = activeOffer.customer_discount_percentage;
        coupon.discount_type = 'percentage';
      } else {
        coupon._commission_percentage = 10;
      }
    }
  }

  if (!coupon) return { valid: false, error: 'Invalid coupon code' };
  
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return { valid: false, error: 'Coupon is not yet active' };
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return { valid: false, error: 'Coupon has expired' };
  if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) return { valid: false, error: `Minimum order ₹${coupon.min_order_amount} required` };
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return { valid: false, error: 'Coupon usage limit reached' };

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((orderTotal * coupon.discount_value) / 100);
    if (coupon.max_discount_amount) discount = Math.min(discount, coupon.max_discount_amount);
  } else {
    discount = coupon.discount_value;
  }

  return { valid: true, discount, coupon, coupons: [coupon] };
}

// ---- BLOG POSTS ----
export async function getBlogPosts() {
  return readJson(BLOG_FILE);
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await readJson(BLOG_FILE);
  return posts.find((p: any) => p.slug === slug) || null;
}

export async function saveBlogPost(post: any) {
  const posts = await readJson(BLOG_FILE);
  const newPost = {
    id: 'BLOG-' + Date.now(),
    ...post,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  posts.push(newPost);
  await writeJson(BLOG_FILE, posts);
  return newPost;
}

export async function updateBlogPost(id: string, updates: any) {
  const posts = await readJson(BLOG_FILE);
  const idx = posts.findIndex((p: any) => p.id === id);
  if (idx > -1) {
    posts[idx] = { ...posts[idx], ...updates, updated_at: new Date().toISOString() };
    await writeJson(BLOG_FILE, posts);
    return posts[idx];
  }
  return null;
}

// ---- CUSTOMERS ----
export async function getCustomers() {
  return readJson(CUSTOMERS_FILE);
}

export async function getCustomerByPhone(phone: string) {
  const customers = await readJson(CUSTOMERS_FILE);
  return customers.find((c: any) => c.phone === phone) || null;
}

export async function saveCustomer(customer: any) {
  const customers = await readJson(CUSTOMERS_FILE);
  const { new_phone, new_email, ...updateData } = customer;
  if (new_phone) updateData.phone = new_phone;
  if (new_email) updateData.email = new_email;

  const existingIndex = customers.findIndex((c: any) => 
    (updateData.id && c.id === updateData.id) || 
    (updateData.email && c.email === updateData.email) ||
    (updateData.phone && c.phone === updateData.phone)
  );
  
  if (existingIndex > -1) {
    customers[existingIndex] = { ...customers[existingIndex], ...updateData, updated_at: new Date().toISOString() };
    await writeJson(CUSTOMERS_FILE, customers);
    return customers[existingIndex];
  }
  
  const newCustomer = {
    id: 'CUST-' + Date.now(),
    ...customer,
    total_orders: 0,
    created_at: new Date().toISOString()
  };
  customers.push(newCustomer);
  await writeJson(CUSTOMERS_FILE, customers);
  return newCustomer;
}

// ---- SAVED ADDRESSES ----
export async function getAddressesByPhone(phone: string) {
  const addresses = await readJson(ADDRESSES_FILE);
  return addresses.filter((a: any) => a.phone === phone);
}

export async function saveAddress(address: any) {
  const addresses = await readJson(ADDRESSES_FILE);
  const newAddr = {
    id: 'ADDR-' + Date.now(),
    ...address,
    created_at: new Date().toISOString()
  };
  addresses.push(newAddr);
  await writeJson(ADDRESSES_FILE, addresses);
  return newAddr;
}

export async function deleteAddress(id: string) {
  const addresses = await readJson(ADDRESSES_FILE);
  const filtered = addresses.filter((a: any) => a.id !== id);
  await writeJson(ADDRESSES_FILE, filtered);
  return true;
}

// ---- NOTIFICATIONS ----
export async function getNotifications() {
  return readJson(NOTIFICATIONS_FILE);
}

export async function addNotification(type: string, referenceId: string, message: string, storeId?: string) {
  const notifications = await readJson(NOTIFICATIONS_FILE);
  const newNotif = {
    id: 'NOTIF-' + Date.now(),
    type,
    reference_id: referenceId,
    message,
    is_read: false,
    store_id: storeId,
    created_at: new Date().toISOString()
  };
  notifications.push(newNotif);
  await writeJson(NOTIFICATIONS_FILE, notifications);
  return newNotif;
}

// ---- HERO SLIDES ----
const HERO_SLIDES_FILE = path.join(DB_DIR, 'hero_slides.json');

export async function getHeroSlides() {
  await ensureFile(HERO_SLIDES_FILE, '[]');
  return readJson(HERO_SLIDES_FILE);
}

export async function saveHeroSlide(slide: any) {
  const slides = await readJson(HERO_SLIDES_FILE);
  const newSlide = {
    id: 'SLIDE-' + Date.now(),
    ...slide,
    created_at: new Date().toISOString()
  };
  slides.push(newSlide);
  await writeJson(HERO_SLIDES_FILE, slides);
  return newSlide;
}

export async function updateHeroSlide(id: string, updates: any) {
  const slides = await readJson(HERO_SLIDES_FILE);
  const idx = slides.findIndex((s: any) => s.id === id);
  if (idx > -1) {
    slides[idx] = { ...slides[idx], ...updates };
    await writeJson(HERO_SLIDES_FILE, slides);
    return slides[idx];
  }
  return null;
}

export async function deleteHeroSlide(id: string) {
  const slides = await readJson(HERO_SLIDES_FILE);
  const filtered = slides.filter((s: any) => s.id !== id);
  await writeJson(HERO_SLIDES_FILE, filtered);
  return true;
}

export async function markNotificationRead(id: string) {
  const notifications = await readJson(NOTIFICATIONS_FILE);
  const idx = notifications.findIndex((n: any) => n.id === id);
  if (idx > -1) {
    notifications[idx].is_read = true;
    await writeJson(NOTIFICATIONS_FILE, notifications);
    return notifications[idx];
  }
  return null;
}

export async function markAllNotificationsRead() {
  const notifications = await readJson(NOTIFICATIONS_FILE);
  let updated = false;
  notifications.forEach((n: any) => {
    if (!n.is_read) {
      n.is_read = true;
      updated = true;
    }
  });
  if (updated) {
    await writeJson(NOTIFICATIONS_FILE, notifications);
  }
  return true;
}

export async function clearAllNotifications() {
  await writeJson(NOTIFICATIONS_FILE, []);
  return true;
}


export async function getProducts() {
  const products = await readJson(PRODUCTS_FILE);
  if (!products || products.length === 0) {
    return catalogData;
  }
  return products;
}

export async function updateProductVariants(productId: string, variants: any[]) {
  const products = await readJson(PRODUCTS_FILE);
  let updated = false;
  if (!products || products.length === 0) {
    // If mock db is empty, copy from catalog
    const allProducts = JSON.parse(JSON.stringify(catalogData));
    const idx = allProducts.findIndex((p: any) => p.id === productId);
    if (idx > -1) {
      allProducts[idx].variants = variants;
      await writeJson(PRODUCTS_FILE, allProducts);
      updated = true;
    }
  } else {
    const idx = products.findIndex((p: any) => p.id === productId);
    if (idx > -1) {
      products[idx].variants = variants;
      await writeJson(PRODUCTS_FILE, products);
      updated = true;
    }
  }
  return updated;
}

export async function updateProductB2BVariants(productId: string, b2b_variants: any[]) {
  const products = await readJson(PRODUCTS_FILE);
  let updated = false;
  if (!products || products.length === 0) {
    const allProducts = JSON.parse(JSON.stringify(catalogData));
    const idx = allProducts.findIndex((p: any) => p.id === productId);
    if (idx > -1) {
      allProducts[idx].b2b_variants = b2b_variants;
      await writeJson(PRODUCTS_FILE, allProducts);
      updated = true;
    }
  } else {
    const idx = products.findIndex((p: any) => p.id === productId);
    if (idx > -1) {
      products[idx].b2b_variants = b2b_variants;
      await writeJson(PRODUCTS_FILE, products);
      updated = true;
    }
  }
  return updated;
}

// ---- CATEGORIES ----
const CATEGORIES_FILE = path.join(DB_DIR, 'categories.json');

export async function getCategories() {
  await ensureFile(CATEGORIES_FILE, '[]');
  const categories = await readJson(CATEGORIES_FILE);
  if (!categories || categories.length === 0) {
    // Derive from catalog
    const allCats = (catalogData as any[]).map(p => p.category).filter(Boolean);
    const unique = [...new Set(allCats)];
    const seeded = unique.map(name => ({
      id: 'CAT-' + name.toLowerCase().replace(/\s+/g, '-'),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description: '',
      product_count: (catalogData as any[]).filter(p => p.category === name).length,
      created_at: new Date().toISOString()
    }));
    await writeJson(CATEGORIES_FILE, seeded);
    return seeded;
  }
  return categories;
}

export async function saveCategory(category: any) {
  await ensureFile(CATEGORIES_FILE, '[]');
  const categories = await readJson(CATEGORIES_FILE);
  const newCat = {
    id: 'CAT-' + Date.now(),
    ...category,
    created_at: new Date().toISOString()
  };
  categories.push(newCat);
  await writeJson(CATEGORIES_FILE, categories);
  return newCat;
}

export async function updateCategory(id: string, updates: any) {
  await ensureFile(CATEGORIES_FILE, '[]');
  const categories = await readJson(CATEGORIES_FILE);
  const idx = categories.findIndex((c: any) => c.id === id);
  if (idx > -1) {
    categories[idx] = { ...categories[idx], ...updates };
    await writeJson(CATEGORIES_FILE, categories);
    return categories[idx];
  }
  return null;
}

export async function deleteCategory(id: string) {
  await ensureFile(CATEGORIES_FILE, '[]');
  const categories = await readJson(CATEGORIES_FILE);
  const filtered = categories.filter((c: any) => c.id !== id);
  await writeJson(CATEGORIES_FILE, filtered);
  return true;
}

export async function assignProductsToCategory(categorySlug: string, productSlugs: string[]) {
  // In mockDb mode, this is a no-op since products come from catalog_data.json
  return true;
}


const FLASH_SALES_FILE = path.join(DB_DIR, 'flash_sales.json');

export async function getFlashSales() {
  await ensureFile(FLASH_SALES_FILE, '[]');
  return readJson(FLASH_SALES_FILE);
}

export async function saveFlashSale(sale: any) {
  await ensureFile(FLASH_SALES_FILE, '[]');
  const sales = await readJson(FLASH_SALES_FILE);
  const newSale = {
    id: 'FS-' + Date.now(),
    ...sale,
    created_at: new Date().toISOString()
  };
  sales.push(newSale);
  await writeJson(FLASH_SALES_FILE, sales);
  return newSale;
}

export async function updateFlashSale(id: string, updates: any) {
  await ensureFile(FLASH_SALES_FILE, '[]');
  const sales = await readJson(FLASH_SALES_FILE);
  const idx = sales.findIndex((s: any) => s.id === id);
  if (idx > -1) {
    sales[idx] = { ...sales[idx], ...updates };
    await writeJson(FLASH_SALES_FILE, sales);
    return sales[idx];
  }
  return null;
}

export async function deleteFlashSale(id: string) {
  await ensureFile(FLASH_SALES_FILE, '[]');
  const sales = await readJson(FLASH_SALES_FILE);
  const filtered = sales.filter((s: any) => s.id !== id);
  await writeJson(FLASH_SALES_FILE, filtered);
  return true;
}

// ---- STAFF ACCOUNTS ----

export async function getStaff() {
  await ensureFile(STAFF_FILE, '[]');
  return readJson(STAFF_FILE);
}

export async function saveStaffMember(member: any) {
  await ensureFile(STAFF_FILE, '[]');
  const staff = await readJson(STAFF_FILE);
  const newMember = {
    id: 'STAFF-' + Date.now(),
    ...member,
    is_active: true,
    created_at: new Date().toISOString()
  };
  staff.push(newMember);
  await writeJson(STAFF_FILE, staff);
  return newMember;
}

export async function updateStaffMember(id: string, updates: any) {
  await ensureFile(STAFF_FILE, '[]');
  const staff = await readJson(STAFF_FILE);
  const idx = staff.findIndex((s: any) => s.id === id);
  if (idx > -1) {
    staff[idx] = { ...staff[idx], ...updates };
    await writeJson(STAFF_FILE, staff);
    return staff[idx];
  }
  return null;
}

export async function deleteStaffMember(id: string) {
  await ensureFile(STAFF_FILE, '[]');
  const staff = await readJson(STAFF_FILE);
  const filtered = staff.filter((s: any) => s.id !== id);
  await writeJson(STAFF_FILE, filtered);
  return true;
}

// ---- SHIPPING ZONES ----
const SHIPPING_FILE = path.join(DB_DIR, 'shipping_zones.json');

export async function getShippingZones() {
  await ensureFile(SHIPPING_FILE, '[]');
  return readJson(SHIPPING_FILE);
}

export async function saveShippingZone(zone: any) {
  await ensureFile(SHIPPING_FILE, '[]');
  const zones = await readJson(SHIPPING_FILE);
  const newZone = {
    id: 'SHIP-' + Date.now(),
    ...zone,
    created_at: new Date().toISOString()
  };
  zones.push(newZone);
  await writeJson(SHIPPING_FILE, zones);
  return newZone;
}

export async function updateShippingZone(id: string, updates: any) {
  await ensureFile(SHIPPING_FILE, '[]');
  const zones = await readJson(SHIPPING_FILE);
  const idx = zones.findIndex((z: any) => z.id === id);
  if (idx > -1) {
    zones[idx] = { ...zones[idx], ...updates };
    await writeJson(SHIPPING_FILE, zones);
    return zones[idx];
  }
  return null;
}

export async function deleteShippingZone(id: string) {
  await ensureFile(SHIPPING_FILE, '[]');
  const zones = await readJson(SHIPPING_FILE);
  const filtered = zones.filter((z: any) => z.id !== id);
  await writeJson(SHIPPING_FILE, filtered);
  return true;
}

// ---- REVIEWS ----
const REVIEWS_FILE = path.join(DB_DIR, 'reviews.json');

export async function getReviews() {
  await ensureFile(REVIEWS_FILE, '[]');
  return readJson(REVIEWS_FILE);
}

export async function saveReview(review: any) {
  await ensureFile(REVIEWS_FILE, '[]');
  const reviews = await readJson(REVIEWS_FILE);
  const newReview = {
    id: 'REV-' + Date.now(),
    ...review,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  reviews.push(newReview);
  await writeJson(REVIEWS_FILE, reviews);
  return newReview;
}

export async function updateReview(id: string, updates: any) {
  await ensureFile(REVIEWS_FILE, '[]');
  const reviews = await readJson(REVIEWS_FILE);
  const idx = reviews.findIndex((r: any) => r.id === id);
  if (idx > -1) {
    reviews[idx] = { ...reviews[idx], ...updates };
    await writeJson(REVIEWS_FILE, reviews);
    return reviews[idx];
  }
  return null;
}

// ---- FEEDBACK & INQUIRIES ----
const FEEDBACK_FILE = path.join(DB_DIR, 'feedback.json');
const BULK_INQUIRIES_FILE = path.join(DB_DIR, 'bulk_inquiries.json');

export async function getFeedback() {
  await ensureFile(FEEDBACK_FILE, '[]');
  return readJson(FEEDBACK_FILE);
}

export async function saveFeedback(feedback: any) {
  await ensureFile(FEEDBACK_FILE, '[]');
  const feedbacks = await readJson(FEEDBACK_FILE);
  const newFeedback = {
    id: 'FB-' + Date.now(),
    ...feedback,
    status: feedback.status || 'open',
    created_at: new Date().toISOString()
  };
  feedbacks.push(newFeedback);
  await writeJson(FEEDBACK_FILE, feedbacks);
  return newFeedback;
}

export async function updateFeedback(id: string, updates: any) {
  await ensureFile(FEEDBACK_FILE, '[]');
  const feedbacks = await readJson(FEEDBACK_FILE);
  const idx = feedbacks.findIndex((f: any) => f.id === id);
  if (idx > -1) {
    feedbacks[idx] = { ...feedbacks[idx], ...updates };
    await writeJson(FEEDBACK_FILE, feedbacks);
    return feedbacks[idx];
  }
  return null;
}

export async function getBulkInquiries() {
  await ensureFile(BULK_INQUIRIES_FILE, '[]');
  return readJson(BULK_INQUIRIES_FILE);
}

export async function saveBulkInquiry(inquiry: any) {
  await ensureFile(BULK_INQUIRIES_FILE, '[]');
  const inquiries = await readJson(BULK_INQUIRIES_FILE);
  const newInq = {
    id: 'BULK-' + Date.now(),
    ...inquiry,
    status: 'new',
    created_at: new Date().toISOString()
  };
  inquiries.push(newInq);
  await writeJson(BULK_INQUIRIES_FILE, inquiries);
  return newInq;
}

export async function updateBulkInquiry(id: string, updates: any) {
  await ensureFile(BULK_INQUIRIES_FILE, '[]');
  const inquiries = await readJson(BULK_INQUIRIES_FILE);
  const idx = inquiries.findIndex((i: any) => i.id === id);
  if (idx > -1) {
    inquiries[idx] = { ...inquiries[idx], ...updates };
    await writeJson(BULK_INQUIRIES_FILE, inquiries);
    return inquiries[idx];
  }
  return null;
}

// ---- AFFILIATES ----
export async function getAffiliates() {
  await ensureFile(AFFILIATES_FILE, '[]');
  return readJson(AFFILIATES_FILE);
}

export async function saveAffiliate(affiliate: any) {
  await ensureFile(AFFILIATES_FILE, '[]');
  const affiliates = await readJson(AFFILIATES_FILE);
  const newAff = { id: 'AFF-' + Date.now(), ...affiliate, created_at: new Date().toISOString() };
  affiliates.push(newAff);
  await writeJson(AFFILIATES_FILE, affiliates);
  return newAff;
}

export async function updateAffiliate(id: string, updates: any) {
  await ensureFile(AFFILIATES_FILE, '[]');
  const affiliates = await readJson(AFFILIATES_FILE);
  const idx = affiliates.findIndex((a: any) => a.id === id);
  if (idx > -1) {
    affiliates[idx] = { ...affiliates[idx], ...updates };
    await writeJson(AFFILIATES_FILE, affiliates);
    return affiliates[idx];
  }
  return null;
}

export async function deleteAffiliate(id: string) {
  await ensureFile(AFFILIATES_FILE, '[]');
  const affiliates = await readJson(AFFILIATES_FILE);
  const filtered = affiliates.filter((a: any) => a.id !== id);
  await writeJson(AFFILIATES_FILE, filtered);
  return true;
}

// ---- AFFILIATE OFFERS ----
export async function getAffiliateOffers() {
  await ensureFile(AFFILIATE_OFFERS_FILE, '[]');
  const offers = await readJson(AFFILIATE_OFFERS_FILE);
  if (offers.length === 0) {
    offers.push({
      id: 'DEFAULT-OFFER-1',
      title: 'Standard Influencer Program',
      description: 'Default 10% commission & 10% customer discount.',
      commission_percentage: 10,
      customer_discount_percentage: 10,
      is_active: true,
      created_at: new Date().toISOString()
    });
    await writeJson(AFFILIATE_OFFERS_FILE, offers);
  }
  return offers;
}

export async function deductAffiliateEarnings(affiliate_id: string, amount: number) {
  const affiliates = await getAffiliates();
  const affIndex = affiliates.findIndex((a: any) => a.id === affiliate_id);
  if (affIndex !== -1) {
    affiliates[affIndex].total_earnings = Math.max(0, (affiliates[affIndex].total_earnings || 0) - amount);
    await writeJson(AFFILIATES_FILE, affiliates);
  }
}

export async function saveAffiliateOffer(offer: any) {
  await ensureFile(AFFILIATE_OFFERS_FILE, '[]');
  const offers = await readJson(AFFILIATE_OFFERS_FILE);
  const newOffer = { id: 'OFFER-' + Date.now(), ...offer, created_at: new Date().toISOString() };
  offers.push(newOffer);
  await writeJson(AFFILIATE_OFFERS_FILE, offers);
  return newOffer;
}

export async function updateAffiliateOffer(id: string, updates: any) {
  await ensureFile(AFFILIATE_OFFERS_FILE, '[]');
  const offers = await readJson(AFFILIATE_OFFERS_FILE);
  const idx = offers.findIndex((o: any) => o.id === id);
  if (idx > -1) {
    offers[idx] = { ...offers[idx], ...updates };
    await writeJson(AFFILIATE_OFFERS_FILE, offers);
    return offers[idx];
  }
  return null;
}

export async function deleteAffiliateOffer(id: string) {
  await ensureFile(AFFILIATE_OFFERS_FILE, '[]');
  const offers = await readJson(AFFILIATE_OFFERS_FILE);
  const filtered = offers.filter((o: any) => o.id !== id);
  await writeJson(AFFILIATE_OFFERS_FILE, filtered);
  return true;
}

// ---- PAYOUTS ----
export async function getPayouts() {
  await ensureFile(PAYOUTS_FILE, '[]');
  return readJson(PAYOUTS_FILE);
}

export async function savePayout(payout: any) {
  await ensureFile(PAYOUTS_FILE, '[]');
  const payouts = await readJson(PAYOUTS_FILE);
  const newPayout = { id: 'PAY-' + Date.now(), ...payout, created_at: new Date().toISOString() };
  payouts.push(newPayout);
  await writeJson(PAYOUTS_FILE, payouts);
  return newPayout;
}

