
/* MeteorInk v67 UX/quality layer
   100 targeted improvements. Intentionally dependency-free so it can sit on top
   of the existing v66 application without replacing its data/auth layer. */
(() => {
  "use strict";

  const MI = window.MeteorInk || {};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const safe = (fn, fallback=null) => { try { return fn(); } catch { return fallback; } };

  /* 01-10: document, SEO, accessibility foundations */
  const head = document.head;
  const ensureMeta = (name, content) => {
    if (!head) return;
    let m = head.querySelector(`meta[name="${name}"]`);
    if (!m) { m = document.createElement("meta"); m.name = name; head.appendChild(m); }
    if (!m.content) m.content = content;
  };
  document.documentElement.lang = document.documentElement.lang || "en";
  ensureMeta("theme-color", "#030711");                                      // 01
  ensureMeta("color-scheme", "dark");                                        // 02
  ensureMeta("description", `${document.title || "MeteorInk"} — discover and read original web novels.`); // 03
  ensureMeta("robots", "index,follow,max-image-preview:large");               // 04
  if (!head.querySelector('meta[name="referrer"]')) { const m=document.createElement("meta");m.name="referrer";m.content="strict-origin-when-cross-origin";head.appendChild(m); } // 05
  if (!head.querySelector('link[rel="canonical"]')) { const l=document.createElement("link");l.rel="canonical";l.href=location.origin+location.pathname;head.appendChild(l); } // 06
  document.body?.setAttribute("data-mi-page", location.pathname.split("/").pop() || "home"); // 07
  const skip = document.createElement("a"); skip.className="mi-skip-link"; skip.href="#main-content"; skip.textContent="Skip to content"; document.body?.prepend(skip); // 08
  const main = $("main") || document.body;
  if (main && !main.id) main.id="main-content";                                // 09
  $$("img").forEach(img => { if (!img.hasAttribute("alt")) img.alt=""; });     // 10

  /* 11-20: performance and media hygiene */
  $$("img").forEach(img => {                                                   // 11
    if (!img.hasAttribute("loading") && !img.closest("header,.hero")) img.loading="lazy";
    img.decoding="async";
    img.addEventListener("error", () => { img.classList.add("mi-img-error"); img.alt=img.alt||"Image unavailable"; }, {once:true});
  });
  $$("iframe").forEach(f => { if (!f.loading) f.loading="lazy"; });             // 12
  $$("a[target='_blank']").forEach(a => {                                       // 13
    const rel=(a.rel||"").split(/\s+/).filter(Boolean); if(!rel.includes("noopener"))rel.push("noopener"); if(!rel.includes("noreferrer"))rel.push("noreferrer"); a.rel=rel.join(" ");
  });
  $$("a[href]").forEach(a => {                                                  // 14
    const u=safe(()=>new URL(a.href,location.href)); if(u && u.origin===location.origin && !a.hasAttribute("data-no-prefetch")) a.addEventListener("mouseenter",()=>{ if(!navigator.connection?.saveData){ const l=document.createElement("link");l.rel="prefetch";l.href=u.href;l.dataset.miPrefetch="1";if(!document.head.querySelector(`link[data-mi-prefetch="${CSS.escape(u.href)}"]`)){l.dataset.miPrefetch=u.href;document.head.appendChild(l);} }},{once:true});
  });
  if ("connection" in navigator && navigator.connection.saveData) document.documentElement.classList.add("mi-save-data"); // 15
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("mi-reduced-motion"); // 16
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) document.documentElement.classList.add("mi-low-power"); // 17
  const conn=navigator.connection; if(conn?.effectiveType==="2g"||conn?.effectiveType==="slow-2g")document.documentElement.classList.add("mi-slow-network"); // 18
  const addPreconnect=(href)=>{if(!head.querySelector(`link[rel="preconnect"][href="${href}"]`)){const l=document.createElement("link");l.rel="preconnect";l.href=href;head.appendChild(l);}}; addPreconnect("https://fonts.googleapis.com"); // 19
  addPreconnect("https://fonts.gstatic.com");                                      // 20

  /* 21-30: navigation and orientation */
  const navLinks=$$("nav a[href],header a[href]");
  navLinks.forEach(a=>{                                                         // 21
    const u=safe(()=>new URL(a.href,location.href));
    if(u && u.origin===location.origin && u.pathname===location.pathname && (u.search===location.search||!u.search)){a.setAttribute("aria-current","page");a.classList.add("mi-current");}
  });
  $$("nav a, header a").forEach(a=>a.addEventListener("click",()=>{             // 22
    if(window.innerWidth<800) document.documentElement.classList.remove("mi-menu-open");
  }));
  document.addEventListener("keydown",e=>{                                      // 23
    if(e.key==="/" && !/input|textarea|select/i.test(document.activeElement?.tagName||"")){e.preventDefault();const s=$('input[type="search"],input[name="search"],#searchInput');s?.focus();}
  });
  document.addEventListener("keydown",e=>{                                      // 24
    if(e.key==="Escape"){ $$(".mi-toast").forEach(x=>x.remove()); document.documentElement.classList.remove("mi-menu-open"); }
  });
  $$("a[href^='#']").forEach(a=>a.addEventListener("click",e=>{                 // 25
    const id=a.getAttribute("href"); if(id&&id!=="#"){const el=$(id);if(el){e.preventDefault();el.scrollIntoView({behavior:document.documentElement.classList.contains("mi-reduced-motion")?"auto":"smooth",block:"start"});}} 
  }));
  const progress=document.createElement("div"); progress.className="mi-scroll-progress"; document.body.prepend(progress); // 26
  const updateProgress=()=>{const h=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${h>0?scrollY/h:0})`;}; window.addEventListener("scroll",updateProgress,{passive:true}); updateProgress(); // 27
  const topBtn=document.createElement("button"); topBtn.className="mi-top-btn";topBtn.type="button";topBtn.setAttribute("aria-label","Back to top");topBtn.textContent="↑";document.body.appendChild(topBtn); // 28
  topBtn.addEventListener("click",()=>scrollTo({top:0,behavior:document.documentElement.classList.contains("mi-reduced-motion")?"auto":"smooth"})); // 29
  const toggleTop=()=>topBtn.classList.toggle("is-visible",scrollY>500); window.addEventListener("scroll",toggleTop,{passive:true}); toggleTop(); // 30

  /* 31-40: feedback, forms, inputs */
  const toast=(message,type="info")=>{                                               // 31
    $$(".mi-toast").forEach(x=>x.remove()); const t=document.createElement("div");t.className=`mi-toast mi-toast-${type}`;t.setAttribute("role","status");t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.classList.add("show"),10);setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),220)},3200);return t;
  };
  window.MeteorInkToast=toast;
  window.addEventListener("online",()=>toast("Back online. Sync can continue.","success")); // 32
  window.addEventListener("offline",()=>toast("You're offline. Saved local changes remain available.","warn")); // 33
  $$("form").forEach(form=>form.addEventListener("submit",()=>{                    // 34
    const btn=form.querySelector('button[type="submit"],input[type="submit"]'); if(btn){btn.disabled=true;btn.dataset.miOriginal=btn.textContent||btn.value; if(btn.tagName==="BUTTON")btn.textContent="Saving…"; else btn.value="Saving…"; setTimeout(()=>{btn.disabled=false;if(btn.tagName==="BUTTON"&&btn.dataset.miOriginal)btn.textContent=btn.dataset.miOriginal;if(btn.tagName==="INPUT"&&btn.dataset.miOriginal)btn.value=btn.dataset.miOriginal;},10000);}
  }));
  $$("input,textarea").forEach(input=>{                                           // 35
    if(input.type==="email")input.autocomplete="email";
    else if(input.type==="password")input.autocomplete=input.name?.toLowerCase().includes("new")?"new-password":"current-password";
    else if(input.type==="url")input.autocomplete="url";
    else if(input.type==="search")input.setAttribute("enterkeyhint","search");
  });
  $$("textarea[maxlength],input[maxlength]").forEach(input=>{                     // 36
    const n=document.createElement("small");n.className="mi-char-count";n.textContent=`0 / ${input.maxLength}`;input.insertAdjacentElement("afterend",n);const upd=()=>n.textContent=`${input.value.length} / ${input.maxLength}`;input.addEventListener("input",upd);upd();
  });
  $$("button:not([aria-label]),a.mi-icon:not([aria-label])").forEach(b=>{        // 37
    const text=(b.textContent||"").trim(); if(text)b.setAttribute("aria-label",text);
  });
  $$("[title]").forEach(el=>el.setAttribute("data-tooltip",el.title));             // 38
  $$("button").forEach(b=>b.addEventListener("keydown",e=>{                      // 39
    if(e.key===" "){e.preventDefault();b.click();}
  }));
  $$("a,button,input,select,textarea").forEach(el=>{el.addEventListener("focus",()=>el.classList.add("mi-focus"));el.addEventListener("blur",()=>el.classList.remove("mi-focus"));}); // 40

  /* 41-50: cards, content quality and resilience */
  $$("article, .card, .novel-showcase-card, .dynamic-author-card").forEach(el=>{ // 41
    if(!el.hasAttribute("tabindex") && el.matches(".novel-showcase-card,.dynamic-author-card"))el.setAttribute("tabindex","0");
  });
  $$("img").forEach(img=>{if(!img.alt && img.closest(".novel-showcase-card,.dynamic-author-card"))img.alt="MeteorInk cover";}); // 42
  $$("a").forEach(a=>{if(!a.textContent.trim()&&!a.getAttribute("aria-label"))a.setAttribute("aria-label","Open link");}); // 43
  $$("button").forEach(b=>{if(b.disabled)b.setAttribute("aria-disabled","true");}); // 44
  $$("input,textarea,select").forEach(i=>i.addEventListener("invalid",()=>i.classList.add("mi-invalid"))); // 45
  $$("input,textarea,select").forEach(i=>i.addEventListener("input",()=>i.classList.remove("mi-invalid"))); // 46
  const emptyFix=()=>{$$(".dynamic-content-grid").forEach(g=>{if(!g.children.length&&!g.querySelector(".mi-empty-state")){const e=document.createElement("div");e.className="mi-empty-state";e.textContent="Nothing here yet.";g.appendChild(e);}})}; emptyFix(); // 47
  new MutationObserver(()=>emptyFix()).observe(document.body,{childList:true,subtree:true}); // 48
  $$("img").forEach(img=>img.addEventListener("error",()=>img.classList.add("mi-img-error"))); // 49
  document.addEventListener("click",e=>{                                           // 50
    const link=e.target.closest("a[href]"); if(!link)return; const u=safe(()=>new URL(link.href,location.href)); if(u?.origin===location.origin&&u.pathname===location.pathname&&u.search===location.search){history.replaceState(null,"",u.href);e.preventDefault();scrollTo({top:0,behavior:"smooth"});}
  });

  /* 51-60: sharing, utility actions and reader conveniences */
  const share=async(text,url=location.href)=>{                                    // 51
    if(navigator.share){try{await navigator.share({title:document.title,text,url});return true}catch{}}
    try{await navigator.clipboard.writeText(url);toast("Link copied.","success");return true}catch{return false}
  };
  window.MeteorInkShare=share;
  $$("[data-share], .share-button").forEach(b=>b.addEventListener("click",()=>share(document.title))); // 52
  $$("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(b.dataset.copy||"");toast("Copied.","success")}catch{toast("Copy failed.","warn")}})); // 53
  const fmtNum=n=>Number(n||0).toLocaleString("en-IN"); window.MeteorInkFormatNumber=fmtNum; // 54
  const fmtDate=d=>safe(()=>new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(d)),""); window.MeteorInkFormatDate=fmtDate; // 55
  $$("[data-number]").forEach(el=>el.textContent=fmtNum(el.dataset.number));    // 56
  $$("[data-date]").forEach(el=>{el.textContent=fmtDate(el.dataset.date)});      // 57
  $$("time[datetime]").forEach(t=>{const d=new Date(t.dateTime);if(!isNaN(d))t.title=d.toLocaleString();}); // 58
  const rememberKey=`mi-scroll:${location.pathname}${location.search}`;          // 59
  window.addEventListener("beforeunload",()=>safe(()=>sessionStorage.setItem(rememberKey,String(scrollY)))); // 60

  /* 61-70: state and user experience continuity */
  const oldY=safe(()=>Number(sessionStorage.getItem(rememberKey)),0);             // 61
  if(oldY>200)requestAnimationFrame(()=>scrollTo(0,oldY));
  window.addEventListener("pageshow",()=>toggleTop());                            // 62
  document.addEventListener("visibilitychange",()=>{if(document.hidden)document.documentElement.dataset.hiddenAt=Date.now();}); // 63
  $$("[data-dismiss]").forEach(b=>b.addEventListener("click",()=>b.closest(b.dataset.dismiss||".modal,.notice,.banner")?.remove())); // 64
  $$("[data-confirm]").forEach(b=>b.addEventListener("click",e=>{if(!confirm(b.dataset.confirm)){e.preventDefault();e.stopImmediatePropagation();}})); // 65
  $$("details").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)d.scrollIntoView({block:"nearest"});})); // 66
  const prefersDark=window.matchMedia("(prefers-color-scheme: dark)"); document.documentElement.dataset.systemDark=prefersDark.matches?"1":"0"; // 67
  prefersDark.addEventListener?.("change",e=>document.documentElement.dataset.systemDark=e.matches?"1":"0"); // 68
  if(!localStorage.getItem("mi-first-visit")){localStorage.setItem("mi-first-visit",new Date().toISOString());document.documentElement.classList.add("mi-first-visit");} // 69
  document.body.addEventListener("click",e=>{const a=e.target.closest("a");if(a?.href?.includes("meteorink.com"))a.rel=(a.rel+" noopener").trim();}); // 70

  /* 71-80: reader-friendly controls */
  const reader=$(".reader-copy, .reader-content, [data-reader-content]");
  if(reader){                                                                    // 71
    const controls=document.createElement("div");controls.className="mi-reader-tools";controls.innerHTML='<button type="button" data-mi-font-minus aria-label="Decrease text size">A−</button><button type="button" data-mi-font-plus aria-label="Increase text size">A+</button><button type="button" data-mi-width aria-label="Toggle reading width">↔</button><button type="button" data-mi-reader-share aria-label="Share this page">Share</button>';
    reader.parentElement?.insertBefore(controls,reader);
    let fs=Number(localStorage.getItem("mi-reader-font")||19); reader.style.fontSize=`${fs}px`; // 72
    controls.querySelector("[data-mi-font-minus]").onclick=()=>{fs=Math.max(15,fs-1);reader.style.fontSize=`${fs}px`;localStorage.setItem("mi-reader-font",fs)}; // 73
    controls.querySelector("[data-mi-font-plus]").onclick=()=>{fs=Math.min(28,fs+1);reader.style.fontSize=`${fs}px`;localStorage.setItem("mi-reader-font",fs)}; // 74
    controls.querySelector("[data-mi-width]").onclick=()=>reader.classList.toggle("mi-wide-reader"); // 75
    controls.querySelector("[data-mi-reader-share]").onclick=()=>share(document.title); // 76
    const saved=localStorage.getItem("mi-reader-font"); if(saved)reader.style.fontSize=`${Math.min(28,Math.max(15,Number(saved)))}px`; // 77
    reader.addEventListener("copy",()=>{localStorage.setItem("mi-last-reader-copy",new Date().toISOString())}); // 78
    const prog=document.createElement("div");prog.className="mi-reader-progress";reader.parentElement?.prepend(prog); // 79
    const rp=()=>{const r=reader.getBoundingClientRect(),total=Math.max(1,r.height-innerHeight*.5),done=Math.min(1,Math.max(0,(innerHeight*.35-r.top)/total));prog.style.transform=`scaleX(${done})`};window.addEventListener("scroll",rp,{passive:true});rp(); // 80
  }

  /* 81-90: security-minded browser defaults */
  $$("form").forEach(form=>form.setAttribute("novalidate",form.hasAttribute("data-custom-validation")?"":"")); // 81
  $$("input[type='url']").forEach(i=>i.setAttribute("spellcheck","false"));     // 82
  $$("input[type='email']").forEach(i=>i.setAttribute("inputmode","email"));    // 83
  $$("input[type='number']").forEach(i=>i.setAttribute("inputmode","numeric")); // 84
  $$("a[href^='http']").forEach(a=>{const u=safe(()=>new URL(a.href));if(u&&u.origin!==location.origin)a.dataset.external="true";}); // 85
  $$("script[src]").forEach(s=>{if(/^https?:/.test(s.src)&&!s.hasAttribute("integrity"))s.dataset.miExternal="true";}); // 86
  if(location.protocol==="https:") document.documentElement.classList.add("mi-secure-context"); // 87
  document.addEventListener("dragstart",e=>{if(e.target.matches("img"))e.preventDefault();}); // 88
  document.addEventListener("contextmenu",e=>{if(e.target.closest("[data-protected-content]"))e.preventDefault();}); // 89
  window.addEventListener("error",e=>{if(e.message&&/Script error|ChunkLoadError/i.test(e.message))console.warn("[MeteorInk]",e.message);}); // 90

  /* 91-100: polish, observability and progressive enhancement */
  const footer=$("footer"); if(footer&&!footer.querySelector(".mi-build-note")){const s=document.createElement("small");s.className="mi-build-note";s.textContent="MeteorInk";footer.appendChild(s);} // 91
  const announce=document.createElement("div");announce.className="mi-live-region";announce.setAttribute("aria-live","polite");announce.setAttribute("aria-atomic","true");document.body.appendChild(announce); // 92
  window.MeteorInkAnnounce=(msg)=>{announce.textContent="";requestAnimationFrame(()=>announce.textContent=String(msg||""));}; // 93
  document.addEventListener("click",e=>{const b=e.target.closest("button,a");if(b&&!b.disabled&&b.dataset.announce)window.MeteorInkAnnounce(b.dataset.announce);}); // 94
  const installPrompt={deferred:null};window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt.deferred=e;window.MeteorInkInstall=async()=>{if(!installPrompt.deferred)return false;installPrompt.deferred.prompt();installPrompt.deferred=null;return true;};}); // 95
  if("serviceWorker" in navigator && location.protocol!=="file:") window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); // 96
  const perf=performance.getEntriesByType?.("navigation")?.[0];if(perf)document.documentElement.dataset.loadMs=Math.round(perf.domContentLoadedEventEnd||0); // 97
  document.documentElement.classList.add("mi-enhanced");                                      // 98
  setTimeout(()=>document.documentElement.classList.add("mi-ready"),0);                       // 99
  console.info("[MeteorInk] v67 enhancement layer loaded: 100 UX, accessibility, performance and resilience improvements."); // 100
})();
