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
  const demoAuthors=[
    {id:'demo-author-01',name:"Aarav Veyron",displayName:"Aarav Veyron",bio:"A speculative storyteller exploring empires, lost cities, and impossible skies.",followers:1840,createdAt:'2026-08-01T09:00:00.000Z',profileCreatedAt:'2026-08-01T09:00:00.000Z',verified:true,isDemo:true},
    {id:'demo-author-02',name:"Mira Solenne",displayName:"Mira Solenne",bio:"Writer of lyrical fantasy, quiet mysteries, and worlds shaped by memory.",followers:1260,createdAt:'2026-08-02T09:00:00.000Z',profileCreatedAt:'2026-08-02T09:00:00.000Z',verified:true,isDemo:true},
    {id:'demo-author-03',name:"Kian Varma",displayName:"Kian Varma",bio:"Adventure and science-fiction novelist fascinated by ancient technology.",followers:980,createdAt:'2026-08-03T09:00:00.000Z',profileCreatedAt:'2026-08-03T09:00:00.000Z',verified:true,isDemo:true},
    {id:'demo-author-04',name:"Elara Sen",displayName:"Elara Sen",bio:"Stories about ordinary people caught in extraordinary histories.",followers:740,createdAt:'2026-08-04T09:00:00.000Z',profileCreatedAt:'2026-08-04T09:00:00.000Z',verified:true,isDemo:true},
    {id:'demo-author-05',name:"Ruhan Aster",displayName:"Ruhan Aster",bio:"Dark fantasy and supernatural fiction with a taste for dangerous legends.",followers:620,createdAt:'2026-08-05T09:00:00.000Z',profileCreatedAt:'2026-08-05T09:00:00.000Z',verified:true,isDemo:true},
    {id:'demo-author-06',name:"Nivaan Rao",displayName:"Nivaan Rao",bio:"A worldbuilder drawn to forgotten kingdoms and impossible frontiers.",followers:580,createdAt:'2026-08-06T09:00:00.000Z',profileCreatedAt:'2026-08-06T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-07',name:"Saira Venn",displayName:"Saira Venn",bio:"Mystery writer weaving quiet clues into dangerous journeys.",followers:540,createdAt:'2026-08-07T09:00:00.000Z',profileCreatedAt:'2026-08-07T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-08',name:"Dev Malhotra",displayName:"Dev Malhotra",bio:"Adventure novelist chasing lost maps, old myths, and new horizons.",followers:510,createdAt:'2026-08-08T09:00:00.000Z',profileCreatedAt:'2026-08-08T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-09',name:"Ira Solis",displayName:"Ira Solis",bio:"Romance and fantasy stories about choices that reshape entire worlds.",followers:480,createdAt:'2026-08-09T09:00:00.000Z',profileCreatedAt:'2026-08-09T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-10',name:"Kabir Dastan",displayName:"Kabir Dastan",bio:"Speculative fiction writer exploring cities built above the clouds.",followers:455,createdAt:'2026-08-10T09:00:00.000Z',profileCreatedAt:'2026-08-10T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-11',name:"Meera Kael",displayName:"Meera Kael",bio:"Historical storyteller fascinated by dynasties, letters, and vanished roads.",followers:430,createdAt:'2026-08-11T09:00:00.000Z',profileCreatedAt:'2026-08-11T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-12',name:"Arin Vale",displayName:"Arin Vale",bio:"Dark fantasy author writing legends that refuse to stay buried.",followers:410,createdAt:'2026-08-12T09:00:00.000Z',profileCreatedAt:'2026-08-12T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-13',name:"Tara Nox",displayName:"Tara Nox",bio:"Science-fiction storyteller exploring memory, machines, and distant stars.",followers:395,createdAt:'2026-08-13T09:00:00.000Z',profileCreatedAt:'2026-08-13T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-14',name:"Vihaan Crest",displayName:"Vihaan Crest",bio:"Epic fantasy writer focused on rival houses and ancient oaths.",followers:380,createdAt:'2026-08-14T09:00:00.000Z',profileCreatedAt:'2026-08-14T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-15',name:"Anaya Voss",displayName:"Anaya Voss",bio:"Character-driven mystery author with a taste for impossible cases.",followers:365,createdAt:'2026-08-15T09:00:00.000Z',profileCreatedAt:'2026-08-15T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-16',name:"Reyansh Mori",displayName:"Reyansh Mori",bio:"Adventure writer charting dangerous seas and stranger islands.",followers:350,createdAt:'2026-08-16T09:00:00.000Z',profileCreatedAt:'2026-08-16T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-17',name:"Kiara Wynn",displayName:"Kiara Wynn",bio:"Contemporary fantasy novelist mixing ordinary lives with hidden magic.",followers:335,createdAt:'2026-08-17T09:00:00.000Z',profileCreatedAt:'2026-08-17T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-18',name:"Ayaan Mercer",displayName:"Ayaan Mercer",bio:"Political fantasy writer exploring courts, conspiracies, and rebellion.",followers:320,createdAt:'2026-08-18T09:00:00.000Z',profileCreatedAt:'2026-08-18T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-19',name:"Rhea Arden",displayName:"Rhea Arden",bio:"Mythic fiction author inspired by forgotten gods and heroic journeys.",followers:305,createdAt:'2026-08-19T09:00:00.000Z',profileCreatedAt:'2026-08-19T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-20',name:"Samir Knox",displayName:"Samir Knox",bio:"Thriller writer crafting tense stories around secrets and survival.",followers:290,createdAt:'2026-08-20T09:00:00.000Z',profileCreatedAt:'2026-08-20T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-21',name:"Yuvan Ash",displayName:"Yuvan Ash",bio:"Young-adult fantasy author building worlds around friendship and courage.",followers:275,createdAt:'2026-08-21T09:00:00.000Z',profileCreatedAt:'2026-08-21T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-22',name:"Zoya Marin",displayName:"Zoya Marin",bio:"Slice-of-life storyteller finding wonder in ordinary places.",followers:260,createdAt:'2026-08-22T09:00:00.000Z',profileCreatedAt:'2026-08-22T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-23',name:"Neil Varun",displayName:"Neil Varun",bio:"Cosmic fantasy writer fascinated by ancient civilizations among the stars.",followers:245,createdAt:'2026-08-23T09:00:00.000Z',profileCreatedAt:'2026-08-23T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-24',name:"Aditi Rowan",displayName:"Aditi Rowan",bio:"Historical mystery author connecting lost artifacts to modern lives.",followers:230,createdAt:'2026-08-24T09:00:00.000Z',profileCreatedAt:'2026-08-24T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-25',name:"Ritvik Hale",displayName:"Ritvik Hale",bio:"Adventure novelist writing explorers who never take the safe road.",followers:215,createdAt:'2026-08-25T09:00:00.000Z',profileCreatedAt:'2026-08-25T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-26',name:"Ishani Rey",displayName:"Ishani Rey",bio:"Fantasy writer blending folklore, family legends, and quiet magic.",followers:205,createdAt:'2026-08-26T09:00:00.000Z',profileCreatedAt:'2026-08-26T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-27',name:"Armaan Sol",displayName:"Armaan Sol",bio:"Cyberpunk storyteller exploring identity in neon cities.",followers:195,createdAt:'2026-08-27T09:00:00.000Z',profileCreatedAt:'2026-08-27T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-28',name:"Myra Keene",displayName:"Myra Keene",bio:"Emotional drama writer focused on memory, distance, and second chances.",followers:185,createdAt:'2026-08-28T09:00:00.000Z',profileCreatedAt:'2026-08-28T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-29',name:"Vedant Orin",displayName:"Vedant Orin",bio:"Military fantasy author writing about duty, sacrifice, and unlikely heroes.",followers:175,createdAt:'2026-08-29T09:00:00.000Z',profileCreatedAt:'2026-08-29T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-30',name:"Naira Quinn",displayName:"Naira Quinn",bio:"Paranormal mystery novelist following strange signals after midnight.",followers:165,createdAt:'2026-08-30T09:00:00.000Z',profileCreatedAt:'2026-08-30T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-31',name:"Dhruv Senar",displayName:"Dhruv Senar",bio:"Steampunk writer designing machines powered by impossible science.",followers:155,createdAt:'2026-08-31T09:00:00.000Z',profileCreatedAt:'2026-08-31T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-32',name:"Aarohi West",displayName:"Aarohi West",bio:"Romantic fantasy author exploring love across rival kingdoms.",followers:145,createdAt:'2026-08-32T09:00:00.000Z',profileCreatedAt:'2026-08-32T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-33',name:"Rohan Elric",displayName:"Rohan Elric",bio:"Dark adventure writer building worlds where every promise has a price.",followers:135,createdAt:'2026-08-33T09:00:00.000Z',profileCreatedAt:'2026-08-33T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-34',name:"Ishaan Crowe",displayName:"Ishaan Crowe",bio:"Mythology-inspired storyteller reimagining ancient legends for new readers.",followers:125,createdAt:'2026-08-34T09:00:00.000Z',profileCreatedAt:'2026-08-34T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-35',name:"Sana Verne",displayName:"Sana Verne",bio:"Literary fantasy writer focused on intimate characters and vast worlds.",followers:115,createdAt:'2026-08-35T09:00:00.000Z',profileCreatedAt:'2026-08-35T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-36',name:"Yash Calder",displayName:"Yash Calder",bio:"Space-opera author writing about explorers, empires, and distant suns.",followers:105,createdAt:'2026-08-36T09:00:00.000Z',profileCreatedAt:'2026-08-36T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-37',name:"Kavya Rune",displayName:"Kavya Rune",bio:"Folklore novelist blending village legends with supernatural mysteries.",followers:95,createdAt:'2026-08-37T09:00:00.000Z',profileCreatedAt:'2026-08-37T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-38',name:"Om Rayen",displayName:"Om Rayen",bio:"Fantasy adventure writer fascinated by relics, ruins, and hidden powers.",followers:85,createdAt:'2026-08-38T09:00:00.000Z',profileCreatedAt:'2026-08-38T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-39',name:"Lina Frost",displayName:"Lina Frost",bio:"Urban fantasy writer mixing hidden societies with everyday life.",followers:75,createdAt:'2026-09-01T09:00:00.000Z',profileCreatedAt:'2026-09-01T09:00:00.000Z',verified:false,isDemo:true},
    {id:'demo-author-40',name:"Devika Noor",displayName:"Devika Noor",bio:"Mystery and folklore author chasing stories buried beneath old towns.",followers:65,createdAt:'2026-09-02T09:00:00.000Z',profileCreatedAt:'2026-09-02T09:00:00.000Z',verified:false,isDemo:true}
  ];
  const demoNovels=[
    {id:'demo-novel-01',title:'Embers of Aether',description:'A fallen heir crosses a burning frontier to reclaim a city that remembers every war.',genre:'Fantasy',genres:['Fantasy','Adventure','Action'],authorId:'demo-author-01',authorName:'Aarav Veyron',publishedAt:'2026-08-24T10:00:00.000Z',views:12400,chapterViews:[8500,1200,980,640],chapters:24,rating:4.8,status:'published',cover:'assets/demo-novel-cover.png',verifiedAuthor:true,isDemo:true},
    {id:'demo-novel-02',title:'Where the Monsoon Sleeps',description:'A forgotten river town begins returning memories that its people were never meant to keep.',genre:'Mystery',genres:['Mystery','Drama','Historical'],authorId:'demo-author-02',authorName:'Mira Solenne',publishedAt:'2026-08-23T10:00:00.000Z',views:9100,chapterViews:[3200,870,640,410],chapters:18,rating:4.7,status:'published',cover:'assets/demo-novel-cover.png',verifiedAuthor:true,isDemo:true},
    {id:'demo-novel-03',title:'The Glass Citadel',description:'An apprentice engineer discovers that the kingdom\'s floating fortress is powered by a living machine.',genre:'Science Fiction',genres:['Science Fiction','Adventure','Speculative Fiction'],authorId:'demo-author-03',authorName:'Kian Varma',publishedAt:'2026-08-21T10:00:00.000Z',views:7800,chapterViews:[1500,720,510],chapters:31,rating:4.6,status:'published',cover:'assets/demo-novel-cover.png',verifiedAuthor:true,isDemo:true},
    {id:'demo-novel-04',title:'Thirteen Moons of Veyra',description:'When the thirteenth moon rises, a historian must decide which version of the past deserves to survive.',genre:'Historical',genres:['Historical','Drama','Fantasy'],authorId:'demo-author-04',authorName:'Elara Sen',publishedAt:'2026-08-19T10:00:00.000Z',views:6450,chapterViews:[9800,740,320],chapters:16,rating:4.5,status:'published',cover:'assets/demo-novel-cover.png',verifiedAuthor:true,isDemo:true},
    {id:'demo-novel-05',title:'The Last Cartographer',description:'A mapmaker follows a road that does not exist on any map and finds a kingdom at the edge of the world.',genre:'Adventure',genres:['Adventure','Fantasy','Mystery'],authorId:'demo-author-05',authorName:'Ruhan Aster',publishedAt:'2026-08-17T10:00:00.000Z',views:5200,chapterViews:[1100,540,290],chapters:22,rating:4.4,status:'published',cover:'assets/demo-novel-cover.png',verifiedAuthor:true,isDemo:true},
    {"id": "demo-novel-06", "title": "The Ashes of Hogwarts", "description": "A new chapter begins in a familiar magical world, where one forgotten choice changes everything.", "genre": "Fantasy", "genres": ["Fan-Fic", "Fantasy", "Adventure"], "authorId": "demo-author-06", "authorName": "Nivaan Rao", "publishedAt": "2026-07-06T10:00:00.000Z", "views": 12450, "chapterViews": [6225, 2490, 1245], "chapters": 18, "rating": 4.6, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-07", "title": "Moonlit Shinobi", "description": "A wandering shinobi returns to a village that remembers a war no history recorded.", "genre": "Action", "genres": ["Fan-Fic", "Action", "Fantasy"], "authorId": "demo-author-07", "authorName": "Saira Venn", "publishedAt": "2026-07-07T10:00:00.000Z", "views": 11200, "chapterViews": [5600, 2240, 1120], "chapters": 19, "rating": 4.7, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-08", "title": "Beyond the Grand Line", "description": "A rookie pirate follows a strange star beyond the last known sea.", "genre": "Adventure", "genres": ["Fan-Fic", "Adventure", "Fantasy"], "authorId": "demo-author-08", "authorName": "Dev Malhotra", "publishedAt": "2026-07-08T10:00:00.000Z", "views": 10300, "chapterViews": [5150, 2060, 1030], "chapters": 20, "rating": 4.7, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-09", "title": "The Last Saiyan Heir", "description": "An heir with a hidden bloodline must decide whether to rebuild or destroy an empire.", "genre": "Action", "genres": ["Fan-Fic", "Action", "Drama"], "authorId": "demo-author-09", "authorName": "Ira Solis", "publishedAt": "2026-07-09T10:00:00.000Z", "views": 9800, "chapterViews": [4900, 1960, 980], "chapters": 12, "rating": 4.1, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-10", "title": "Pokémon: Echoes of Indigo", "description": "A young trainer discovers a forgotten signal beneath an abandoned league stadium.", "genre": "Adventure", "genres": ["Fan-Fic", "Adventure", "Fantasy"], "authorId": "demo-author-10", "authorName": "Kabir Dastan", "publishedAt": "2026-07-10T10:00:00.000Z", "views": 8700, "chapterViews": [4350, 1740, 870], "chapters": 13, "rating": 4.2, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-11", "title": "The Wizard of Konoha", "description": "A wizard arrives in a hidden village where chakra and magic begin to collide.", "genre": "Fantasy", "genres": ["Fan-Fic", "Fantasy", "Action"], "authorId": "demo-author-11", "authorName": "Meera Kael", "publishedAt": "2026-07-11T10:00:00.000Z", "views": 7900, "chapterViews": [3950, 1580, 790], "chapters": 14, "rating": 4.3, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-12", "title": "Demon Slayer: Crimson Dawn", "description": "A swordsman faces a crimson moon that awakens demons thought extinct.", "genre": "Action", "genres": ["Fan-Fic", "Action", "Supernatural"], "authorId": "demo-author-12", "authorName": "Arin Vale", "publishedAt": "2026-07-12T10:00:00.000Z", "views": 7200, "chapterViews": [3600, 1440, 720], "chapters": 15, "rating": 4.3, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-13", "title": "A Hero in the Multiverse", "description": "A reluctant hero is pulled through worlds that should never have touched.", "genre": "Fantasy", "genres": ["Fan-Fic", "Fantasy", "Adventure"], "authorId": "demo-author-13", "authorName": "Tara Nox", "publishedAt": "2026-07-13T10:00:00.000Z", "views": 6800, "chapterViews": [3400, 1360, 680], "chapters": 16, "rating": 4.4, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-14", "title": "The Iron Throne Rewritten", "description": "A disgraced prince rewrites a royal succession before the kingdom tears itself apart.", "genre": "Historical", "genres": ["Fan-Fic", "Historical", "Drama"], "authorId": "demo-author-14", "authorName": "Vihaan Crest", "publishedAt": "2026-07-14T10:00:00.000Z", "views": 6100, "chapterViews": [3050, 1220, 610], "chapters": 17, "rating": 4.5, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-15", "title": "Jujutsu: After the Fall", "description": "A survivor returns to a city where cursed energy has started behaving differently.", "genre": "Supernatural", "genres": ["Fan-Fic", "Supernatural", "Action"], "authorId": "demo-author-15", "authorName": "Anaya Voss", "publishedAt": "2026-07-15T10:00:00.000Z", "views": 5600, "chapterViews": [2800, 1120, 560], "chapters": 18, "rating": 4.6, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-16", "title": "Naruto: Threads of Fate", "description": "A shinobi uncovers a sealed memory that could alter the future of every clan.", "genre": "Action", "genres": ["Fan-Fic", "Action", "Drama"], "authorId": "demo-author-16", "authorName": "Reyansh Mori", "publishedAt": "2026-07-16T10:00:00.000Z", "views": 5100, "chapterViews": [2550, 1020, 510], "chapters": 19, "rating": 4.7, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-17", "title": "One Piece: Sea of Stars", "description": "A new generation of pirates sails toward an island erased from every logbook.", "genre": "Adventure", "genres": ["Fan-Fic", "Adventure", "Action"], "authorId": "demo-author-17", "authorName": "Kiara Wynn", "publishedAt": "2026-07-17T10:00:00.000Z", "views": 4700, "chapterViews": [2350, 940, 470], "chapters": 20, "rating": 4.7, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-18", "title": "The Last Avatar Chronicle", "description": "A young avatar hears a voice from a lost era beneath the spirit world.", "genre": "Fantasy", "genres": ["Fan-Fic", "Fantasy", "Adventure"], "authorId": "demo-author-18", "authorName": "Ayaan Mercer", "publishedAt": "2026-07-18T10:00:00.000Z", "views": 4300, "chapterViews": [2150, 860, 430], "chapters": 12, "rating": 4.1, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-19", "title": "Percy Jackson: Titanbound", "description": "A demigod discovers that an old prophecy has been rewritten by someone from the future.", "genre": "Mythology", "genres": ["Fan-Fic", "Mythology", "Adventure"], "authorId": "demo-author-19", "authorName": "Rhea Arden", "publishedAt": "2026-07-19T10:00:00.000Z", "views": 3900, "chapterViews": [1950, 780, 390], "chapters": 13, "rating": 4.2, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"},
    {"id": "demo-novel-20", "title": "Marvel: Earth Reborn", "description": "A strange event forces heroes from a familiar universe to rebuild their world from the ruins.", "genre": "Superhero", "genres": ["Fan-Fic", "Superhero", "Action"], "authorId": "demo-author-20", "authorName": "Samir Knox", "publishedAt": "2026-07-20T10:00:00.000Z", "views": 3500, "chapterViews": [1750, 700, 350], "chapters": 14, "rating": 4.3, "status": "published", "cover": "assets/demo-novel-cover.png", "verifiedAuthor": false, "isDemo": true, "isFanFic": true, "type": "fanfic"}
  ];
  // Additional demo novels used for a full pre-launch catalog preview.
  // The original 20 demo novels above are preserved; these 80 entries bring the
  // demo catalog to exactly 100 novels without affecting real user content.
  const generatedDemoNovels=Array.from({length:80},(_,i)=>{
    const num=i+21, authorIndex=i%demoAuthors.length, author=demoAuthors[authorIndex];
    const genres=[
      ['Fantasy','Adventure','Action'],['Mystery','Drama','Thriller'],
      ['Science Fiction','Adventure','Speculative Fiction'],['Historical','Drama','Fantasy'],
      ['Romance','Fantasy','Drama'],['Horror','Mystery','Supernatural'],
      ['Adventure','Fantasy','Mystery'],['Action','Fantasy','Martial Arts']
    ][i%8];
    const titles=[
      'The Kingdom Beyond Dawn','Whispers Beneath the Citadel','Stars Over Veyra','The Forgotten Oath',
      'A Crown Made of Ash','The Clockwork Pilgrim','River of Silent Kings','The Last Moonkeeper',
      'Echoes of the Iron Sea','The House Without Shadows','Letters from the Lost Empire','The Ember Archivist',
      'When the Sky Broke','The Nameless Frontier','Seven Roads to Winter','The City Under Glass'
    ];
    const title=`${titles[i%titles.length]} ${Math.floor(i/titles.length)+1}`;
    const views=2100+(80-i)*73+(i%7)*211;
    return {
      id:`demo-novel-${String(num).padStart(2,'0')}`,
      title,
      description:`A new tale from ${author.name}, where forgotten secrets, dangerous choices, and an unexpected journey reshape a world on the edge of change.`,
      genre:genres[0],genres,authorId:author.id,authorName:author.name,
      publishedAt:`2026-08-${String((i%28)+1).padStart(2,'0')}T10:00:00.000Z`,
      views,chapterViews:[Math.round(views*.5),Math.round(views*.2),Math.round(views*.1)],
      chapters:12+(i%15),rating:Number((4.1+(i%8)*.1).toFixed(1)),status:'published',
      cover:'assets/demo-novel-cover.png',verifiedAuthor:author.followers>=1000,isDemo:true,
      isFanFic:false,type:'novel'
    };
  });
  // Additional fan-fic demo novels kept separate from the 100 original novels.
  // These 20 entries make a dedicated 20-novel fan-fic catalog without changing
  // the existing 100-novel demo catalog or real user content.
  const generatedDemoFanFics=Array.from({length:20},(_,i)=>{
    const num=i+101, author=demoAuthors[i%demoAuthors.length];
    const titles=[
      'Naruto: Echoes of the Hidden Leaf','One Piece: Beyond the Red Line',
      'Demon Slayer: Moonlit Blades','Jujutsu Kaisen: Cursed Legacy',
      'My Hero Academia: Next Generation','Pokémon: The Indigo Rebellion',
      'Attack on Titan: After the Fall','Harry Potter: The Forgotten Spell',
      'Marvel: Rise of the New Age','DC: Gotham After Midnight',
      'Dragon Ball: Warriors Reborn','Bleach: Shadows of Soul Society',
      'Avatar: The Lost Era','Percy Jackson: Children of Olympus',
      'Star Wars: The Outer Rim','The Witcher: A Different Path',
      'Solo Leveling: Another Awakening','Chainsaw Man: Devil Hunter Zero',
      'Black Clover: The Unwritten Grimoire','Fairy Tail: Beyond Magnolia'
    ];
    const views=1800+(19-i)*137+(i%5)*91;
    return {
      id:`demo-fanfic-${String(num).padStart(3,'0')}`, title:titles[i],
      description:`A fan-created adventure by ${author.name}, exploring a new story beyond the familiar canon.`,
      genre:['Fan-Fic','Adventure','Fantasy'][i%3],
      genres:['Fan-Fic','Adventure','Fantasy'], authorId:author.id, authorName:author.name,
      publishedAt:`2026-08-${String((i%20)+1).padStart(2,'0')}T12:00:00.000Z`,
      views, chapterViews:[Math.round(views*.5),Math.round(views*.2),Math.round(views*.1)],
      chapters:10+(i%11), rating:Number((4.0+(i%10)*.1).toFixed(1)), status:'published',
      cover:'assets/demo-novel-cover.png', verifiedAuthor:author.followers>=1000, isDemo:true,
      isFanFic:true, type:'fanfic'
    };
  });
  const allDemoNovels=[...demoNovels,...generatedDemoNovels,...generatedDemoFanFics];
  const getDemoNovels=()=>read(DEMO_KEYS.NOVELS);
  const getDemoAuthors=()=>read(DEMO_KEYS.AUTHORS);
  const ensureDemoCatalog=()=>{
    const existingAuthors=getDemoAuthors(), existingNovels=getDemoNovels();
    // Seed the complete demo catalog only when it is absent/incomplete.
    // Real user data in the primary localStorage keys is never modified.
    if(existingAuthors.length!==demoAuthors.length || existingNovels.length!==allDemoNovels.length || localStorage.getItem(DEMO_KEYS.DISABLED)==='1'){
      write(DEMO_KEYS.AUTHORS,demoAuthors);
      write(DEMO_KEYS.NOVELS,allDemoNovels);
    }
    localStorage.removeItem(DEMO_KEYS.DISABLED);
  };
  ensureDemoCatalog();
  const getCatalogNovels=()=>[...getNovels(),...getDemoNovels()];
  const getCatalogAuthors=()=>[...getAuthors(),...getDemoAuthors()];
  const authorViewTotal=(authorId,authorName)=>getCatalogNovels().filter(n=>(authorId&&n.authorId===authorId)||(!authorId&&authorName&&n.authorName===authorName)).reduce((sum,n)=>sum+Number(n.views||0),0);
  const chapterViewValues=novel=>{
    const raw=novel?.chapterViews ?? novel?.chapterViewCounts ?? novel?.chapterStats ?? novel?.chaptersData;
    if(!Array.isArray(raw))return[];
    return raw.map(v=>typeof v==='number'?v:Number(v?.views ?? v?.viewCount ?? 0)).filter(Number.isFinite);
  };
  const authorHasVB2=(authorId,authorName)=>getCatalogNovels().filter(n=>(authorId&&n.authorId===authorId)||(!authorId&&authorName&&n.authorName===authorName)).some(n=>chapterViewValues(n).some(v=>v>=1000&&v<10000));
  // Verification tiers are based on follower count.
  // VB-02: 100-999 followers, VB-01: 1,000-9,999, VB-00: 10,000+.
  const authorFollowerCount=(authorId,authorName)=>{
    const all=[...getCatalogAuthors(),...getAuthors()];
    const a=all.find(x=>String(x.id||'')===String(authorId||'') || String(x.name||'').toLowerCase()===String(authorName||'').toLowerCase());
    return Number(a?.followers||0);
  };
  const authorVerificationLevel=(authorId,authorName)=>{
    const followers=authorFollowerCount(authorId,authorName);
    return followers>=10000?'VB-00':(followers>=1000?'VB-01':(followers>=100?'VB-02':null));
  };
  const isAuthorVerified=(authorId,authorName)=>authorVerificationLevel(authorId,authorName)!==null;
  const verificationBadgeAsset=(authorId,authorName)=>{const level=authorVerificationLevel(authorId,authorName);return level==='VB-00'?'assets/verified-author-badge-vb00.png':level==='VB-02'?'assets/verified-author-badge-vb2.png':'assets/verified-author-badge.png';};
  const catalogTopAuthors=(mode='goat')=>{
    const authors=getCatalogAuthors(), novels=getCatalogNovels();
    if(mode==='goat') return authors.slice().sort((a,b)=>Number(b.followers||0)-Number(a.followers||0));
    const totals={};
    novels.forEach(n=>{if(n.authorId)totals[n.authorId]=(totals[n.authorId]||0)+Number(n.views||0);});
    return authors.map(a=>({...a,rankingViews:totals[a.id]||0})).sort((a,b)=>Number(b.rankingViews||0)-Number(a.rankingViews||0));
  };
  const removeDemoCatalog=()=>{localStorage.removeItem(DEMO_KEYS.NOVELS);localStorage.removeItem(DEMO_KEYS.AUTHORS);localStorage.setItem(DEMO_KEYS.DISABLED,'1');};

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
