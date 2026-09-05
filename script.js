/* Homepage-only behavior. Shared navigation/search behavior lives in meteorink-app.js. */
(function(){
  const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pageState={trending:1,authors:1,latest:1,fanfic:1};
  function pagerHtml(total,current){
    if(total<=1)return '';
    const max=7,half=3;let first=Math.max(1,current-half),last=Math.min(total,first+max-1);first=Math.max(1,last-max+1);
    let h='<nav class="asset-pagination" aria-label="Pages"><button type="button" data-page="'+(current-1)+'" '+(current===1?'disabled':'')+'>Previous</button>';
    for(let i=first;i<=last;i++)h+='<button type="button" class="'+(i===current?'active':'')+'" data-page="'+i+'" aria-current="'+(i===current?'page':'false')+'">'+i+'</button>';
    h+='<span>Page '+current+' of '+total+'</span><button type="button" data-page="'+(current+1)+'" '+(current===total?'disabled':'')+'>Next</button></nav>';return h;
  }
  function mountPager(gridId,total,current,key,renderFn){
    const grid=document.getElementById(gridId);if(!grid)return;
    let pager=document.getElementById(gridId+'Pagination');
    if(!pager){pager=document.createElement('div');pager.id=gridId+'Pagination';grid.parentNode.insertBefore(pager,grid.nextSibling);}
    pager.innerHTML=pagerHtml(total,current);
    pager.querySelectorAll('button[data-page]').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;pageState[key]=Number(b.dataset.page);renderFn();window.scrollTo({top:grid.getBoundingClientRect().top+window.scrollY-110,behavior:'smooth'});}));
  }

  // Hero meteor shower.
  const layer=qs('#meteorLayer');
  if(layer){for(let i=0;i<24;i++){const m=document.createElement('span');m.className='meteor';m.style.setProperty('--x',`${Math.random()*92-4}%`);m.style.setProperty('--w',`${55+Math.random()*110}px`);m.style.setProperty('--r',`${36+Math.random()*13}deg`);m.style.setProperty('--d',`${3.5+Math.random()*4.5}s`);m.style.setProperty('--delay',`${-Math.random()*7}s`);layer.appendChild(m);}}

  function novelCard(n,metric){
    const genres=Array.isArray(n.genres)&&n.genres.length?n.genres:String(n.genre||'NOVEL').split(',').map(x=>x.trim()).filter(Boolean);
    const visibleTags=genres.slice(0,3),more=Math.max(0,genres.length-visibleTags.length);
    return `<article class="novel-showcase-card" data-id="${esc(n.id)}">
      <div class="novel-showcase-cover">${n.cover?`<img src="${esc(n.cover)}" alt="${esc(n.title||'Novel cover')}">`:'✦'}
        <span class="novel-showcase-badge">${esc(n.genre||'NOVEL')}</span>
        
      </div>
      <div class="novel-showcase-body">
        <h3 class="novel-showcase-title">${esc(n.title||'Untitled Novel')}</h3>
        <p class="novel-showcase-author">${esc(n.authorName||'Unknown Author')}${MeteorInkData.isAuthorVerified&&MeteorInkData.isAuthorVerified(n.authorId,n.authorName)?`<img class="novel-showcase-verified" src="${MeteorInkData.verificationBadgeAsset(n.authorId,n.authorName)}" alt="Verified Author" title="Verified Author">`:''}</p>
        <p class="novel-showcase-desc">${esc(n.description||'A new story awaits.')}</p>
        <div class="novel-showcase-tags">${visibleTags.map(g=>`<span class="novel-showcase-tag">${esc(g)}</span>`).join('')}${more?`<span class="novel-showcase-tag more">+${more}</span>`:''}</div>
        <div class="novel-showcase-stats"><div class="novel-showcase-stat"><strong>${Number(n.chapters||0).toLocaleString()}</strong><span>Chapters</span></div><div class="novel-showcase-stat"><strong>${Number(metric??n.views??0).toLocaleString()}</strong><span>Views</span></div><div class="novel-showcase-stat"><strong>${Number(n.rating||0).toFixed(1)}</strong><span>Rating</span></div></div>
        <button class="novel-showcase-read" type="button" data-read-id="${esc(n.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22V4.5Zm0 0V19a2.5 2.5 0 0 1 2.5-2.5H19"></path></svg>Read Now</button>
      </div>
    </article>`;
  }
  function authorAvatarUrl(a){const m=String(a?.id||a?.name||'').match(/(\d+)$/);const n=m?((Number(m[1])-1)%70)+1:((Array.from(String(a?.name||'')).reduce((s,c)=>s+c.charCodeAt(0),0))%70)+1;return `https://i.pravatar.cc/300?img=${n}`;}
  function authorCard(a,rank=0){return `<article class="dynamic-author-card" data-author-id="${esc(a.id)}"><div class="dynamic-avatar"><img src="${authorAvatarUrl(a)}" alt="${esc(a.name||'Author')} profile" loading="lazy"></div><div class="dynamic-author-main"><h3>${esc(a.name||'Unnamed Author')}${MeteorInkData.isAuthorVerified&&MeteorInkData.isAuthorVerified(a.id,a.name)?`<img class="author-verified-badge" src="${MeteorInkData.verificationBadgeAsset(a.id,a.name)}" alt="Verified Author" title="Verified Author">`:''}</h3><p>${Number(a.followers||0).toLocaleString()} followers</p></div>${rank?`<div class="author-rank-mini"><strong>#${rank}</strong></div>`:''}</article>`;}

  function renderTrending(period='today'){
    const host=qs('#emptyLibrary');if(!host||!window.MeteorInkData)return;
    const baseNovels=MeteorInkData.getCatalogNovels?MeteorInkData.getCatalogNovels():MeteorInkData.getNovels(); const windows={today:86400000,'7days':7*86400000,month:30*86400000}; const ms=windows[period]||windows.today; const all=baseNovels.map(n=>({...n,rankingViews:Array.isArray(n.viewEvents)?n.viewEvents.filter(t=>Date.now()-new Date(t).getTime()<=ms).length:Number(n.views||0)})).sort((a,b)=>b.rankingViews-a.rankingViews);const per=6;const total=Math.max(1,Math.ceil(all.length/per));pageState.trending=Math.min(pageState.trending,total);
    const items=all.slice((pageState.trending-1)*per,pageState.trending*per);let grid=document.getElementById('dynamicTrendingGrid');
    if(!grid){grid=document.createElement('div');grid.id='dynamicTrendingGrid';grid.className='dynamic-content-grid';host.parentNode.insertBefore(grid,host);}
    if(!all.length){grid.innerHTML='';grid.hidden=true;grid.style.display='none';host.hidden=false;host.style.display='';document.getElementById('dynamicTrendingGridPagination')?.remove();return;}
    host.hidden=true;host.style.display='none';grid.hidden=false;grid.style.display='';
    host.hidden=true;host.style.display='none';grid.hidden=false;grid.style.display='';grid.innerHTML=items.map(n=>novelCard(n,n.rankingViews)).join('');mountPager('dynamicTrendingGrid',total,pageState.trending,'trending',()=>renderTrending(period));
  }
  function renderAuthors(period='7days'){
    const host=qs('.top-authors-empty');if(!host||!window.MeteorInkData)return;
    const all=period==='goat'
      ? (MeteorInkData.catalogTopAuthors?MeteorInkData.catalogTopAuthors('goat'):MeteorInkData.topAuthors('goat'))
      : (MeteorInkData.catalogTopAuthors?MeteorInkData.catalogTopAuthors('views'):MeteorInkData.topAuthors(period));
    const per=9;const total=1;pageState.authors=1;
    const items=all.slice(0,per);let grid=document.getElementById('dynamicAuthorsGrid');
    if(!grid){grid=document.createElement('div');grid.id='dynamicAuthorsGrid';grid.className='dynamic-author-grid';host.parentNode.insertBefore(grid,host);}
    if(!all.length){grid.innerHTML='';grid.hidden=true;grid.style.display='none';host.hidden=false;host.style.display='';document.getElementById('dynamicAuthorsGridPagination')?.remove();return;}host.hidden=true;host.style.display='none';grid.hidden=false;grid.style.display='';grid.innerHTML=items.map((a,i)=>authorCard(a,(pageState.authors-1)*per+i+1)).join('');document.getElementById('dynamicAuthorsGridPagination')?.remove();
  }
  function renderLatest(){
    const host=qs('.latest-arrivals-empty');if(!host||!window.MeteorInkData)return;
    const all=(MeteorInkData.getCatalogNovels?MeteorInkData.getCatalogNovels():MeteorInkData.latest()).slice().sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));const per=4;const total=Math.max(1,Math.ceil(all.length/per));pageState.latest=Math.min(pageState.latest,total);
    const items=all.slice((pageState.latest-1)*per,pageState.latest*per);let grid=document.getElementById('dynamicLatestGrid');
    if(!grid){grid=document.createElement('div');grid.id='dynamicLatestGrid';grid.className='dynamic-content-grid latest-grid';host.parentNode.insertBefore(grid,host);}
    if(!all.length){grid.innerHTML='';grid.hidden=true;grid.style.display='none';host.hidden=false;host.style.display='';document.getElementById('dynamicLatestGridPagination')?.remove();return;}host.hidden=true;host.style.display='none';grid.hidden=false;grid.style.display='';grid.innerHTML=items.map(n=>novelCard(n,n.views)).join('');mountPager('dynamicLatestGrid',total,pageState.latest,'latest',renderLatest);
  }


  function isFanFic(n){
    const genre=String(n.genre||'').toLowerCase().replace(/[–—]/g,'-');
    return n.isFanFic===true || String(n.type||'').toLowerCase()==='fanfic' || /fan[- ]?fic|fan fiction/.test(genre);
  }

  function renderRandomNovels(){
    const panel=qs('#random-novels'),empty=qs('#randomNovelsEmpty'),grid=qs('#randomNovelsGrid');
    if(!panel||!empty||!grid||!window.MeteorInkData)return;
    const session=MeteorInkData.getSession?.();
    // Random Novels is a logged-in reader feature. Keep the entire panel out of the DOM flow for guests.
    if(!session){
      panel.hidden=true;
      panel.style.display='none';
      return;
    }
    panel.hidden=false;
    panel.style.display='';
    const catalog=MeteorInkData.getCatalogNovels?MeteorInkData.getCatalogNovels():[];
    const items=catalog.slice().sort(()=>Math.random()-0.5).slice(0,4);
    if(!items.length){
      empty.hidden=false;
      empty.style.display='';
      grid.hidden=true;
      grid.style.display='none';
      grid.innerHTML='';
      return;
    }
    empty.hidden=true;
    empty.style.display='none';
    grid.hidden=false;
    grid.style.display='';
    grid.innerHTML=items.map(n=>novelCard(n,n.views)).join('');
  }

  function renderFanFic(sort='popular'){
    const box=qs('#fan-fic-novels .fanfic-definition');
    const empty=qs('#fanficEmptyState');
    const grid=qs('#fanficGrid');
    if(!box||!empty||!grid||!window.MeteorInkData)return;
    let items=MeteorInkData.getNovels().filter(isFanFic);
    if(sort==='latest'){
      items.sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
    }else{
      items.sort((a,b)=>Number(b.views||0)-Number(a.views||0));
    }
    const per=4;const total=Math.max(1,Math.ceil(items.length/per));pageState.fanfic=Math.min(pageState.fanfic,total);
    const pageItems=items.slice((pageState.fanfic-1)*per,pageState.fanfic*per);
    if(!items.length){empty.hidden=false;grid.hidden=true;grid.innerHTML='';document.getElementById('fanficGridPagination')?.remove();return;}
    empty.hidden=true;grid.hidden=false;grid.innerHTML=pageItems.map(n=>novelCard(n,n.views)).join('');mountPager('fanficGrid',total,pageState.fanfic,'fanfic',()=>renderFanFic(sort));
  }

  function bind(){
    qsa('.period-btn').forEach(b=>b.addEventListener('click',()=>{qsa('.period-btn').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});b.classList.add('active');b.setAttribute('aria-selected','true');pageState.trending=1;renderTrending(b.dataset.period)}));
    qsa('.author-period-btn').forEach(b=>b.addEventListener('click',()=>{qsa('.author-period-btn').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});b.classList.add('active');b.setAttribute('aria-selected','true');pageState.authors=1;renderAuthors(b.dataset.authorPeriod)}));
    qsa('.fanfic-tab').forEach(b=>b.addEventListener('click',()=>{qsa('.fanfic-tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});b.classList.add('active');b.setAttribute('aria-selected','true');pageState.fanfic=1;renderFanFic(b.dataset.fanficSort)}));
    const randomRefresh=qs('#randomNovelsRefresh');
    if(randomRefresh)randomRefresh.addEventListener('click',renderRandomNovels);
    const earlyCard=document.querySelector('#community .early-card:not(#authors)'); if(earlyCard){const authors=MeteorInkData.getCatalogAuthors?MeteorInkData.getCatalogAuthors():MeteorInkData.getAuthors(); earlyCard.hidden=authors.length>0;}
    renderTrending();renderAuthors();renderLatest();renderFanFic();renderRandomNovels();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();


/* Embedded Authors view behavior. */
window.renderMeteorInkAuthors=function(){
  const data=window.MeteorInkData;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));
  const card=(a,stat,label,rank=0)=>{
    const novels=(data.getCatalogNovels?data.getCatalogNovels():data.getNovels()).filter(n=>n.authorId===a.id);
    const totalReads=novels.reduce((sum,n)=>sum+Number(n.views||0),0);
    const profile=a.profileImage||a.avatar||a.avatarUrl||a.profilePhoto||(()=>{const m=String(a?.id||a?.name||'').match(/(\d+)$/);const n=m?((Number(m[1])-1)%70)+1:((Array.from(String(a?.name||'')).reduce((sum,c)=>sum+c.charCodeAt(0),0))%70)+1;return `https://i.pravatar.cc/300?img=${n}`;})();
    const avatar=`<img src="${esc(profile)}" alt="${esc(a.name||'Author')} profile" loading="lazy">`;
    const isGoatRankOne=rank===1 && label.toLowerCase().includes('goat');
    const isGoatRankTwo=rank===2 && label.toLowerCase().includes('goat');
    const isGoatRankThree=rank===3 && label.toLowerCase().includes('goat');
    const quote=a.quote||a.tagline||a.bio||'We don’t just write stories, we build worlds.';
    const rankLabel=label.includes('GOAT')?'ALL TIME':label.includes('Emerging')?'EMERGING':'THIS WEEK';
    return `<article class="author-card">
      <div class="author-avatar${isGoatRankOne?' goat-rank-one-avatar':isGoatRankTwo?' goat-rank-two-avatar':isGoatRankThree?' goat-rank-three-avatar':''}">${avatar}${isGoatRankOne?'<img class="goat-rank-one-frame" src="assets/goat-number-one-frame.png" alt="GOAT #1 frame" aria-hidden="true">':isGoatRankTwo?'<img class="goat-rank-two-frame" src="assets/goat-number-two-frame.png" alt="GOAT #2 frame" aria-hidden="true">':isGoatRankThree?'<img class="goat-rank-three-frame" src="assets/goat-number-three-frame.png" alt="GOAT #3 frame" aria-hidden="true">':''}</div>
      <div class="author-card-main">
        <h3>${esc(a.name||"Unnamed Author")}${data.isAuthorVerified&&data.isAuthorVerified(a.id,a.name)?`<img class="author-verified-badge" src="${data.verificationBadgeAsset(a.id,a.name)}" alt="Verified Author" title="Verified Author">`:''}</h3>
        <div class="author-card-role-row"><div class="author-card-role">${esc(label)}</div><span class="author-card-followers">${Number(a.followers||0).toLocaleString()} followers</span></div>
        <p class="author-card-quote">“${esc(quote)}”</p>
        <div class="author-card-stats">
          <div><strong>${novels.length.toLocaleString()}</strong><span>Novels</span></div>
          <div><strong>${totalReads.toLocaleString()}</strong><span>Total Reads</span></div>
        </div>
      </div>
      ${rank?`<div class="author-rank-badge"><strong>#${rank}</strong><span>TOP AUTHOR</span><small>${rankLabel}</small></div>`:''}
    </article>`;
  };
  const empty=(title,text)=>`<div class="author-empty"><strong>${title}</strong>${text}</div>`;
  const pagerHtml=(total,current)=>{if(total<=1)return "";const max=7,half=3;let first=Math.max(1,current-half),last=Math.min(total,first+max-1);first=Math.max(1,last-max+1);let h=`<nav class="asset-pagination" aria-label="Pages"><button type="button" data-page="${current-1}" ${current===1?"disabled":""}>Previous</button>`;for(let i=first;i<=last;i++)h+=`<button type="button" class="${i===current?"active":""}" data-page="${i}" aria-current="${i===current?"page":"false"}">${i}</button>`;return h+`<span>Page ${current} of ${total}</span><button type="button" data-page="${current+1}" ${current===total?"disabled":""}>Next</button></nav>`};
  const state={goat:window.__authorGoatPage||1,period:window.__authorPeriodPage||1,emerging:window.__authorEmergingPage||1};
  const draw=(id,items,per,page,key,make,emptyHtml)=>{
    const grid=document.getElementById(id), total=Math.max(1,Math.ceil(items.length/per));page=Math.min(page,total);if(!grid)return;
    grid.innerHTML=items.length?items.slice((page-1)*per,page*per).map((item,i)=>make(item,(page-1)*per+i+1)).join(""):emptyHtml;
    const old=document.getElementById(id+'Pagination');old?.remove();
    if(items.length>per){const pager=document.createElement('div');pager.id=id+'Pagination';pager.className='asset-pagination-wrap';pager.innerHTML=pagerHtml(total,page);grid.parentNode.insertBefore(pager,grid.nextSibling);pager.querySelectorAll('button[data-page]').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;const n=Number(b.dataset.page);if(key==='goat')window.__authorGoatPage=n;if(key==='period')window.__authorPeriodPage=n;if(key==='emerging')window.__authorEmergingPage=n;window.renderMeteorInkAuthors();window.scrollTo({top:grid.getBoundingClientRect().top+window.scrollY-110,behavior:'smooth'});}));}
  };
  const renderGoat=()=>draw('goatGrid',(data.catalogTopAuthors?data.catalogTopAuthors('goat'):data.topAuthors('goat')).slice(0,20),8,state.goat,'goat',(a,rank)=>card(a,`${Number(a.followers||0).toLocaleString()} followers`,'GOAT • All-time',rank),empty('No GOAT authors yet.','The hall of legends is waiting for its first names.'));
  const renderPeriod=period=>draw('periodGrid',(data.catalogTopAuthors?data.catalogTopAuthors('views'):data.topAuthors(period)),8,state.period,'period',(a,rank)=>card(a,`${Number(a.rankingViews||0).toLocaleString()} novel views`,'Ranked by novel views',rank),empty('No ranked authors yet.','Published stories will determine this ranking automatically.'));
  const renderEmerging=()=>{const now=Date.now(),month=30*24*60*60*1000,authors=data.getCatalogAuthors?data.getCatalogAuthors():data.getAuthors(),novels=data.getCatalogNovels?data.getCatalogNovels():data.getNovels();const qualifying=authors.filter(a=>{const created=new Date(a.createdAt||a.profileCreatedAt||0).getTime();return created&&now-created<=month&&novels.some(n=>n.authorId===a.id&&Number(n.views||0)>2000);});draw('emergingGrid',qualifying,8,state.emerging,'emerging',(a,rank)=>{const n=novels.filter(x=>x.authorId===a.id).sort((x,y)=>Number(y.views||0)-Number(x.views||0))[0];return card(a,`${Number(n.views||0).toLocaleString()} views`,'Emerging • New profile',rank);},empty('No emerging authors yet.','New voices crossing 2,000 views will appear here automatically.'));};
  document.querySelectorAll('.author-tab').forEach(btn=>{if(btn.dataset.boundPager)return;btn.dataset.boundPager='1';btn.addEventListener('click',()=>{document.querySelectorAll('.author-tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');window.__authorPeriodPage=1;renderPeriod(btn.dataset.period);});});
  renderGoat();renderPeriod(document.querySelector('.author-tab.active')?.dataset.period||'7days');renderEmerging();
};


/* Legal & policy panel. */
(function(){
  const modal=document.getElementById('legalModal');
  if(!modal)return;
  const title=document.getElementById('legalModalTitle');
  const close=document.getElementById('legalClose');
  const labels={terms:'Terms of Service',privacy:'Privacy Policy',copyright:'Copyright & Takedown Policy',community:'Community Guidelines',content:'Content Policy',authors:'Author Agreement',contact:'Contact & Report Abuse'};
  function openLegal(key='terms'){
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('legal-open');
    document.querySelectorAll('[data-legal-tab]').forEach(b=>b.classList.toggle('active',b.dataset.legalTab===key));
    document.querySelectorAll('[data-legal-doc]').forEach(d=>d.hidden=d.dataset.legalDoc!==key);
    if(title)title.textContent=labels[key]||labels.terms;
  }
  function closeLegal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('legal-open');}
  document.querySelectorAll('[data-legal-open]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openLegal(a.dataset.legalOpen)}));
  document.querySelectorAll('[data-legal-tab]').forEach(b=>b.addEventListener('click',()=>openLegal(b.dataset.legalTab)));
  close?.addEventListener('click',closeLegal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeLegal()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeLegal()});
})();

/* Embedded My Library view behavior. */
window.renderMeteorInkLibrary=function(){
  const data=window.MeteorInkData;
  const grid=document.getElementById('libraryGrid');
  const count=document.getElementById('libraryCount');
  if(!grid||!data)return;
  const session=data.getSession?data.getSession():null;
  if(!session){
    if(count) count.textContent='';
    grid.innerHTML='<div class="library-auth-gate"><div class="library-auth-actions"><a class="text-btn" href="auth.html">Log In</a><a class="gold-btn small" href="signup.html">Sign Up</a></div></div>';
    return;
  }
  let history=[];
  try{history=data.getReadingHistory?data.getReadingHistory():[]}catch(_e){history=[]}
  history=Array.isArray(history)?history.slice().sort((a,b)=>new Date(b.lastReadAt||0)-new Date(a.lastReadAt||0)):[];

  const novels=data.getCatalogNovels?data.getCatalogNovels():data.getNovels();
  const byId=new Map((novels||[]).map(n=>[String(n.id),n]));
  const items=history.map(h=>({h,n:byId.get(String(h.novelId))})).filter(x=>x.n);

  if(count) count.textContent=`${items.length} ${items.length===1?'story':'stories'}`;
  if(!items.length){
    grid.innerHTML='<div class="library-empty"><div class="library-empty-inner"><div class="star">✦</div><h3>Your library is waiting.</h3><p>Open a novel and it will appear here automatically, ready for you to continue reading.</p></div></div>';
    return;
  }

  grid.innerHTML=items.map(({h:nr,n})=>`<article class="library-card" data-id="${String(n.id).replace(/[^a-zA-Z0-9_-]/g,'')}">
    <div class="library-cover">${n.cover?`<img src="${String(n.cover).replace(/"/g,'&quot;')}" alt="">`:'✦'}</div>
    <div class="library-body">
      <div class="library-meta">${String(n.genre||'NOVEL').replace(/[&<>"']/g,'')}</div>
      <h3>${String(n.title||'Untitled Novel').replace(/[&<>"']/g,'')}</h3>
      <p class="library-author">${String(n.authorName||'Unknown Author').replace(/[&<>"']/g,'')}</p>
      <div class="library-stats"><span>Read ${Number(nr.count||1)} ${Number(nr.count||1)===1?'time':'times'}</span><span>${nr.lastReadAt?new Date(nr.lastReadAt).toLocaleDateString():''}</span></div>
      <button class="library-read-btn" type="button">Continue Reading</button>
    </div>
  </article>`).join('');

  grid.querySelectorAll('.library-card').forEach(card=>card.addEventListener('click',e=>{
    const id=card.dataset.id;
    if(!id)return;
    data.recordView(id);
    data.recordRead(id);
    location.href='novel.html?id='+encodeURIComponent(id);
  }));
};
