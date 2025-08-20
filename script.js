// ====== Config ======
const ITEMS_PER_PAGE = 6; // 2 columns x 3 rows
const EMAILJS = {
  SERVICE_ID: 'SERVICE_ID',              // TODO: replace
  TEMPLATE_ID_ADMIN: 'TEMPLATE_ID_ADMIN',// TODO: replace (email to admin on new order)
  TEMPLATE_ID_CUSTOMER: 'TEMPLATE_ID_CUSTOMER', // TODO: replace (email to customer confirmation)
  PUBLIC_KEY: 'PUBLIC_KEY'               // TODO: replace (also set in index.html)
};

const ADMIN_EMAIL_DEFAULT = 'farisdaar107@gmail.com';

// ====== State ======
let allProducts = [];
let filteredProducts = [];
let page = 1;

// ====== Helpers ======
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeLS(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function setYear(){ $('#year').textContent = new Date().getFullYear(); }

function cycleTheme(){
  const body = document.body;
  const classes = ['theme-light','theme-dark','theme-blue'];
  let idx = classes.findIndex(c => body.classList.contains(c));
  body.classList.remove(...classes);
  body.classList.add(classes[(idx+1)%classes.length]);
}

// ====== Products ======
async function loadProducts(){
  // Prefer localStorage (admin-managed). If empty, fetch products.json as seed.
  const ls = readLS('products', null);
  if (ls && Array.isArray(ls) && ls.length) {
    allProducts = ls;
  } else {
    try {
      const res = await fetch('products.json', {cache: 'no-store'});
      allProducts = await res.json();
      writeLS('products', allProducts);
    } catch (e) {
      allProducts = [];
    }
  }
  filteredProducts = [...allProducts];
  renderPage();
}

function renderPage(){
  const grid = $('#productGrid');
  grid.innerHTML = '';
  const start = (page-1)*ITEMS_PER_PAGE;
  const slice = filteredProducts.slice(start, start+ITEMS_PER_PAGE);
  slice.forEach(p => grid.appendChild(productCard(p)));
  $('#pagerText').textContent = `Page ${page}`;
  $('#prevBtn').disabled = page === 1;
  $('#nextBtn').disabled = start + ITEMS_PER_PAGE >= filteredProducts.length;
}

function productCard(p){
  const div = document.createElement('div');
  div.className = 'product';
  div.innerHTML = `
    <img src="${p.image || 'https://via.placeholder.com/600x400?text=Onlinetraderz'}" alt="${p.name}">
    <h3>${p.name}</h3>
    <p>PKR ${Number(p.price).toLocaleString()}</p>
    <div class="row gap">
      <button class="btn primary">Order</button>
      <button class="btn ghost" onclick="window.open('https://wa.me/923187900076?text=' + encodeURIComponent('Hi, I have a question about ${p.name}'))">Ask on WhatsApp</button>
    </div>
  `;
  div.querySelector('.btn.primary').addEventListener('click', ()=> startOrder(p));
  return div;
}

// ====== Search & Paging ======
function handleSearch(){
  const q = $('#searchInput').value.toLowerCase();
  filteredProducts = allProducts.filter(p => `${p.name} ${p.description||''}`.toLowerCase().includes(q));
  page = 1; renderPage();
}

// ====== Orders ======
function startOrder(product){
  $('#orderSection').classList.remove('hidden');
  $('#orderProduct').value = product.name;
  $('#orderName').focus();
  window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
}

function saveAddressBook(entry){
  const book = readLS('addresses', []);
  const idx = book.findIndex(b => b.email === entry.email);
  if (idx >= 0) book[idx] = {...book[idx], ...entry}; else book.push(entry);
  writeLS('addresses', book);
}

function saveOrder(order){
  const orders = readLS('orders', []);
  orders.push(order);
  writeLS('orders', orders);
}

async function emailNotify(order){
  const adminEmail = (readLS('settings', {adminEmail: ADMIN_EMAIL_DEFAULT}).adminEmail) || ADMIN_EMAIL_DEFAULT;
  // Admin notification
  try {
    await emailjs.send(EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID_ADMIN, {
      admin_email: adminEmail,
      product: order.product,
      name: order.name,
      phone: order.phone,
      email: order.email,
      address: order.address,
      notes: order.notes || '',
      order_id: order.id,
      total: order.total || '—'
    });
  } catch (e) { console.warn('Admin email failed', e); }

  // Customer confirmation
  try {
    await emailjs.send(EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID_CUSTOMER, {
      to_email: order.email,
      product: order.product,
      name: order.name,
      order_id: order.id
    });
  } catch (e) { console.warn('Customer email failed', e); }
}

function onSubmitOrder(e){
  e.preventDefault();
  const order = {
    id: 'ORD-' + Date.now(),
    product: $('#orderProduct').value,
    name: $('#orderName').value.trim(),
    phone: $('#orderPhone').value.trim(),
    email: $('#orderEmail').value.trim(),
    address: $('#orderAddress').value.trim(),
    notes: $('#orderNotes').value.trim(),
    status: 'received',
    createdAt: new Date().toISOString()
  };
  // Save
  saveOrder(order);
  saveAddressBook({name: order.name, email: order.email, phone: order.phone, address: order.address});
  // Notify via email
  emailNotify(order);
  // Reset + UI
  e.target.reset();
  $('#orderSection').classList.add('hidden');
  alert('Order submitted! You will receive a confirmation email.');
}

// ====== Init ======
function init(){
  setYear();
  $('#themeToggle').addEventListener('click', cycleTheme);
  $('#searchInput').addEventListener('input', handleSearch);
  $('#prevBtn').addEventListener('click', ()=>{ page=Math.max(1,page-1); renderPage();});
  $('#nextBtn').addEventListener('click', ()=>{ page=page+1; renderPage();});
  $('#orderForm').addEventListener('submit', onSubmitOrder);
  $('#cancelOrder').addEventListener('click', ()=> $('#orderSection').classList.add('hidden'));
  loadProducts();
}

document.addEventListener('DOMContentLoaded', init);