let lang=localStorage.getItem("veloce_lang")||"en";
let cart=JSON.parse(localStorage.getItem("veloce_cart")||"[]");
let p=null;

const $=s=>document.querySelector(s);
const money=n=>Number(n||0).toFixed(2)+" L.E";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url,opts){
  const r=await fetch(url,opts);
  const text=await r.text();
  let d;
  try{d=JSON.parse(text)}catch(e){throw new Error("Server returned invalid response")}
  if(!r.ok||!d.success) throw new Error(d.message||"Request failed");
  return d;
}
function tr(){
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  document.querySelectorAll("[data-en][data-ar]").forEach(e=>e.textContent=lang==="ar"?e.dataset.ar:e.dataset.en);
  const b=$("#langBtn"); if(b)b.textContent=lang==="ar"?"English":"عربي";
}
function stock(color,size){
  const combos=p?.variants?.combinations||[];
  if(combos.length){
    // Exact pair when both are selected.
    if(color && size){
      const v=combos.find(x=>x.color===color && x.size===size);
      return Number(v?.stock||0);
    }
    // If only a color is selected, return the stock for each size separately
    // through the helper below; total is only used for quantity fallback.
    if(color) return combos.filter(x=>x.color===color).reduce((a,x)=>a+Number(x.stock||0),0);
    if(size) return combos.filter(x=>x.size===size).reduce((a,x)=>a+Number(x.stock||0),0);
    return combos.reduce((a,x)=>a+Number(x.stock||0),0);
  }
  if(color){
    const v=(p?.variants?.colors||[]).find(x=>x.name===color);
    return Number(v?.stock||0);
  }
  if(size){
    const v=(p?.variants?.sizes||[]).find(x=>x.name===size);
    return Number(v?.stock||0);
  }
  return Number(p?.stock||0);
}
function variantStock(color,size){
  const combos=p?.variants?.combinations||[];
  if(combos.length){
    const v=combos.find(x=>x.color===color && x.size===size);
    return Number(v?.stock||0);
  }
  return stock(color,size);
}
function refreshVariantButtons(){
  if(!p)return;
  const selectedColor=$(".detail-color.selected")?.dataset.v||"";
  const selectedSize=$(".detail-size.selected")?.dataset.v||"";

  // Sizes are available only for the currently selected color.
  document.querySelectorAll(".detail-size").forEach(btn=>{
    const size=btn.dataset.v;
    const available=selectedColor
      ? variantStock(selectedColor,size)
      : (p.variants?.sizes||[]).find(x=>x.name===size)?.stock||0;
    btn.disabled=Number(available)<=0;
    btn.classList.toggle("variant-sold",Number(available)<=0);
    if(btn.disabled && btn.classList.contains("selected")) btn.classList.remove("selected");
  });

  // Colors are available for the currently selected size.
  document.querySelectorAll(".detail-color").forEach(btn=>{
    const color=btn.dataset.v;
    const available=selectedSize
      ? variantStock(color,selectedSize)
      : (p.variants?.colors||[]).find(x=>x.name===color)?.stock||0;
    btn.disabled=Number(available)<=0;
    btn.classList.toggle("variant-sold",Number(available)<=0);
    if(btn.disabled && btn.classList.contains("selected")) btn.classList.remove("selected");
  });
}

