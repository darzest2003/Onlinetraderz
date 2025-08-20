// ====== Simple Auth (client-side) ======
const ADMIN_PASSCODE = 'onlinetraderz123'; // TODO: change me

const EMAILJS = {
  SERVICE_ID: 'SERVICE_ID',
  TEMPLATE_ID_SHIPPED: 'TEMPLATE_ID_SHIPPED', // email to customer when shipped
  PUBLIC_KEY: 'PUBLIC_KEY'
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function readLS(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeLS(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function setYear(){ const y=$('#year'); if(y) y.textContent = new Date().getFullYear(); }
function cycleTheme(){
  const body = document.body;
  const classes = ['theme-light','theme-dark','theme-blue'];
  let idx = classes.findIndex(c => body.classList.contains(c));
  body.classList.remove(...classes);
  body.classList.add(classes[(idx+1)%classes.length]);
}

// ====== Auth ======
function onLogin(e){
  e.preventDefault();
  const pass = $('#adminPass').value;
  if (pass === ADMIN_PASSCODE){
    $('#authCard').classList.add('hidden');
    $('#adminPanel').classList.remove('hidden');
    loadProductsUI();
    loadOrdersUI();
    loadAddressesUI();
    loadSettingsUI();
  } else {
    alert('Wrong passcode');
  }
}

// ====== Products ======
function getProducts(){ return readLS('products', []); }
function setProducts(arr){ writeLS('products', arr); }

function productItem(p){
  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `
    <img src="${p.image || 'https://via.placeholder.com/80?text=P'}" alt="${p.name}">
    <div class="meta">
      <strong>${p.name}</strong>
      <span class="muted">PKR ${Number(p.price).toLocaleString()}</span>
    </div>
    <div class="actions">
      <button class="btn" data-act="edit">Edit</button>
      <button class="btn" data-act="del">Delete</button>
    </div>
  `;
  div.querySelector('[data-act="edit"]').addEventListener('click', ()=> fillProductForm(p));
  div.querySelector('[data-act="del"]').addEventListener('click', ()=> deleteProduct(p.id));
  return div;
}

function loadProductsUI(){
  const list = $('#productList');
  list.innerHTML = '';
  getProducts().forEach(p => list.appendChild(productItem(p)));
}

function fillProductForm(p){
  $('#prodId').value = p.id;
  $('#prodName').value = p.name;
  $('#prodPrice').value = p.price;
  $('#prodImg').value = p.image || '';
  $('#prodDesc').value = p.description || '';
}

function resetProductForm(){
  $('#prodId').value = '';
  $('#prodName').value = '';
  $('#prodPrice').value = '';
  $('#prodImg').value = '';
  $('#prodDesc').value = '';
}

function onSaveProduct(e){
  e.preventDefault();
  const id = $('#prodId').value || 'P-' + Date.now();

  // Check if a file was uploaded
  const file = $('#prodFile').files[0];
  if (file) {
    // Convert file to Base64 before saving
    const reader = new FileReader();
    reader.onload = function(evt){
      saveProduct(id, evt.target.result); // Base64 string goes into "image"
    };
    reader.readAsDataURL(file);
  } else {
    // If no file, use the URL entered in input
    saveProduct(id, $('#prodImg').value.trim());
  }
}

// Helper function to save product
function saveProduct(id, imageUrl){
  const p = {
    id,
    name: $('#prodName').value.trim(),
    price: Number($('#prodPrice').value),
    image: imageUrl,
    description: $('#prodDesc').value.trim()
  };
  const arr = getProducts();
  const i = arr.findIndex(x => x.id === id);
  if (i>=0) arr[i] = p; else arr.push(p);
  setProducts(arr);
  resetProductForm();
  loadProductsUI();
  alert('Saved');
}

function deleteProduct(id){
  if(!confirm('Delete this product?')) return;
  const arr = getProducts().filter(x => x.id !== id);
  setProducts(arr);
  loadProductsUI();
}

// Export/Import JSON
function exportProducts(){
  const data = JSON.stringify(getProducts(), null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'products.json'; a.click();
  URL.revokeObjectURL(url);
}
function importProducts(file){
  const reader = new FileReader();
  reader.onload = (e)=>{
    try {
      const arr = JSON.parse(e.target.result);
      if(!Array.isArray(arr)) throw new Error('Invalid JSON');
      setProducts(arr);
      loadProductsUI();
      alert('Imported');
    } catch(err){ alert('Import failed: '+err.message); }
  };
  reader.readAsText(file);
}

// ====== Orders ======
function getOrders(){ return readLS('orders', []); }
function setOrders(arr){ writeLS('orders', arr); }

function orderItem(o){
  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `
    <div class="meta" style="grid-column: span 2;">
      <strong>${o.id} • ${o.product}</strong>
      <span class="muted">${o.name} · ${o.email} · ${o.phone}</span>
      <span class="muted">${o.address}</span>
      <span class="muted">Status: <b>${o.status}</b> • ${new Date(o.createdAt).toLocaleString()}</span>
    </div>
    <div class="actions">
      <button class="btn" data-act="ship">Mark Shipped</button>
      <button class="btn" data-act="del">Delete</button>
    </div>
  `;
  div.querySelector('[data-act="ship"]').addEventListener('click', ()=> markShipped(o.id));
  div.querySelector('[data-act="del"]').addEventListener('click', ()=> deleteOrder(o.id));
  return div;
}

function loadOrdersUI(){
  const list = $('#ordersList');
  list.innerHTML = '';
  getOrders().slice().reverse().forEach(o => list.appendChild(orderItem(o)));
}

async function sendShippedEmail(order){
  try {
    await emailjs.send(EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID_SHIPPED, {
      to_email: order.email,
      name: order.name,
      product: order.product,
      order_id: order.id
    });
  } catch (e) { console.warn('Shipped email failed', e); }
}

function markShipped(id){
  const arr = getOrders();
  const o = arr.find(x => x.id === id);
  if (!o) return;
  o.status = 'shipped';
  o.shippedAt = new Date().toISOString();
  setOrders(arr);
  loadOrdersUI();
  sendShippedEmail(o);
  alert('Marked as shipped and customer notified.');
}

function deleteOrder(id){
  if(!confirm('Delete this order?')) return;
  const arr = getOrders().filter(x => x.id !== id);
  setOrders(arr);
  loadOrdersUI();
}

// ====== Address Book ======
function loadAddressesUI(){
  const list = $('#addressList');
  const book = readLS('addresses', []);
  list.innerHTML = '';
  book.forEach(a => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="meta" style="grid-column: span 2;">
        <strong>${a.name}</strong>
        <span class="muted">${a.email} • ${a.phone}</span>
        <span class="muted">${a.address}</span>
      </div>
    `;
    list.appendChild(div);
  });
}

// ====== Settings ======
function loadSettingsUI(){
  const s = readLS('settings', {adminEmail: 'farisdaar107@gmail.com', waNumber: '03444318078'});
  $('#adminEmail').value = s.adminEmail;
  $('#waNumber').value = s.waNumber;
}

function saveSettings(){
  const s = { adminEmail: $('#adminEmail').value.trim(), waNumber: $('#waNumber').value.trim() };
  writeLS('settings', s);
  alert('Settings saved');
}

// ====== Tabs ======
function initTabs(){
  $$('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-pane').forEach(p=>p.classList.add('hidden'));
      $('#'+btn.dataset.tab).classList.remove('hidden');
    });
  });
}

// ====== Init ======
function init(){
  setYear();
  $('#themeToggle').addEventListener('click', cycleTheme);
  $('#loginForm').addEventListener('submit', onLogin);
  $('#productForm').addEventListener('submit', onSaveProduct);
  $('#resetProduct').addEventListener('click', resetProductForm);
  $('#exportProducts').addEventListener('click', exportProducts);
  $('#importProducts').addEventListener('change', (e)=> importProducts(e.target.files[0]));
  $('#settingsTab').addEventListener('input', (e)=>{
    if (['adminEmail','waNumber'].includes(e.target.id)) saveSettings();
  });
  initTabs();
}

document.addEventListener('DOMContentLoaded', init);