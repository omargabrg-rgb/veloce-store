function openProductPage(id,e){window.location.assign('/product.html?id='+encodeURIComponent(id));}
let products=[];
let cart=JSON.parse(localStorage.getItem('veloce_cart')||'[]');
let currentLang=localStorage.getItem('veloce_lang')||'en';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const escAttr=esc;
function money(n){return Number(n).toFixed(2)+' L.E'}
function toast(t){const e=$('#toast');if(!e)return;e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2200)}
async function api(url,opt={}){const r=await fetch(url,opt);let d={};try{d=await r.json()}catch{}if(!r.ok||!d.success)throw Error(d.message||'Request failed');return d}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'category'}
function saveCart(){localStorage.setItem('veloce_cart',JSON.stringify(cart));updateCartCount()}
function updateCartCount(){$('#cartCount').textContent=cart.reduce((a,x)=>a+Number(x.quantity||0),0)}
function applyLanguage(){
 document.documentElement.lang=currentLang;document.documentElement.dir=currentLang==='ar'?'rtl':'ltr';
 document.querySelectorAll('[data-en][data-ar]').forEach(el=>el.innerHTML=currentLang==='ar'?el.dataset.ar:el.dataset.en);
 document.querySelectorAll('[data-placeholder-en][data-placeholder-ar]').forEach(el=>el.placeholder=currentLang==='ar'?el.dataset.placeholderAr:el.dataset.placeholderEn);
 const b=$('#langBtn');if(b)b.textContent=currentLang==='ar'?'English':'عربي';
}
async function load(){try{const d=await api('/api/products?'+Date.now());products=d.products||[];render();syncCart()}catch(e){$('#collection').innerHTML='<p>Could not load products.</p>';console.error(e)}}
function card(p){
 let gallery=Array.isArray(p.images)&&p.images.length?p.images:(p.image?[p.image]:[]);
 let img=gallery.length?`<img class="product-main-photo" src="${escAttr(gallery[0])}" alt="${escAttr(p.name)}">`:`<div class="placeholder"><i class="fa-solid fa-shirt"></i></div>`;
 let colors=(p.variants&&p.variants.colors)||[];
 let sizes=(p.variants&&p.variants.sizes)||[];
 let availableColors=colors.filter(v=>Number(v.stock||0)>0);
 let availableSizes=sizes.filter(v=>Number(v.stock||0)>0);
 let totalVariantStock=(colors.length||sizes.length)
   ? Math.max(
       colors.length?Math.max(...colors.map(v=>Number(v.stock||0))):0,
       sizes.length?Math.max(...sizes.map(v=>Number(v.stock||0))):0
     )
   : Number(p.stock||0);
 let disabled=totalVariantStock<1;

 const colorIcon=(name)=>{
   const n=String(name).toLowerCase();
   let bg="#777";
   if(n.includes("black")||n.includes("اسود")||n.includes("أسود")) bg="#111";
   else if(n.includes("white")||n.includes("ابيض")||n.includes("أبيض")) bg="#fff";
   else if(n.includes("red")||n.includes("احمر")||n.includes("أحمر")) bg="#d60000";
   else if(n.includes("blue")||n.includes("ازرق")||n.includes("أزرق")) bg="#1769aa";
   else if(n.includes("green")||n.includes("اخضر")||n.includes("أخضر")) bg="#218739";
   else if(n.includes("yellow")||n.includes("اصفر")||n.includes("أصفر")) bg="#f2c300";
   return bg;
 };

 let colorHtml=colors.length?`
 <div class="variant-choice-group">
   <label>${currentLang==="ar"?"اللون":"Color"}</label>
   <div class="variant-icons color-icons">
     ${colors.map(v=>{
       const stock=Number(v.stock||0), sold=stock<=0;
       return `<button type="button" class="color-icon ${sold?"variant-sold":""}" data-value="${escAttr(v.name)}" data-stock="${stock}" title="${escAttr(v.name)}" ${sold?"disabled":""} onclick="selectVariantIcon(this,'color')" style="--variant-color:${colorIcon(v.name)}"><span></span><small>${esc(v.name)}</small></button>`;
     }).join("")}
   </div>
 </div>`:"";

 let sizeHtml=sizes.length?`
 <div class="variant-choice-group">
   <label>${currentLang==="ar"?"المقاس":"Size"}</label>
   <div class="variant-icons size-icons">
     ${sizes.map(v=>{
       const stock=Number(v.stock||0), sold=stock<=0;
       return `<button type="button" class="size-icon ${sold?"variant-sold":""}" data-value="${escAttr(v.name)}" data-stock="${stock}" ${sold?"disabled":""} onclick="selectVariantIcon(this,'size')">${esc(v.name)}</button>`;
     }).join("")}
   </div>
 </div>`:"";

 let qtyHtml=`<div class="qty-picker"><span>${currentLang==="ar"?"الكمية":"Quantity"}</span><div class="qty-controls"><button type="button" onclick="changeProductQty(this,-1)">−</button><input type="number" min="1" value="1" aria-label="Quantity"><button type="button" onclick="changeProductQty(this,1)">+</button></div></div>`;
 let btn=disabled?(currentLang==="ar"?"نفدت الكمية":"OUT OF STOCK"):(currentLang==="ar"?"أضف للسلة":"ADD TO CART");

 return `<article class="product-card ${disabled?"out":""}" data-id="${p.id}" onclick="openProductPage(${p.id},event)">${disabled?`<div class="sold-out-line">${currentLang==="ar"?"نفد المخزون":"SOLD OUT"}</div>`:""}
 ${!disabled?`<span class="badge">${currentLang==="ar"?"جديد":"NEW"}</span>`:""}
 <div class="product-image">${img}${gallery.length>1?`<div class="product-thumbs">${gallery.map((src,i)=>`<img src="${escAttr(src)}" class="${i===0?"active":""}" data-gallery-src="${escAttr(src)}" alt="">`).join("")}</div>`:""}</div>
 <h3>${esc(p.name)}</h3>
 ${colorHtml}${sizeHtml}${qtyHtml}
 <div>${p.old_price!=null?`<del class="old">${money(p.old_price)}</del>`:""}<span class="price">${money(p.price)}</span></div>
 <button ${disabled?"disabled":""} onclick="addToCart(${p.id},this)">${btn}</button>
 </article>`;
}
function render(){
 const groups={};products.forEach(p=>(groups[p.category]??=[]).push(p));
 $('#categoryNav').innerHTML=Object.keys(groups).map(c=>`<li><a href="#cat-${slug(c)}">${esc(c).toUpperCase()}</a></li>`).join('');
 $('#collection').innerHTML=Object.entries(groups).map(([cat,ps])=>`<section class="category" id="cat-${slug(cat)}"><h2>${esc(cat).toUpperCase()}</h2><div class="products">${ps.map(card).join('')}</div></section>`).join('')||`<div class="loading">${currentLang==='ar'?'لا توجد منتجات حاليًا.':'No products yet.'}</div>`;
 applyLanguage();
}
function refreshVariantStock(cardEl){
 const product=products.find(p=>p.id===Number(cardEl?.dataset.id));
 if(!product)return;
 cardEl.querySelectorAll(".variant-option").forEach(btn=>{
   const type=btn.closest(".color-options")?"colors":"sizes";
   const name=btn.dataset.value || btn.textContent.trim();
   const v=(product.variants?.[type]||[]).find(x=>x.name===name);
   const sold=v && Number(v.stock||0)<=0;
   btn.disabled=Boolean(sold);
   btn.classList.toggle("sold",Boolean(sold));
 });
}
function selectVariant(btn){btn.parentElement.querySelectorAll('.variant-option').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected')}

function getSelectedVariantStock(product){
  const color = window.selectedColor || selectedColor;
  const size = window.selectedSize || selectedSize;
  const combos = (product.variants && product.variants.combinations) || [];
  const found = combos.find(v => String(v.color) === String(color) && String(v.size) === String(size));
  return found ? Math.max(0, Number(found.stock || 0)) : 0;
}
function syncQuantityWithStock(product){
  const qty = document.querySelector('#quantity, .quantity-input, input[name="quantity"]');
  const plus = document.querySelector('.qty-plus, [data-qty="plus"], .quantity-plus');
  if(!qty) return;
  const stock = getSelectedVariantStock(product);
  qty.max = stock;
  let value = Math.max(1, parseInt(qty.value || '1',10) || 1);
  if(stock <= 0) value = 0;
  else if(value > stock) value = stock;
  qty.value = value;
  if(plus) plus.disabled = stock <= 0 || value >= stock;
  const minus = document.querySelector('.qty-minus, [data-qty="minus"], .quantity-minus');
  if(minus) minus.disabled = stock <= 0 || value <= 1;
}
function setupStockLimitedQuantity(product){
  const qty = document.querySelector('#quantity, .quantity-input, input[name="quantity"]');
  if(!qty) return;
  qty.addEventListener('input', ()=>syncQuantityWithStock(product));
  qty.addEventListener('change', ()=>syncQuantityWithStock(product));
  syncQuantityWithStock(product);
}

function addToCart(id,source){
 const cardEl=source ? source.closest(".product-card") : document.querySelector(`.product-card[data-id="${id}"]`);
 const product=products.find(p=>p.id===id);
 if(!product)return;

 const colorBtn=cardEl?.querySelector(".color-icons .color-icon.selected");
 const sizeBtn=cardEl?.querySelector(".size-icons .size-icon.selected");
 const hasColors=Boolean(product.variants?.colors?.length);
 const hasSizes=Boolean(product.variants?.sizes?.length);

 if(hasColors && !colorBtn){toast(currentLang==="ar"?"اختار اللون الأول":"Select a color first");return;}
 if(hasSizes && !sizeBtn){toast(currentLang==="ar"?"اختار المقاس الأول":"Select a size first");return;}

 const color=colorBtn?.dataset.value||"";
 const size=sizeBtn?.dataset.value||"";
 const available=getCombinationStock(product,color,size);

 const qtyInput=cardEl?.querySelector(".qty-picker input");
 const qty=Math.max(1,parseInt(qtyInput?.value||"1",10)||1);
 const key=`${id}|${color}|${size}`;
 const existing=cart.find(x=>x.key===key);
 const currentQty=existing?Number(existing.quantity||0):0;

 if(available<=0){toast(currentLang==="ar"?"هذا اللون والمقاس غير متوفرين":"This color and size are out of stock");return;}
 if(currentQty+qty>available){
   toast(currentLang==="ar"?`المتاح من هذا اللون والمقاس ${available} فقط`:`Only ${available} available for this color and size`);
   if(qtyInput)qtyInput.value=Math.max(1,available-currentQty);
   return;
 }
 if(existing)existing.quantity+=qty;
 else cart.push({key,product_id:id,quantity:qty,color,size});
 saveCart();renderCart();
 toast(currentLang==="ar"?"تمت إضافة المنتج إلى السلة":"Added to bag");
}
function syncCart(){cart=cart.filter(x=>products.some(p=>p.id===x.product_id));saveCart()}
function renderCart(){
 updateCartCount();const box=$('#cartItems');if(!box)return;
 if(!cart.length){box.innerHTML=`<p>${currentLang==='ar'?'سلة المشتريات فارغة.':'Your bag is empty.'}</p>`;$('#cartTotal').textContent='0.00 L.E';return}
 let total=0;box.innerHTML=cart.map((x,i)=>{const p=products.find(p=>p.id===x.product_id);if(!p)return '';const line=Number(p.price)*x.quantity;total+=line;return `<div class="cart-row"><div><b>${esc(p.name)}</b><small>${x.color?` · ${esc(x.color)}`:''}${x.size?` · ${esc(x.size)}`:''}</small></div><div>${money(line)} <button onclick="changeQty(${i},-1)">−</button><span>${x.quantity}</span><button onclick="changeQty(${i},1)">+</button><button onclick="removeCart(${i})">×</button></div></div>`}).join('');$('#cartTotal').textContent=money(total)
}
function changeQty(i,n){cart[i].quantity+=n;if(cart[i].quantity<=0)cart.splice(i,1);saveCart();renderCart()}
function removeCart(i){cart.splice(i,1);saveCart();renderCart()}

let shippingOptions=[];
let selectedShippingFee=0;
async function loadShipping(){
  try{
    const d=await api('/api/shipping');
    shippingOptions=d.options||[];
    const s=$('#customerGovernorate');
    if(!s)return;
    s.innerHTML='<option value="">'+(currentLang==='ar'?'اختر المحافظة':'Select governorate')+'</option>'+
      shippingOptions.map(x=>`<option value="${x.en}" data-fee="${x.fee}">${currentLang==='ar'?x.ar:x.en} — ${Number(x.fee).toFixed(0)} L.E</option>`).join('');
    const old=localStorage.getItem('veloce_governorate')||'';
    if(old && shippingOptions.some(x=>x.en===old))s.value=old;
    updateShipping();
  }catch(e){console.error(e)}
}
async function updateShipping(){
  const s=$('#customerGovernorate');
  if(!s)return;
  const opt=s.options[s.selectedIndex];
  selectedShippingFee=Number(opt?.dataset.fee||0);
  const fee=$('#shippingFee'); if(fee)fee.textContent=selectedShippingFee.toFixed(2)+' L.E';
  let sub=cart.reduce((a,x)=>a+Number(x.price||0)*Number(x.quantity||0),0);
  if(!sub && cart.length){
    try{
      const d=await api('/api/products');
      const prices=new Map((d.products||[]).map(x=>[Number(x.id),Number(x.price||0)]));
      sub=cart.reduce((a,x)=>a+(prices.get(Number(x.product_id))||0)*Number(x.quantity||0),0);
    }catch(e){console.error(e)}
  }
  const total=$('#cartTotal'); if(total)total.textContent=(sub+selectedShippingFee).toFixed(2)+' L.E';
}
async function checkout(){
  if(!cart.length)return toast(currentLang==='ar'?'السلة فارغة':'Your bag is empty');
  const name=($('#customerName')?.value||'').trim();
  const phone=($('#customerPhone')?.value||'').trim();
  const address=($('#customerAddress')?.value||'').trim();
  const gov=$('#customerGovernorate')?.value||'';
  if(!name || !phone || !address || !gov){
    return toast(currentLang==='ar'?'من فضلك اكتب الاسم ورقم الهاتف والعنوان واختر المحافظة أولاً':'Please enter your name, phone, address, and select a governorate first');
  }
  const ship=shippingOptions.find(x=>x.en===gov);
  if(!ship)return toast(currentLang==='ar'?'اختر المحافظة أولاً':'Please select a governorate');
  const customer={
    name:$('#customerName').value.trim(),
    phone:$('#customerPhone').value.trim(),
    address:$('#customerAddress').value.trim(),
    governorate:ship.en
  };
  try{
    const d=await api('/api/checkout',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        items:cart.map(x=>({product_id:x.product_id,quantity:x.quantity,color:x.color||'',size:x.size||''})),
        customer,
        governorate:ship.en,
        shipping_fee:ship.fee
      })
    });
    cart=[];saveCart();renderCart();
    $('#cartOverlay').classList.add('hidden');
    localStorage.removeItem('veloce_governorate');
    toast((currentLang==='ar'?'تم تأكيد الطلب #':'Order #')+d.order_id+(currentLang==='ar'?' بنجاح':' completed'));
    await load();
  }catch(e){toast(e.message)}
}
function search(){const q=$('#searchInput').value.trim().toLowerCase();$('#searchResults').innerHTML=products.filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)).map(p=>`<p><b>${esc(p.name)}</b> — ${money(p.price)}</p>`).join('')||'<p>No results</p>'}
window.addEventListener('DOMContentLoaded',()=>{updateCartCount();applyLanguage();load();$('#cartBtn').onclick=()=>{$('#cartOverlay').classList.remove('hidden');renderCart()};$('#searchBtn').onclick=()=>{$('#searchOverlay').classList.remove('hidden');$('#searchInput').focus()};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.add('hidden'));$('#checkoutBtn').onclick=checkout;;$('#customerGovernorate')?.addEventListener('change',()=>{localStorage.setItem('veloce_governorate',$('#customerGovernorate').value);updateShipping();});loadShipping();$('#searchInput').oninput=search;$('#langBtn').onclick=()=>{currentLang=currentLang==='en'?'ar':'en';localStorage.setItem('veloce_lang',currentLang);applyLanguage();render();renderCart();loadShipping();updateShipping()}});

