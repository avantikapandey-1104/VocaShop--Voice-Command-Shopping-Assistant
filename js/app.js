let PRODUCTS = [];
let FILTERED = [];
let CART = []; 
let USER_HISTORY = [];

const grid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');
const micBtn = document.getElementById('micBtn');
const assistantStatus = document.getElementById('assistantStatus');
const cartList = document.getElementById('cartList');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCartBtn');
const showCartBtn = document.getElementById('showCartBtn');

function currency(n) { return `₹${n}`; }

async function loadData() {
  const res = await fetch('data/products.json');
  PRODUCTS = await res.json();

  const cats = Array.from(new Set(PRODUCTS.map(p => p.category))).sort();
  for (const c of cats) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    categoryFilter.appendChild(opt);
  }
  FILTERED = PRODUCTS.slice();
  render();
}

function render() {
  grid.innerHTML = '';
  for (const p of FILTERED) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}"/>
      <div class="p">
        <div class="name">${p.name}</div>
        <div class="meta"><span>${p.brand}</span><span>⭐ ${p.rating}</span></div>
        <div class="row"><div class="price">${currency(p.price)}</div>
        <button class="btn" data-id="${p.id}">Add</button></div>
        <div class="meta"><span>${p.category}</span><span>SKU: ${p.sku}</span></div>
      </div>
    `;
    card.querySelector('button').addEventListener('click', () => addToCartById(p.id));
    grid.appendChild(card);
  }
}

function refreshCart() {
  cartList.innerHTML = '';
  let total = 0;
  for (const item of CART) {
    const itemTotal = item.product.price * item.quantity;
    total += itemTotal;
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.product.name} (x${item.quantity})</span><span>${currency(itemTotal)}</span>`;
    const btn = document.createElement('button');
    btn.textContent = 'Remove One';
    btn.addEventListener('click', () => removeOneFromCart(item.product.id));
    li.appendChild(btn);
    cartList.appendChild(li);
  }
  cartTotalEl.textContent = String(total);
}

function addToCartById(id, qty = 1) {
  const p = PRODUCTS.find(x => x.id === id);
  if (p) {
    const existing = CART.find(x => x.product.id === id);
    if (existing) {
      existing.quantity += qty;
    } else {
      CART.push({product: p, quantity: qty});
    }
    USER_HISTORY.push(p);
    refreshCart();
    toast(`Added: ${qty} x ${p.name}`);
    smartSuggestions(p);
  }
}

function addByName(term, maxPrice = null, quantity = 1) {
  const t = term.toLowerCase();
  let candidates = PRODUCTS.filter(p => p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t));
  if (maxPrice != null) {
    candidates = candidates.filter(p => p.price <= maxPrice);
  }

  if (candidates.length) {
    const p = candidates[0];
    const existing = CART.find(x => x.product.id === p.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      CART.push({product: p, quantity: quantity});
    }
    for (let i = 0; i < quantity; i++) {
      USER_HISTORY.push(p);
    }
    refreshCart();
    toast(`Added: ${quantity} x ${p.name}`);
    smartSuggestions(p);
  } else {
    toast(`No match found for "${term}"${maxPrice?` under ${maxPrice}`:''}`);
    suggestSubstitute(term);
  }
}


function removeByName(term) {
  const t = term.toLowerCase();
  const idx = CART.findIndex(x => x.product.name.toLowerCase().includes(t) || x.product.category.toLowerCase().includes(t));
  if (idx >= 0) {
    const item = CART[idx];
    item.quantity--;
    if (item.quantity <= 0) {
      CART.splice(idx, 1);
    }
    refreshCart();
    toast(`Removed one: ${item.product.name}`);
  } else {
    toast(`No item matching "${term}" in cart`);
  }
}

function removeOneFromCart(id) {
  const idx = CART.findIndex(x => x.product.id === id);
  if (idx >= 0) {
    const item = CART[idx];
    item.quantity--;
    if (item.quantity <= 0) {
      CART.splice(idx, 1);
    }
    refreshCart();
  }
}