function syncQty(){
  if(!p)return;
  const color=$(".detail-color.selected")?.dataset.v||"";
  const size=$(".detail-size.selected")?.dataset.v||"";
  const n=stock(color,size);
  const q=$("#qty"),plus=$("#plus");
  if(!q)return;
  q.max=String(Math.max(1,n));
  q.value=n?Math.min(Math.max(1,Number(q.value)||1),n):0;
  if(plus)plus.disabled=!n||Number(q.value)>=n;
}
function choose(btn){
  btn.parentElement.querySelectorAll("button").forEach(x=>x.classList.remove("selected"));
  btn.classList.add("selected");
  refreshVariantButtons();
  syncQty();
}
function changeQty(delta){
  const q=$("#qty");
  if(!q)return;
  const color=$(".detail-color.selected")?.dataset.v||"";
  const size=$(".detail-size.selected")?.dataset.v||"";
  const max=stock(color,size);
  q.value=Math.min(Math.max(1,(Number(q.value)||1)+delta),Math.max(1,max));
  syncQty();
}
function count(){
  const el=$("#cartCount");
  if(el)el.textContent=cart.reduce((a,x)=>a+Number(x.quantity||0),0);
}
function add(){
  const color=$(".detail-color.selected")?.dataset.v||"";
  const size=$(".detail-size.selected")?.dataset.v||"";
  const available=stock(color,size);
  const q=Math.max(1,Number($("#qty")?.value||1));
  if((p.variants?.colors||[]).length&&!color)return alert(lang==="ar"?"اختر اللون":"Select color");
  if((p.variants?.sizes||[]).length&&!size)return alert(lang==="ar"?"اختر المقاس":"Select size");
  if(!available||q>available)return alert(lang==="ar"?`المتاح ${available} فقط`:`Only ${available} available`);
  const key=`${p.id}|${color}|${size}`;
  const old=cart.find(x=>x.key===key);
  if(old){
    if(old.quantity+q>available)return alert(lang==="ar"?`المتاح ${available} فقط`:`Only ${available} available`);
    old.quantity+=q;
  }else{
    cart.push({key,product_id:p.id,quantity:q,color,size});
  }
  localStorage.setItem("veloce_cart",JSON.stringify(cart));
  count();
  alert(lang==="ar"?"تمت الإضافة للسلة":"Added to bag");
}
function showError(msg){
  const el=$("#productDetail");
  if(el)el.innerHTML=`<p>${esc(msg)}</p>`;
}
async function load(){
  const id=new URLSearchParams(location.search).get("id");
  if(!id){showError(lang==="ar"?"المنتج غير موجود":"Product not found");return}
  try{
    const d=await api("/api/products/"+encodeURIComponent(id));
    p=d.product;
    const imgs=Array.isArray(p.images)&&p.images.length?p.images:[p.image].filter(Boolean);
    const colors=p.variants?.colors||[];
    const sizes=p.variants?.sizes||[];
    const detail=$("#productDetail");
    if(!detail)throw new Error("Product detail container is missing");

    detail.innerHTML=`
      <div class="detail-grid">
        <div>
          <div class="detail-main"><img id="mainImg" src="${esc(imgs[0]||"")}" alt="${esc(p.name)}"></div>
          <div class="detail-thumbs">${imgs.map((x,i)=>`<button type="button" class="${i===0?"selected":""}" data-img="${esc(x)}"><img src="${esc(x)}" alt=""></button>`).join("")}</div>
        </div>
        <div class="detail-info">
          <p>${esc(p.category)}</p>
          <h1>${esc(p.name)}</h1>
          <div class="price">${money(p.price)}</div><div class="product-description">${esc(p.description||"")}</div>
          ${colors.length?`<div class="detail-choice"><b>${lang==="ar"?"اللون":"Color"}</b><div>${colors.map(x=>`<button type="button" class="detail-color ${Number(x.stock)<=0?"variant-sold":""}" data-v="${esc(x.name)}" ${Number(x.stock)<=0?"disabled":""}>${esc(x.name)}</button>`).join("")}</div></div>`:""}
          ${sizes.length?`<div class="detail-choice"><b>${lang==="ar"?"المقاس":"Size"}</b><div>${sizes.map(x=>`<button type="button" class="detail-size ${Number(x.stock)<=0?"variant-sold":""}" data-v="${esc(x.name)}" ${Number(x.stock)<=0?"disabled":""}>${esc(x.name)}</button>`).join("")}</div></div>`:""}
          <div class="qty-picker"><span>${lang==="ar"?"الكمية":"Quantity"}</span><div class="qty-controls"><button type="button" id="minus">−</button><input id="qty" type="number" min="1" value="1"><button type="button" id="plus">+</button></div></div>
          <button type="button" class="checkout" id="addBtn">${lang==="ar"?"أضف للسلة":"ADD TO CART"}</button>
        </div>
      </div>`;

    detail.querySelectorAll(".detail-color,.detail-size").forEach(b=>b.addEventListener("click",()=>choose(b)));
    detail.querySelectorAll(".detail-thumbs button").forEach(b=>b.addEventListener("click",()=>{$("#mainImg").src=b.dataset.img}));
    $("#minus").onclick=()=>changeQty(-1);
    $("#plus").onclick=()=>changeQty(1);
    $("#qty").oninput=syncQty;
    $("#addBtn").onclick=add;

    const all=await api("/api/products");
    const suggestions=(all.products||[]).filter(x=>x.id!==p.id&&x.category===p.category).slice(0,4);
    const box=$("#suggestedProducts");
    if(box)box.innerHTML=suggestions.map(x=>`<article class="product-card" data-id="${x.id}"><div class="product-image"><img class="product-main-photo" src="${esc(x.images?.[0]||x.image||"")}"></div><h3>${esc(x.name)}</h3><span class="price">${money(x.price)}</span></article>`).join("");
    box?.querySelectorAll(".product-card").forEach(card=>card.addEventListener("click",()=>location.href="/product.html?id="+card.dataset.id));
    tr();count();refreshVariantButtons();syncQty();
  }catch(e){
    console.error("Product page error:",e);
    showError(lang==="ar"?"تعذر تحميل المنتج":"Could not load product");
  }
}
document.addEventListener("DOMContentLoaded",()=>{
  const langBtn=$("#langBtn");
  if(langBtn)langBtn.onclick=()=>{lang=lang==="en"?"ar":"en";localStorage.setItem("veloce_lang",lang);location.reload()};
  const cartBtn=$("#cartBtn");
  if(cartBtn)cartBtn.onclick=()=>location.href="/#bag";
  load();
});