function selectVariant(btn,type){
 const group=btn.closest(".variant-options");
 if(!group)return;
 group.querySelectorAll(".variant-option").forEach(x=>x.classList.remove("selected"));
 btn.classList.add("selected");
 const cardEl=btn.closest(".product-card");
 if(cardEl) cardEl.querySelector(".qty-picker input").value=1;
}


function getCombinationStock(product,color,size){
 const combos=product?.variants?.combinations||[];
 if(color && size && combos.length){
   const c=combos.find(x=>String(x.color)===String(color)&&String(x.size)===String(size));
   return c ? Number(c.stock||0) : 0;
 }
 if(color && !size){
   const vals=(product?.variants?.colors||[]).filter(x=>String(x.name)===String(color));
   return vals.length ? Number(vals[0].stock||0) : 0;
 }
 if(size && !color){
   const vals=(product?.variants?.sizes||[]).filter(x=>String(x.name)===String(size));
   return vals.length ? Number(vals[0].stock||0) : 0;
 }
 return Number(product?.stock||0);
}
function getSelectedAvailable(cardEl){
 const product=products.find(p=>p.id===Number(cardEl?.dataset.id));
 if(!product)return 0;
 const color=cardEl?.querySelector(".color-icons .color-icon.selected")?.dataset.value||"";
 const size=cardEl?.querySelector(".size-icons .size-icon.selected")?.dataset.value||"";
 return getCombinationStock(product,color,size);
}
function syncQtyMax(cardEl){
 const input=cardEl?.querySelector(".qty-picker input");
 if(!input)return;
 const max=getSelectedAvailable(cardEl);
 input.max=max>0?max:1;
 const value=Math.max(1,Math.min(parseInt(input.value||"1",10)||1,max||1));
 input.value=value;
}
function variantDropdownChanged(select){
 const cardEl=select.closest(".product-card");
 if(!cardEl)return;
 const qty=cardEl.querySelector(".qty-picker input");
 if(qty)qty.value=1;
 syncQtyMax(cardEl);
}
function refreshCombinationState(cardEl){
 const product=products.find(p=>p.id===Number(cardEl?.dataset.id));
 if(!product)return;
 const color=cardEl.querySelector(".color-icons .color-icon.selected")?.dataset.value||"";
 const size=cardEl.querySelector(".size-icons .size-icon.selected")?.dataset.value||"";
 if(color && size && (product.variants?.combinations||[]).length){
   const stock=getCombinationStock(product,color,size);
   const q=cardEl.querySelector(".qty-picker input");
   if(q){q.max=Math.max(1,stock);q.value=Math.min(Math.max(1,Number(q.value)||1),Math.max(1,stock));}
 }
}

