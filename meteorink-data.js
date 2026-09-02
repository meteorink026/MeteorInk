/* MeteorInk data layer.
   This browser build uses localStorage as a development adapter.
   Replace these adapters with API/database calls for production. */
window.MeteorInkData = (() => {
  const KEYS={NOVELS:'meteorink_novels',AUTHORS:'meteorink_authors',USERS:'meteorink_users',SESSION:'meteorink_session',PENDING:'meteorink_pending_signup'};
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const getNovels=()=>read(KEYS.NOVELS);
  const getAuthors=()=>read(KEYS.AUTHORS);

  const DEMO_KEYS={NOVELS:'meteorink_demo_novels',AUTHORS:'meteorink_demo_authors',DISABLED:'meteorink_demo_disabled'};
  // Legacy cleanup: remove demo records/keys from older browser builds while preserving real user data.
  const cleanDemoState=()=>{
    [KEYS.NOVELS,KEYS.AUTHORS,KEYS.USERS].forEach(key=>{
      const items=read(key);
      const cleaned=Array.isArray(items)?items.filter(item=>!item?.isDemo && !String(item?.id||'').startsWith('demo-')):[];
      if(cleaned.length!==items.length)write(key,cleaned);
    });
    localStorage.removeItem(DEMO_KEYS.NOVELS);
    localStorage.removeItem(DEMO_KEYS.AUTHORS);
    localStorage.removeItem(DEMO_KEYS.DISABLED);
    try{
      const session=JSON.parse(localStorage.getItem(KEYS.SESSION)||'null');
      if(session?.isDemo || String(session?.id||'').startsWith('demo-'))localStorage.removeItem(KEYS.SESSION);
    }catch{}
  };
  cleanDemoState();
  const getDemoNovels=()=>[];
  const getDemoAuthors=()=>[];
  const getCatalogNovels=()=>getNovels();
  const getCatalogAuthors=()=>getAuthors();
  const getUsers=()=>read(KEYS.USERS);
  const getSession=()=>{try{return JSON.parse(localStorage.getItem(KEYS.SESSION)||'null')}catch{return null}};
  const setSession=user=>user?localStorage.setItem(KEYS.SESSION,JSON.stringify(user)):localStorage.removeItem(KEYS.SESSION);
  const inWindow=(iso,ms)=>{const t=new Date(iso||0).getTime();return t>0 && Date.now()-t<=ms;};
  const viewsIn=(novel,ms)=>Array.isArray(novel.viewEvents)?novel.viewEvents.filter(t=>inWindow(t,ms)).length:Number(novel.views||0);
  const authorMap=()=>Object.fromEntries(getAuthors().map(a=>[a.id,a]));

  const trending=period=>{
    const windows={today:86400000,'7days':7*86400000,month:30*86400000};
    const ms=windows[period]||windows.today;
    return getNovels().map(n=>({...n,rankingViews:viewsIn(n,ms)})).sort((a,b)=>b.rankingViews-a.rankingViews);
  };

  const topAuthors=(period,limit=20)=>{
    const authors=authorMap();
    if(period==='goat') return getAuthors().map(a=>({...a,rankingFollowers:Number(a.followers||0)})).sort((a,b)=>b.rankingFollowers-a.rankingFollowers).slice(0,20);
    const novelLimit=period==='month'?30:50;
    const novels=trending(period).slice(0,novelLimit);
    const totals={};
    novels.forEach(n=>{if(n.authorId) totals[n.authorId]=(totals[n.authorId]||0)+Number(n.rankingViews||0)});
    return Object.entries(totals).map(([id,views])=>authors[id]?({...authors[id],rankingViews:views}):null).filter(Boolean).sort((a,b)=>b.rankingViews-a.rankingViews).slice(0,limit);
  };

  const latest=()=>getNovels().slice().sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));

  const emerging=()=>{
    const authors=getAuthors(), novels=getNovels(), maxAge=30*86400000;
    return authors.filter(a=>{
      const created=new Date(a.profileCreatedAt||a.createdAt||0).getTime();
      return created>0 && Date.now()-created<=maxAge && novels.some(n=>n.authorId===a.id && Number(n.views||0)>2000);
    });
  };

  const search=(term)=>{
    const q=String(term||'').trim().toLowerCase();
    if(!q)return[];
    const novels=getNovels().map(n=>({...n,type:'Novel',label:n.title||'Untitled Novel',popularity:Number(n.views||0)}));
    const authors=getAuthors().map(a=>({...a,type:'Author',label:a.name||a.displayName||'Unnamed Author',popularity:Number(a.followers||0)}));
    return [...novels,...authors].filter(x=>[x.label,x.name,x.title,x.genre,x.description,x.authorName].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))).sort((a,b)=>b.popularity-a.popularity);
  };

  const publishNovel=novel=>{
    const novels=getNovels();
    const item={id:novel.id||crypto.randomUUID(),title:String(novel.title||'Untitled Novel').trim(),description:novel.description||'',genre:novel.genre||'Uncategorized',authorId:novel.authorId,authorName:novel.authorName||'Unknown Author',publishedAt:novel.publishedAt||new Date().toISOString(),views:0,viewEvents:[],cover:novel.cover||'',status:'published'};
    novels.push(item);write(KEYS.NOVELS,novels);return item;
  };
  const recordView=id=>{const novels=getNovels(),n=novels.find(x=>x.id===id);if(!n)return;n.views=Number(n.views||0)+1;n.viewEvents=Array.isArray(n.viewEvents)?n.viewEvents:[];n.viewEvents.push(new Date().toISOString());write(KEYS.NOVELS,novels);};
  const bookmarkKey=()=>{const session=getSession();return session?.id?`meteorink_bookmarks_${session.id}`:'meteorink_bookmarks_guest';};
  const getBookmarks=()=>read(bookmarkKey());
  const addBookmark=id=>{
    const novelId=String(id||'').trim(); if(!novelId)return {ok:false,reason:'invalid'};
    const items=getBookmarks().map(x=>String(x));
    if(items.includes(novelId))return {ok:true,already:true,count:items.length};
    if(items.length>=25)return {ok:false,reason:'limit',count:items.length,limit:25};
    items.push(novelId); write(bookmarkKey(),items); return {ok:true,count:items.length};
  };
  const removeBookmark=id=>{const novelId=String(id||'').trim();const items=getBookmarks().map(x=>String(x)).filter(x=>x!==novelId);write(bookmarkKey(),items);return {ok:true,count:items.length};};
  const readerKey=()=>{const session=getSession();return session?.id?`meteorink_reading_history_${session.id}`:'meteorink_reading_history_guest';};
  const getReadingHistory=()=>read(readerKey());
  const recordRead=id=>{if(!id)return;const history=getReadingHistory(),entry=history.find(x=>x.novelId===id);if(entry){entry.count=Number(entry.count||0)+1;entry.lastReadAt=new Date().toISOString();}else history.push({novelId:id,count:1,lastReadAt:new Date().toISOString()});write(readerKey(),history);};
  const personalizedRandom=(limit=4)=>{
    const novels=getNovels().slice(),history=getReadingHistory();
    if(!novels.length)return[];
    const counts={authors:{},genres:{},categories:{}};
    history.forEach(h=>{
      const n=novels.find(x=>x.id===h.novelId); if(!n)return; const c=Number(h.count||1);
      const author=String(n.authorId||n.authorName||'').trim(); if(author)counts.authors[author]=(counts.authors[author]||0)+c;
      const genre=String(n.genre||'').trim().toLowerCase(); if(genre)counts.genres[genre]=(counts.genres[genre]||0)+c;
      const category=String(n.category||n.categories||'').split(',')[0].trim().toLowerCase(); if(category)counts.categories[category]=(counts.categories[category]||0)+c;
    });
    const top=map=>Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
    const topAuthor=top(counts.authors),topGenre=top(counts.genres),topCategory=top(counts.categories);
    const scored=novels.map(n=>{
      const author=String(n.authorId||n.authorName||'').trim(),genre=String(n.genre||'').trim().toLowerCase(),category=String(n.category||n.categories||'').split(',')[0].trim().toLowerCase();
      let score=0;
      if(topAuthor&&author===topAuthor[0])score+=8;
      if(topGenre&&genre===topGenre[0])score+=5;
      if(topCategory&&category===topCategory[0])score+=6;
      return {n,score,random:Math.random()};
    }).sort((a,b)=>(b.score-a.score)||(b.random-a.random));
    const preferred=scored.filter(x=>x.score>0);
    const pool=preferred.length>=limit?preferred:scored;
    // Keep the result varied while still strongly favoring what this reader consumes most.
    return pool.slice(0,Math.min(limit,pool.length)).map(x=>x.n);
  };
  const saveUser=user=>{const users=getUsers();const i=users.findIndex(x=>x.email===user.email);if(i>=0)users[i]=user;else users.push(user);write(KEYS.USERS,users);return user;};
  const findUser=email=>getUsers().find(u=>u.email.toLowerCase()===String(email).toLowerCase());
  const saveAuthor=author=>{const a=getAuthors(),i=a.findIndex(x=>x.id===author.id);if(i>=0)a[i]={...a[i],...author};else a.push(author);write(KEYS.AUTHORS,a);return author;};

  return {getNovels,getAuthors,getDemoNovels,getDemoAuthors,getCatalogNovels,getCatalogAuthors,authorViewTotal,authorHasVB2,authorVerificationLevel,verificationBadgeAsset,isAuthorVerified,catalogTopAuthors,removeDemoCatalog,getUsers,getSession,setSession,saveUser,findUser,saveAuthor,trending,topAuthors,latest,emerging,search,publishNovel,recordView,getBookmarks,addBookmark,removeBookmark,getReadingHistory,recordRead,personalizedRandom,KEYS,DEMO_KEYS};
})();
