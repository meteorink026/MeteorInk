/* MeteorInk shared site behavior. UI stays component-consistent across pages. */
(function(){
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  let currentUser=null;
  const nav=[
    ['Home','index.html#home'],['Authors','index.html#authors'],['Novels','index.html#novels'],
    ['Adaptation Room','index.html#adaptation'],
    ['About Us','index.html#about'],['Contact','index.html#contact']
  ];

  function activeFor(label){
    if(path==='novels.html') return label==='Novels';
    if((path==='index.html'||path==='') && location.hash==='#novels') return label==='Novels';
    if((path==='index.html'||path==='') && location.hash==='#authors') return label==='Authors';
    if(path==='adaptation.html') return label==='Adaptation Room';
    if((path==='index.html'||path==='') && location.hash==='#adaptation') return label==='Adaptation Room';
    if((path==='index.html'||path==='') && location.hash==='#contact') return label==='Contact';
    if(path==='index.html' || path==='') return label==='Home';
    return false;
  }

  function buildHeader(existing){
    if(!existing) return;
    existing.innerHTML=`
      <a class="brand" href="index.html" aria-label="MeteorInk home"><img src="assets/logo.jpg" alt="MeteorInk logo"></a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${nav.map(([label,href])=>`<a class="${activeFor(label)?'active':''}" href="${href}">${label}</a>`).join('')}
      </nav>
      <div class="header-actions">
        <label class="search-box"><span aria-hidden="true">⌕</span><input id="siteSearch" type="search" placeholder="Search novels and authors." aria-label="Search novels and authors" autocomplete="off"></label>
        ${currentUser
          ? `<div class="profile-menu-wrap">
              <button type="button" class="profile-trigger" id="profileTrigger" aria-expanded="false" aria-haspopup="true">
                <span class="profile-trigger-avatar">${currentUser.picture ? `<img src="${esc(currentUser.picture)}" alt="">` : '◉'}</span>
                <span class="header-user">${esc(currentUser.name||currentUser.email||'User')}</span>
                <span class="profile-trigger-chevron" aria-hidden="true">⌄</span>
              </button>
              <div class="profile-dropdown" id="profileDropdown" hidden>
                <div class="profile-dropdown-head">
                  <span class="profile-dropdown-avatar">${currentUser.picture ? `<img src="${esc(currentUser.picture)}" alt="">` : '◉'}</span>
                  <span><strong>${esc(currentUser.name||'User')}</strong><small>${esc(currentUser.email||'')}</small></span>
                </div>
                <div class="profile-dropdown-links">
                  <a href="profile.html">My Profile</a>
                  <a href="index.html#library">My Library</a>
                  <a href="author-dashboard.html">Author Dashboard</a>
                  <a href="settings.html">Settings</a>
                </div>
                <button type="button" class="profile-logout" id="logoutBtn">Log Out</button>
              </div>
            </div>`
          : `<a class="text-btn" href="auth.html">Log In</a><a class="gold-btn small" href="signup.html">Sign Up</a>`}
        <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false">☰</button>
      </div>`;
  }

  async function syncServerSession(){
    try{
      const r=await fetch('/api/me',{credentials:'same-origin'});
      if(!r.ok)return;
      const data=await r.json();
      if(data.authenticated && data.user){
        currentUser=data.user;
        if(window.MeteorInkData?.setSession) MeteorInkData.setSession(data.user);
        localStorage.setItem('meteorink_logged_in','true');
      }else{
        currentUser=window.MeteorInkData?.getSession ? MeteorInkData.getSession() : null;
      }
    }catch(_e){
      // Opening the development build directly via file:// has no API server.
    }
  }

  async function logout(){
    try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'});}catch(_e){}
    currentUser=null;
    if(window.MeteorInkData?.setSession) MeteorInkData.setSession(null);
    localStorage.removeItem('meteorink_logged_in');
    location.href='index.html';
  }

  function installHeader(){
    let header=document.querySelector('header.site-header');
    if(header) buildHeader(header);
    else if(!document.body.classList.contains('auth-no-global-nav')){
      header=document.createElement('header'); header.className='site-header';
      document.body.prepend(header); buildHeader(header);
    }
  }

  function bindAuthActions(){
    const btn=document.getElementById('logoutBtn');
    if(btn) btn.addEventListener('click',logout);
    const mobile=document.getElementById('mobileLogoutBtn');
    if(mobile) mobile.addEventListener('click',logout);

    const trigger=document.getElementById('profileTrigger');
    const dropdown=document.getElementById('profileDropdown');
    if(trigger && dropdown){
      const closeProfile=()=>{
        dropdown.hidden=true;
        trigger.setAttribute('aria-expanded','false');
      };
      trigger.addEventListener('click',e=>{
        e.stopPropagation();
        const open=dropdown.hidden;
        dropdown.hidden=!open;
        trigger.setAttribute('aria-expanded',String(open));
      });
      dropdown.addEventListener('click',e=>e.stopPropagation());
      document.addEventListener('click',closeProfile);
      document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProfile();});
    }
  }

  function installMobile(){
    const header=document.querySelector('.site-header'); if(!header) return;
    let menu=document.getElementById('mobileMenu');
    if(!menu){
      menu=document.createElement('div'); menu.id='mobileMenu'; menu.className='mobile-menu';
      menu.innerHTML=nav.map(([label,href])=>`<a class="${activeFor(label)?'active':''}" href="${href}">${label}</a>`).join('')+
        (currentUser
          ? '<div class="mobile-account"><div class="mobile-user">'+esc(currentUser.name||currentUser.email||'User')+'</div><a href="profile.html">My Profile</a><a href="index.html#library">My Library</a><a href="author-dashboard.html">Author Dashboard</a><a href="settings.html">Settings</a><button type="button" class="mobile-logout" id="mobileLogoutBtn">Log Out</button></div>'
          : '<a href="auth.html">Log In</a><a href="signup.html">Sign Up</a>');
      header.after(menu);
    }
    const btn=document.getElementById('menuBtn');
    if(btn) btn.addEventListener('click',()=>{const open=menu.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));btn.textContent=open?'×':'☰';});
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');if(btn){btn.setAttribute('aria-expanded','false');btn.textContent='☰';}}));
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
  function searchItems(term){
    const novels=read('meteorink_novels').map(n=>({...n,type:'Novel',label:n.title||'Untitled Novel',popularity:Number(n.views||0)}));
    const authors=read('meteorink_authors').map(a=>({...a,type:'Author',label:a.name||a.displayName||'Unnamed Author',popularity:Number(a.followers||0)}));
    const q=term.toLowerCase();
    return [...novels,...authors].filter(x=>[x.label,x.name,x.title,x.genre,x.description].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))).sort((a,b)=>b.popularity-a.popularity).slice(0,5);
  }

  function installSearch(){
    const input=document.getElementById('siteSearch'); if(!input) return;
    input.placeholder='Search novels and authors.';
    const box=input.closest('.search-box');
    let panel=box.querySelector('.search-suggestions');
    if(!panel){panel=document.createElement('div');panel.className='search-suggestions';panel.hidden=true;box.appendChild(panel)}
    const render=()=>{
      const term=input.value.trim();
      panel.innerHTML='';
      if(!term){panel.hidden=true;return}
      const items=searchItems(term);
      if(!items.length){panel.innerHTML='<div class="search-suggestion-empty not-in-existence">Not In Existence</div>';panel.hidden=false;return}
      items.forEach(item=>{
        const a=document.createElement('a');a.className='search-suggestion';a.href='search.html?q='+encodeURIComponent(term);
        a.innerHTML=`<span><strong>${esc(item.label)}</strong><small>${esc(item.type)}</small></span><b>${item.type==='Author'?'Followers: ':'Views: '}${item.popularity.toLocaleString()}</b>`;panel.appendChild(a);
      });
      const all=document.createElement('a');all.className='search-see-all';all.href='search.html?q='+encodeURIComponent(term);all.textContent='See All';panel.appendChild(all);panel.hidden=false;
    };
    input.addEventListener('input',render);input.addEventListener('focus',render);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.value.trim()){e.preventDefault();location.href='search.html?q='+encodeURIComponent(input.value.trim())}});
    document.addEventListener('click',e=>{if(!box.contains(e.target))panel.hidden=true});
  }

  function writerLinks(){
    document.querySelectorAll('a[href="auth.html?next=writer"]').forEach(link=>link.addEventListener('click',e=>{
      e.preventDefault();
      if(localStorage.getItem('meteorink_logged_in')!=='true'){location.href='auth.html?next=writer';return;}
      location.href=localStorage.getItem('meteorink_author_established')==='true'?'author-dashboard.html':'author-setup.html';
    }));
  }

  function logoBehavior(){
    const logo=document.querySelector('.site-header .brand'); if(!logo) return;
    if(path==='index.html'||path===''){
      logo.addEventListener('click',e=>{
        e.preventDefault();
        location.hash='home';
        window.scrollTo({top:0,behavior:'smooth'});
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    }
  }

  function installSingleWindowViews(){
    if(!(path==='index.html'||path==='')) return;
    const home=document.getElementById('homeView'), authors=document.getElementById('authorsView'), novels=document.getElementById('novelsView'), library=document.getElementById('libraryView'), adaptation=document.getElementById('adaptationView'), about=document.getElementById('aboutView'), contact=document.getElementById('contactView'), footer=document.querySelector('.site-footer');
    if(!home || !authors || !novels || !library || !about || !contact) return;

    const setView=()=>{
      const isAuthors=location.hash==='#authors';
      const isNovels=location.hash==='#novels';
      const isLibrary=location.hash==='#library';
      const isAdaptation=location.hash==='#adaptation';
      const isAbout=location.hash==='#about';
      const isContact=location.hash==='#contact';
      home.hidden=isAuthors||isNovels||isLibrary||isAdaptation||isAbout||isContact;
      authors.hidden=!isAuthors;
      novels.hidden=!isNovels;
      library.hidden=!isLibrary;
      adaptation.hidden=!isAdaptation;
      about.hidden=!isAbout;
      contact.hidden=!isContact;
      document.body.classList.toggle('novels-view-active', isNovels);
      if(footer) footer.hidden=false;
      document.querySelectorAll('.desktop-nav a, .mobile-menu a').forEach(a=>{
        const label=a.textContent.trim();
        const active =
          (isAuthors && label==='Authors') ||
          (isNovels && label==='Novels') ||
          (isAdaptation && label==='Adaptation Room') ||
          (isAbout && label==='About Us') ||
          (isContact && label==='Contact') ||
          (!isAuthors && !isNovels && !isLibrary && !isAbout && !isContact && !isAdaptation && label==='Home');
        a.classList.toggle('active', active);
      });
      if(isAuthors){
        // Keep the Authors view anchored at the very top. The browser can otherwise
        // perform a native hash-anchor scroll after the view is revealed.
        const resetAuthorsScroll=()=>{
          window.scrollTo(0,0);
          document.documentElement.scrollTop=0;
          document.body.scrollTop=0;
        };
        resetAuthorsScroll();
        requestAnimationFrame(resetAuthorsScroll);
        setTimeout(resetAuthorsScroll,0);
        if(window.renderMeteorInkAuthors) window.renderMeteorInkAuthors();
      }
      if(isNovels){
        window.scrollTo({top:0,behavior:'smooth'});
        if(window.renderMeteorInkNovels) window.renderMeteorInkNovels();
      }
      if(isLibrary){
        window.scrollTo({top:0,behavior:'smooth'});
        if(window.renderMeteorInkLibrary) window.renderMeteorInkLibrary();
      }
      if(isAbout || isContact){
        window.scrollTo({top:0,behavior:'smooth'});
      }
    };

    document.addEventListener('click',e=>{
      const link=e.target.closest('a[href="#authors"],a[href="#home"],a[href="#novels"],a[href="#library"],a[href="#about"],a[href="#contact"]');
      if(!link) return;
      e.preventDefault();
      location.hash=link.getAttribute('href').slice(1);
      setView();
    });
    window.addEventListener('hashchange',setView);
    window.addEventListener('popstate',setView);
    const contactForm=document.getElementById('meteorInkContactForm');
    const evidenceInput=document.querySelector('#meteorInkContactForm input[name="evidence"]');
    const evidenceList=document.getElementById('contactEvidenceList');
    if(evidenceInput && evidenceList) evidenceInput.addEventListener('change',()=>{
      evidenceList.innerHTML='';
      Array.from(evidenceInput.files || []).forEach(file=>{
        const chip=document.createElement('span');
        chip.className='contact-file-chip';
        const size=file.size < 1024*1024 ? `${Math.max(1,Math.round(file.size/1024))} KB` : `${(file.size/(1024*1024)).toFixed(1)} MB`;
        chip.textContent=`${file.name} · ${size}`;
        evidenceList.appendChild(chip);
      });
    });
    if(contactForm) contactForm.addEventListener('submit',e=>{
      e.preventDefault();
      const btn=contactForm.querySelector('button[type=submit]');
      const original=btn.textContent;
      btn.textContent='Request prepared'; btn.disabled=true;
      setTimeout(()=>{btn.textContent=original;btn.disabled=false;},1600);
    });
    setView();
  }

  function handleOAuthDestination(){
    const params=new URLSearchParams(location.search);
    if(params.get('oauth')!=='success' || params.get('next')!=='writer') return;
    const target=localStorage.getItem('meteorink_author_established')==='true'?'author-dashboard.html':'author-setup.html';
    history.replaceState({},'',location.pathname+location.hash);
    location.href=target;
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    await syncServerSession();
    const openParam=new URLSearchParams(location.search).get('open');
    if(openParam==='authors'){
      history.replaceState({},'',location.pathname+'#authors');
      window.scrollTo(0,0);
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
    }
    installHeader();installMobile();bindAuthActions();installSearch();writerLinks();logoBehavior();installSingleWindowViews();
  handleOAuthDestination();
  });
})();