function updateCombinationAvailability(cardEl){
 const product=products.find(p=>p.id===Number(cardEl?.dataset.id));
 if(!product)return;
 const combos=product.variants?.combinations||[];
 if(!combos.length)return;
 const color=cardEl.querySelector(".color-icons .color-icon.selected")?.dataset.value||"";
 const size=cardEl.querySelector(".size-icons .size-icon.selected")?.dataset.value||"";
 if(!color || !size)return;
 const stock=getCombinationStock(product,color,size);
 const add=cardEl.querySelector("button[onclick^="+"\"addToCart\""+"]");
 if(add){
   add.disabled=stock<=0;
   add.classList.toggle("out",stock<=0);
   add.textContent=stock<=0?(currentLang==="ar"?"نفدت هذه التركيبة":"COMBINATION OUT OF STOCK"):(currentLang==="ar"?"أضف للسلة":"ADD TO CART");
 }
}
function selectVariantIcon(btn,type){
 if(btn.disabled)return;
 const group=btn.parentElement;
 group.querySelectorAll("button").forEach(x=>x.classList.remove("selected"));
 btn.classList.add("selected");
 const cardEl=btn.closest(".product-card");
 if(cardEl){
   const input=cardEl.querySelector(".qty-picker input");
   if(input)input.value=1;
   if(typeof syncQtyMax==="function")syncQtyMax(cardEl);
   refreshCombinationState(cardEl);
   updateCombinationAvailability(cardEl);
 }
}
function changeProductQty(btn,delta){
 const cardEl=btn.closest(".product-card");
 const input=cardEl?.querySelector(".qty-picker input");
 if(!input)return;
 const max=getSelectedAvailable(cardEl);
 let value=Math.max(1,parseInt(input.value||"1",10)||1);
 value=Math.max(1,Math.min(value+delta,max||1));
 input.max=max>0?max:1;
 input.value=value;
}
document.addEventListener("input",function(e){
 if(!e.target.matches(".qty-picker input"))return;
 const cardEl=e.target.closest(".product-card");
 if(!cardEl)return;
 const max=getSelectedAvailable(cardEl);
 let value=parseInt(e.target.value||"1",10)||1;
 e.target.value=Math.max(1,Math.min(value,max||1));
 e.target.max=max>0?max:1;
});