function search(term) {
  const t = term.toLowerCase();
  FILTERED = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(t) ||
    p.brand.toLowerCase().includes(t) ||
    p.category.toLowerCase().includes(t)
  );
  render();

  if (FILTERED.length === 0) {
    suggestSubstitute(term);
  }
}

function filterCategory(cat) {
  const c = cat.toLowerCase();
  FILTERED = PRODUCTS.filter(p => p.category.toLowerCase().includes(c));
  render();
}

function sortBy(key, dir) {
  FILTERED.sort((a,b) => {
    if (a[key] === b[key]) return 0;
    return dir === 'asc' ? (a[key] - b[key]) : (b[key] - a[key]);
  });
  render();
}

function showCart() {
  if (CART.length === 0) { toast("Cart is empty"); return; }
  const names = CART.map(x => `${x.product.name} (x${x.quantity})`).join(', ');
  toast(`Cart: ${names}`);
}

function clearCart() {
  console.log("Clearing cart via voice command or button");
  CART = [];
  refreshCart();
  toast("Cart cleared");
}

let toastTimeout = null;
function toast(msg) {
  assistantStatus.textContent = 'Assistant: ' + msg;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { assistantStatus.textContent = 'Assistant: idle'; }, 4000);
}

function smartSuggestions(product) {
  const related = PRODUCTS.filter(p =>
    (p.category === product.category || p.brand === product.brand) && p.id !== product.id
  ).slice(0,2);

  if (related.length) {
    toast(`You may also like: ${related.map(p => p.name).join(', ')}`);
  }
}

function suggestSubstitute(term) {
  const t = term.toLowerCase();
  const colors = ["red","blue","green","black","white","brown","yellow","pink","orange","grey"];
  let foundColor = colors.find(c => t.includes(c));

  let substitutes = [];

  if (foundColor) {
    substitutes = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(foundColor) ||
      p.category.toLowerCase().includes(foundColor)
    );
  }

  if (substitutes.length === 0 && USER_HISTORY.length) {
    const last = USER_HISTORY[USER_HISTORY.length-1];
    substitutes = PRODUCTS.filter(p =>
      p.category === last.category && !p.name.toLowerCase().includes(term)
    );
  }

  if (substitutes.length === 0 && PRODUCTS.length) {
    substitutes = PRODUCTS.slice(0, 3);
  }

  if (substitutes.length) {
    toast(`Couldn't find "${term}". Showing similar options: ${substitutes.map(p => p.name).join(', ')}`);
    FILTERED = substitutes;
    render();
  } else {
    toast(`"${term}" not available in our catalog.`);
  }
}

function getSmartSuggestions() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return ["Slim Blue T-Shirt (on sale)", "Black T-Shirt", "Comfort Black Saree","Slim White Short"];//SUMMER
  if (month >= 5 && month <= 7) return ["Slim Blue T-Shirt", "Comfort Black Saree", "White Sandal (on sale)", "Slim White Short"];//RAINY
  if (month >= 8 && month <= 10) return ["Cotton Red Saree (discounted)", "Premium Black Sandal", "Woman top"];//AUTUMN, FESTIVE
  return ["Modern Brown Hoodie", "Modern Grey Hoodie", "Sport Blue Hoodie", "Leather Brown Trouser(sale)"];//WINTER
}

function showSmartSuggestions() { 
  const box = document.getElementById("smart-suggestions");
  const items = getSmartSuggestions();
  box.innerHTML = `
    <h3>Seasonal Suggestions</h3>
    ${items.map(item => `<div>🌟 ${item}</div>`).join("")}
  `;
}

document.addEventListener("DOMContentLoaded", showSmartSuggestions);

searchBtn.addEventListener('click', () => search(searchInput.value.trim()));
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(searchInput.value.trim()); });
categoryFilter.addEventListener('change', () => {
  if (categoryFilter.value) filterCategory(categoryFilter.value);
  else { FILTERED = PRODUCTS.slice(); render(); }
});
sortSelect.addEventListener('change', () => {
  switch (sortSelect.value) {
    case 'price-asc': sortBy('price', 'asc'); break;
    case 'price-desc': sortBy('price', 'desc'); break;
    case 'rating-desc': FILTERED.sort((a,b) => b.rating - a.rating); render(); break;
    default: FILTERED = PRODUCTS.slice(); render();
  }
});
clearCartBtn.addEventListener('click', clearCart);
showCartBtn.addEventListener('click', showCart);
let recognizing = false;
let recognizer = null;

