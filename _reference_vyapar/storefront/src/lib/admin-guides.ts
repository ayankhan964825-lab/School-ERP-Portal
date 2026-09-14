export const adminGuides: Record<string, { en: string; hi: string; titleEn: string; titleHi: string }> = {
  '/admin': {
    titleEn: 'Dashboard Overview',
    titleHi: 'Dashboard ki Jankari',
    en: `
      <ul>
        <li><strong>Quick Stats:</strong> View total revenue, pending orders, and total customers at a glance.</li>
        <li><strong>Recent Orders:</strong> A quick summary of the latest orders that need your attention.</li>
        <li><strong>AI Capabilities:</strong> The dashboard is your high-level view. You can ask AI to "Summarize my sales for today" or "Analyze the recent drop in traffic".</li>
      </ul>
    `,
    hi: `
      <ul>
        <li><strong>Quick Stats:</strong> Total revenue, pending orders, aur total customers ko ek jhalak mein dekhein.</li>
        <li><strong>Recent Orders:</strong> Naye orders jo aaye hain, unki list aapko yahan milegi.</li>
        <li><strong>AI Capabilities:</strong> Aap AI se bol sakte hain "Aaj ki sales ka summary do" ya "Pichle week se sales kyun kam hui, analyze karo".</li>
      </ul>
    `
  },
  '/admin/reports': {
    titleEn: 'Reports & Analytics',
    titleHi: 'Reports aur Analytics',
    en: `
      <ul>
        <li><strong>Sales Data:</strong> Filter sales by date range, category, or product.</li>
        <li><strong>Exporting:</strong> You can export reports in CSV/Excel formats for external accounting.</li>
        <li><strong>AI Capabilities:</strong> You can use AI prompts like "Generate a report for the best selling products last month" or "Compare Q1 and Q2 revenue".</li>
      </ul>
    `,
    hi: `
      <ul>
        <li><strong>Sales Data:</strong> Aap date range, category ya product ke hisaab se sales filter kar sakte hain.</li>
        <li><strong>Exporting:</strong> In reports ko aap CSV/Excel mein download karke apne CA/Accountant ko bhej sakte hain.</li>
        <li><strong>AI Capabilities:</strong> AI ko command dein "Pichle mahine ke best selling products ka report banao" ya "Q1 aur Q2 ki revenue compare karo".</li>
      </ul>
    `
  },
  '/admin/orders': {
    titleEn: 'Order Management',
    titleHi: 'Order Management',
    en: `
      <ul>
        <li><strong>Order Status:</strong> Track and update orders (Pending, Processing, Shipped, Delivered).</li>
        <li><strong>Details:</strong> Click on any order to see customer details, items purchased, and shipping address.</li>
        <li><strong>Fulfillment:</strong> Generate invoices and shipping labels directly from the order page.</li>
        <li><strong>AI Capabilities:</strong> Ask AI to "Find order number #1234" or "Filter all unfulfilled orders from yesterday".</li>
      </ul>
    `,
    hi: `
      <ul>
        <li><strong>Order Status:</strong> Orders ko track karein aur unka status update karein (Pending, Processing, Shipped, Delivered).</li>
        <li><strong>Details:</strong> Kisi bhi order par click karke customer ki details aur unhone kya kharida hai, ye sab dekh sakte hain.</li>
        <li><strong>Fulfillment:</strong> Order page se hi Invoice aur Shipping Label generate kar sakte hain.</li>
        <li><strong>AI Capabilities:</strong> AI se kahen "Order number #1234 dhoondo" ya "Kal ke saare unfulfilled orders dikhao".</li>
      </ul>
    `
  },
  '/admin/batch-invoice': {
    titleEn: 'Batch Print Invoices',
    titleHi: 'Ek Sath Invoices Print Karein',
    en: `
      <ul>
        <li><strong>Bulk Selection:</strong> Select multiple pending orders at once.</li>
        <li><strong>Print Labels/Invoices:</strong> Generate a single PDF containing all selected invoices and shipping labels to save time.</li>
        <li><strong>Mark as Shipped:</strong> Optionally mark all printed orders as shipped simultaneously.</li>
        <li><strong>AI Capabilities:</strong> Type "Print invoices for all pending orders today" to let AI handle the selection automatically.</li>
      </ul>
    `,
    hi: `
      <ul>
        <li><strong>Bulk Selection:</strong> Ek sath multiple pending orders ko select karein.</li>
        <li><strong>Print Labels/Invoices:</strong> Sabhi selected orders ka ek single PDF generate karein jisme Invoice aur Shipping labels honge, isse time bachega.</li>
        <li><strong>Mark as Shipped:</strong> Print karne ke baad ek sath sabko 'Shipped' mark karne ka option bhi hai.</li>
        <li><strong>AI Capabilities:</strong> AI ko bolen "Aaj ke saare pending orders ka invoice print karo" aur wo automatically select karke PDF bana dega.</li>
      </ul>
    `
  },
  '/admin/products': {
    titleEn: 'Product Management',
    titleHi: 'Products Manage Karein',
    en: `
      <ul>
        <li><strong>Add/Edit:</strong> Create new products, update prices, MRP, and manage variants (e.g. 100g, 250g).</li>
        <li><strong>Inventory:</strong> Update stock levels manually or set them to 'in-stock/out-of-stock'.</li>
        <li><strong>Media:</strong> Upload high-quality product images. The first image acts as the thumbnail.</li>
        <li><strong>AI Capabilities:</strong> Use AI to "Write a SEO friendly description for Turmeric Powder" or "Add a 250g variant to all spice products".</li>
      </ul>
    `,
    hi: `
      <ul>
        <li><strong>Add/Edit:</strong> Naye products add karein, price/MRP update karein aur unke weights (variants jaise 100g, 250g) manage karein.</li>
        <li><strong>Inventory:</strong> Stock update karein ya directly 'in-stock/out-of-stock' mark karein.</li>
        <li><strong>Media:</strong> Product ki achhi photos upload karein. Pehli photo thumbnail banegi.</li>
        <li><strong>AI Capabilities:</strong> AI se bolen "Turmeric Powder ke liye SEO friendly description likho" ya "Saare masalo mein 250g ka variant add kar do".</li>
      </ul>
    `
  },
  '/admin/flash-sales': {
    titleEn: 'Flash Sales Campaigns',
    titleHi: 'Flash Sales Campaigns',
    en: `
      <ul>
        <li><strong>Campaigns:</strong> Create events like "Diwali Sale" with specific start and end dates.</li>
        <li><strong>Banners:</strong> Upload images for the campaign to show swipeable banners on the homepage.</li>
        <li><strong>Bulk Offers:</strong> Select products to add to a campaign. Set discounted prices and fake/real stock bars to create urgency.</li>
        <li><strong>AI Capabilities:</strong> Ask AI to "Create a Weekend Clearance sale with 20% discount on all dry fruits".</li>
      </ul>
    `,
    hi: `
      <ul>
        <li><strong>Campaigns:</strong> "Diwali Sale" ya "Weekend Sale" jaisi campaigns create karein unki start aur end date ke sath.</li>
        <li><strong>Banners:</strong> Homepage par swipeable banners dikhane ke liye image upload karein.</li>
        <li><strong>Bulk Offers:</strong> Products ko sale mein add karein. Unka naya price aur urgency badhane ke liye (X% Claimed) stock bar set karein.</li>
        <li><strong>AI Capabilities:</strong> AI se kahen "Dry fruits par 20% discount ke sath Weekend Clearance sale create karo".</li>
      </ul>
    `
  },
  'default': {
    titleEn: 'Admin Guide',
    titleHi: 'Admin Guide',
    en: `
      <ul>
        <li><strong>General Usage:</strong> Navigate through the sidebar to access different sections of your store.</li>
        <li><strong>AI Assistant:</strong> You can always ask the AI assistant to perform tasks for you across any page. Just type your requirement clearly!</li>
      </ul>
    `,
    hi: `
      <ul>
        <li><strong>General Usage:</strong> Sidebar ke through aap store ke alag-alag sections mein ja sakte hain.</li>
        <li><strong>AI Assistant:</strong> Aap kabhi bhi AI assistant ko koi bhi task karne ke liye bol sakte hain. Bas apni requirement detail mein likh dein!</li>
      </ul>
    `
  }
};