document.addEventListener("click",function(e){
 const thumb=e.target.closest("[data-gallery-src]");
 if(!thumb)return;
 const box=thumb.closest(".product-image");
 const main=box?.querySelector(".product-main-photo");
 if(main){main.src=thumb.dataset.gallerySrc}
 box?.querySelectorAll(".product-thumbs img").forEach(x=>x.classList.remove("active"));
 thumb.classList.add("active");
});


/* PRODUCT_CLICK_AND_BAG_FINAL */
document.addEventListener("click", function (e) {
  const card = e.target.closest(".product-card");
  if (!card) return;

  // Never hijack controls inside the card.
  if (e.target.closest("button, input, select, textarea, a, .product-thumbs, .qty-picker")) return;

  const id = card.dataset.id || card.getAttribute("data-product-id");
  if (!id) return;

  e.preventDefault();
  e.stopImmediatePropagation();
  window.location.href = "/product.html?id=" + encodeURIComponent(id);
}, true);
const products = [
  {
    id: 1,
    name: "Classic T-Shirt",
    category: "T-Shirts",
    price: 600,
    oldPrice: 800,
    image: "assets/tshirt.jpg",
    colors: ["Black", "White"],
    sizes: ["M", "L"],
    description: "Premium cotton t-shirt..."
  }
];