const multilingualMap = {
  "kharid": "add", "khareed": "add", "hatado": "remove", "dikhaye": "search",
  "daam kam se zyada": "sort by price low to high", "daam zyada se kam": "sort by price high to low",
  "rating accha": "sort by rating high to low", "rating kharab": "sort by rating low to high",
  "cart dikhao": "show cart", "cart khali karo": "clear cart",
  "kya tum meri madad karoge": "help", "dhanyavaad": "thank you", "shukriya": "thank you",
  "mujhe do": "add 2", "mujhe teen": "add 3", "mujhe ek": "add 1",
  "hatado ek": "remove 1", "hatado do": "remove 2",
};

function translateCommand(raw) {
  let lower = raw.toLowerCase().trim();

  for (const phrase in multilingualMap) {
    if (lower.includes(phrase)) {
      lower = lower.replace(phrase, multilingualMap[phrase]).trim();
      if (multilingualMap[phrase] === "search") {
        return "search " + lower.replace(/^search\s*/i, "").trim();
      }
      return lower;
    }
  }
  return raw;
}


function ensureRecognizer() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('SpeechRecognition not supported; use text search');
    return null;
  }
  if (!recognizer) {
    recognizer = new SpeechRecognition();
    const languageSelect = document.getElementById('language');
    recognizer.lang = languageSelect ? languageSelect.value : 'en-US';
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;
    recognizer.onresult = (event) => {
      let transcript = event.results[0][0].transcript.trim();
      transcript = translateCommand(transcript);
      handleCommand(transcript);
    };
    recognizer.onend = () => {
      recognizing = false;
      micBtn.classList.remove('active');
      assistantStatus.textContent = 'Assistant: idle';
    };
    recognizer.onerror = (e) => {
      toast('Voice error: ' + e.error);
    };
  }
  return recognizer;
}

micBtn.addEventListener('click', () => {
  const r = ensureRecognizer();
  if (!r) return;
  if (!recognizing) {
    recognizing = true;
    assistantStatus.textContent = 'Assistant: listening...';
    micBtn.classList.add('active');
    r.start();
  } else {
    r.stop();
  }
});

function handleCommand(raw) {
  const cmd = raw.toLowerCase();
  let norm = cmd;

  toast(`Normalized command: "${norm}"`);
  norm = norm.replace(/\b(buy|get|purchase|add)\b/g, "add");
  norm = norm.replace(/\b(delete|take out)\b/g, "remove");
  norm = norm.replace(/\b(find|show me|give me|look for)\b/g, "search");
  norm = norm.replace(/\bi want to\b/g, "");
  norm = norm.replace(/\b(please|could you|can you|some|a|an|the|for me|maybe)\b/g, "");
  norm = norm.replace(/\s+/g, " ").trim();
  const numberMap = {
    'one':1, 'two':2, 'three':3, 'four':4, 'five':5, 'six':6, 'seven':7, 'eight':8, 'nine':9, 'ten':10,
    'eleven':11, 'twelve':12, 'thirteen':13, 'fourteen':14, 'fifteen':15, 'sixteen':16, 'seventeen':17, 'eighteen':18, 'nineteen':19, 'twenty':20,
    'one hundred':100, 'two hundred':200, 'three hundred':300, 'four hundred':400,
    'five hundred':500, 'six hundred':600, 'seven hundred':700, 'eight hundred':800, 'nine hundred':900
  };
  for (const k in numberMap) {
    norm = norm.replaceAll(k, String(numberMap[k]));
  }
  toast(`Normalized command: "${norm}"`);
  const addUnder = norm.match(/^add\s+([a-z0-9\s]+?)\s+under\s+(\d+)/i);
  const addSimple = norm.match(/^add\s+([a-z0-9\s]+)$/i);
  const removeSimple = norm.match(/^remove\s+([a-z0-9\s]+)$/i);
  const searchCmd = norm.match(/^(search|find|show)\s+([a-z0-9\s]+)$/i);
  const filterCat = norm.match(/^filter\s+(?:category|by category)\s+([a-z0-9\s]+)$/i);
  const brandSearch = norm.match(/^(search|find|show|give)(?:\s+me)?\s+(?:([a-z0-9\s]+)\s+)?(?:items\s+)?(?:of|from)\s+([a-z0-9\s]+)(?:\s+brand)?(?:\s+|$)/i);
  const priceRangeSearch = norm.match(/^(search|find|show|give)(?:\s+me)?\s+(?:([a-z0-9\s]+)\s+)?(?:items\s+)?(?:of|from\s+([a-z0-9\s]+)\s+)?([a-z0-9\s]+)\s+under\s+rs?\s*(\d+)/i);
  const priceRangeItemOnly = norm.match(/^(search|find|show|give)(?:\s+me)?\s+([a-z0-9\s]+?)\s+under\s+(?:rs\s*)?(\d+)/i);
  const sortLowHigh = norm.match(/^sort\s+by\s+price\s+(low(?:\s+to\s+high)?|lowest|ascending|asc|cheap(?:\s+to\s+expensive)?)$/i);
  const sortHighLow = norm.match(/^sort\s+by\s+price\s+(high(?:\s+to\s+low)?|highest|descending|desc|expensive(?:\s+to\s+cheap)?)$/i);
  const sortRatingHigh = norm.match(/^sort\s+by\s+rating\s+(high(?:\s+to\s+low)?|highest|descending|desc|best)$/i);
  const sortRatingLow = norm.match(/^sort\s+by\s+rating\s+(low(?:\s+to\s+high)?|lowest|ascending|asc|worst)$/i);
  const showCartCmd = norm.match(/^(show|open)\s+cart$/i);
  const clearCartCmd = norm.match(/^(clear|empty)(\s+(the|my))?\s+cart$/i);
  const addWithQtyUnder = norm.match(/^(add|buy)\s+(\d+)\s+([a-z0-9\s]+)\s+under\s+(\d+)/i);
  const addWithQty = norm.match(/^(add|buy)\s+(\d+)\s+([a-z0-9\s]+)$/i);
  const searchQty = norm.match(/^(search|find|show)\s+(\d+)\s+([a-z0-9\s]+)$/i);
  const searchQty2 = norm.match(/^(search|find|show)\s+([a-z0-9\s]+)\s+(\d+)$/i);

  if (addWithQtyUnder) {
  const qty = parseInt(addWithQtyUnder[2], 10);
  const item = addWithQtyUnder[3].trim();
  const priceLimit = parseInt(addWithQtyUnder[4], 10);
  toast(`Matched addWithQtyUnder: qty=${qty}, item=${item}, priceLimit=${priceLimit}`);
  addByName(item, priceLimit, qty);
  return;
  }

  if (addWithQty) {
  const qty = parseInt(addWithQty[2], 10);
  const item = addWithQty[3].trim();
  toast(`Matched addWithQty: qty=${qty}, item=${item}`);
  addByName(item, null, qty);
  return;
  }

  if (searchQty) {
    const qty = parseInt(searchQty[2], 10);
    const term = searchQty[3].trim();
    search(term);
    FILTERED = FILTERED.slice(0, qty);
    render();
    toast(`Showing ${qty} results for "${term}"`);
    return;
  }

  if (searchQty2) {
    const term = searchQty2[2].trim();
    const qty = parseInt(searchQty2[3], 10);
    search(term);
    FILTERED = FILTERED.slice(0, qty);
    render();
    toast(`Showing ${qty} results for "${term}"`);
    return;
  }

  if (priceRangeSearch) {
    const itemTerm = priceRangeSearch[2] ? priceRangeSearch[2].trim() : "";
    const brandTerm = priceRangeSearch[3] ? priceRangeSearch[3].trim().toLowerCase() : "";
    const categoryTerm = priceRangeSearch[4] ? priceRangeSearch[4].trim().toLowerCase() : "";
    const priceLimit = parseInt(priceRangeSearch[5], 10);

    FILTERED = PRODUCTS.filter(p => {
      const matchesBrand = brandTerm ? p.brand.toLowerCase().trim() === brandTerm : true;
      const matchesCategory = categoryTerm ? p.category.toLowerCase().includes(categoryTerm) : true;
      const matchesItem = itemTerm ? p.name.toLowerCase().includes(itemTerm) : true;
      const matchesPrice = p.price <= priceLimit;
      return matchesBrand && matchesCategory && matchesItem && matchesPrice;
    });

    render();
    toast(`Showing items${itemTerm ? " matching '" + itemTerm + "'" : ""}${brandTerm ? " of brand '" + brandTerm + "'" : ""} under ₹${priceLimit}`);
    return;
  }

  if (priceRangeItemOnly) {
    toast(`Matched priceRangeItemOnly: ${priceRangeItemOnly[0]}`);
    const itemTerm = priceRangeItemOnly[2] ? priceRangeItemOnly[2].trim() : "";
    const priceLimit = parseInt(priceRangeItemOnly[3], 10);
    toast(`Parsed item: "${itemTerm}", priceLimit: ${priceLimit}`);

    FILTERED = PRODUCTS.filter(p => {
      const matchesItem = itemTerm ? p.name.toLowerCase().includes(itemTerm) : true;
      const matchesPrice = p.price <= priceLimit;
      return matchesItem && matchesPrice;
    });

    toast(`Filtered products count: ${FILTERED.length}`);
    render();
    toast(`Showing items matching '${itemTerm}' under ₹${priceLimit}`);
    return;
  }

  if (brandSearch) {
    const itemTerm = brandSearch[2] ? brandSearch[2].trim() : "";
    const brandTerm = brandSearch[3].trim().toLowerCase();
    toast(`Searching brand: "${brandTerm}"`);
    for (const p of PRODUCTS) {
      console.log(`Product brand: "${p.brand}"`);
    }
    FILTERED = PRODUCTS.filter(p => 
      p.brand.toLowerCase().trim() === brandTerm &&
      (itemTerm === "" || p.name.toLowerCase().includes(itemTerm))
    );
    render();
    toast(`Showing items${itemTerm ? " matching '" + itemTerm + "'" : ""} of brand "${brandTerm}"`);
    return;
  }
  if (addUnder) { addByName(addUnder[1].trim(), parseInt(addUnder[2], 10)); return; }
  if (addSimple) { addByName(addSimple[1].trim()); return; }
  if (removeSimple) { removeByName(removeSimple[1].trim()); return; }
  if (clearCartCmd) {
    console.log("Voice command recognized: clear cart");
    clearCart();
    return;
  }
  if (searchCmd) {
    const term = searchCmd[2].trim();
    search(term);
    toast(`Searching "${term}"`);
    return;
  }
  if (filterCat) {
    const cat = filterCat[1].trim();
    filterCategory(cat);
    toast(`Category "${cat}"`);
    return;
  }
  if (sortLowHigh) { sortBy('price','asc'); toast('Sorted: price low to high'); return; }
  if (sortHighLow) { sortBy('price','desc'); toast('Sorted: price high to low'); return; }
  if (sortRatingHigh) { FILTERED.sort((a,b) => b.rating - a.rating); render(); toast('Sorted: rating high to low'); return; }
  if (sortRatingLow) { FILTERED.sort((a,b) => a.rating - b.rating); render(); toast('Sorted: rating low to high'); return; }
  if (showCartCmd) { showCart(); return; }
  toast('Sorry, I did not understand: ' + raw);
}

// Sidebar toggle for mobile
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.querySelector('.sidebar');

function checkWindowSize() {
  if (window.innerWidth <= 600) {
    toggleSidebarBtn.style.display = 'block';
    sidebar.classList.remove('show');
  } else {
    toggleSidebarBtn.style.display = 'none';
    sidebar.classList.add('show');
  }
}

toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('show');
});

window.addEventListener('resize', checkWindowSize);
window.addEventListener('load', checkWindowSize);

loadData();
