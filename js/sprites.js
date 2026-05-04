// ── sprites.js ──

// ═══════════════════════════════════════════════════
//  STRUCTURES
// ═══════════════════════════════════════════════════
const STRUCT_NAME = ['House','Bakery','Wall','Tower','Farmland','Mine','Barracks','Forge','Road','Outpost','Gate'];
const STRUCT_ICON = ['H','K','W','T','F','M','R','G','~','O','I'];
const STRUCT_BUILD_TIME = [15,20,8,25,10,30,25,20,0,45,10]; // seconds per builder (Road=0=instant)
const STRUCT_MAX_BUILDERS = 3;

// Valid placement tile types per structure (index matches STRUCT_NAME order)
const _BUILD_TILES = new Set([T.GRASS,T.SAND,T.HILL,T.DESERT,T.TUNDRA]);
const STRUCT_VALID = [
  _BUILD_TILES,                                                           // House
  _BUILD_TILES,                                                           // Bakery
  _BUILD_TILES,                                                           // Wall
  _BUILD_TILES,                                                           // Tower
  new Set([T.GRASS,T.SAND,T.TUNDRA]),                                    // Farmland
  new Set([T.GRASS,T.SAND,T.HILL,T.TUNDRA]),                            // Mine
  _BUILD_TILES,                                                           // Barracks
  _BUILD_TILES,                                                           // Forge
  new Set([T.GRASS,T.SAND,T.HILL,T.FOREST,T.RIVER,T.DESERT,T.TUNDRA]), // Road
  _BUILD_TILES,                                                           // Outpost
  _BUILD_TILES,                                                           // Gate
];

// Tile footprint size per structure [w, h] — default 1×1
const STRUCT_SIZE = [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]];

// Visual height multiplier — how many tile-heights tall the sprite renders
// Values > 1 extend the sprite upward above the tile footprint
const BLDG_HEIGHT = [
  1.10,  // 0  House
  1.15,  // 1  Bakery
  1.00,  // 2  Wall  (handled separately)
  1.70,  // 3  Tower
  1.00,  // 4  Farmland
  1.20,  // 5  Mine
  1.35,  // 6  Barracks
  1.20,  // 7  Forge
  1.00,  // 8  Road
  1.80,  // 9  Outpost
];
const TC_HEIGHT = 1.30;

// Building pixel-art stamp sprites (16×16, 3/4 perspective: top=roof, bottom=front face)
const BSTAMP = [
  // 0 House — warm plaster walls, red-tile roof
[
  '.......rr.......',
  '.....rrRRrr.....',
  '....rrRRRRRrr...',
  '..rrRRRrrRRRRrr.',
  'rrRRrrrRRrrRRRRr',
  'rRRrrRRRRRRrrrRr',
  'rrrRRRRRRRRRRrrr',
  'rEEEEEEEEEEEEEEr',
  '.EwwwwwwwwwwwwE.',
  '.EwDDwwwwwwDDwE.',
  '.EwDDwwwwwwDDwE.',
  '.EwwwwwwwwwwwwE.',
  '.EwwwwddddwwwwE.',
  '.EwwwwddddwwwwE.',
  '.ssssssssssssss.',
  '................'
],
  // 1 Bakery — warm brick, chimney, oven glow
  [
    '..c.............',
    '..cCrrrrrrrrrr..',
    '..cCrRRRRRRRRr..',
    '..brrRRRLLRRRr..',
    '.bBrrRRRRRRRRr..',
    '.bBrrrrrrrrrrr..',
    '..bbbrrrrrrrrr..',
    'BBBBBBBBBBBBBBBB',
    'BbBbBbBbBbBbBbBB',
    'bBbBbBbBbBbBbBbB',
    'BbBbBBOOOOBbBbBB',
    'bBbBbBOOOObBbBbB',
    'BbBbBbBbBbBbBbBB',
    'bBbBbBddddBbBbBb',
    'BBBBBBBBBBBBBBBB',
    '................',
  ],
  // 2 Wall — stone blocks, crenellations on top
  [
    'S.S.S.S.S.S.S.S.',
    'SSSSSSSSSSSSSSSS',
    'SmSmSmSmSmSmSmSm',
    'mmmmmmmmmmmmmmmm',
    'SmSmSmSmSmSmSmSm',
    'mmmmmmmmmmmmmmmm',
    'SSSSSSSSSSSSSSSS',
    'ssssssssssssssss',
    'MsMsMsMsMsMsMsMs',
    'mmmmmmmmmmmmmmmm',
    'MsMsMsMsMsMsMsMs',
    'mmmmmmmmmmmmmmmm',
    'MsMsMsMsMsMsMsMs',
    'mmmmmmmmmmmmmmmm',
    'MsMsMsMsMsMsMsMs',
    'MMMMMMMMMMMMMMMM',
  ],
  // 3 Tower — dark stone, battlements, arrow slit
  [
    'T.T.T.T.T.T.T.T.',
    'TTTTTTTTTTTTTTTT',
    'TtTtTtTtTtTtTtTt',
    'tttttttttttttttt',
    'TTTTTTTTTTTTTTtt',
    'TTTTTTTTTTTTTTtt',
    'TtTtTtTtTtTtTtTt',
    'MMMMMMMMMMMMMMMM',
    'MMMMMMMiiMMMMMMM',
    'MMMMMMMiiMMMMMMM',
    'MMMMMMMiiMMMMMMM',
    'MMMMMMMiiMMMMMMM',
    'MMMmMMmMMmMMMmMM',
    'mmmmmmmmmmmmmmmm',
    'MMMmMMMmMMMmMMMM',
    'MMMMMMMMMMMMMMMM',
  ],
  // 4 Farmland — tilled earth, crop rows
  [
    'fFfFfFfFfFfFfFfF',
    'FFFFFFFFFFFFFFff',
    'fFgFgFgFgFgFgFgF',
    'FFGFGFGFGFGFGFff',
    'fFgFgFgFgFgFgFgF',
    'FFGFGFGFGFGFGFff',
    'fFfFfFfFfFfFfFfF',
    'FFFFFFFFFFFFFFff',
    'fFgFgFgFgFgFgFgF',
    'FFGFGFGFGFGFGFff',
    'fFgFgFgFgFgFgFgF',
    'FFGFGFGFGFGFGFff',
    'fFgFgFgFgFgFgFgF',
    'FFGFGFGFGFGFGFff',
    'fFfFfFfFfFfFfFfF',
    'FFFFFFFFFFFFFFff',
  ],
  // 5 Mine — rocky face, dark tunnel entrance
  [
    'rRrRrRrRrRrRrRrR',
    'RrRrRrRrRrRrRrRr',
    'rRrRrRRRRRRrRrRr',
    'RrRrRrRrRrRrRrRR',
    'rRrRLRrRrRrLRrRr',
    'RrRrRrRrRrRrRrRr',
    'rRrRrRRRRRRrRrRr',
    'RRRRRRRRRRRRRRRR',
    'RrRrRDDDDDDrRrRR',
    'rRrRrDDDDDDrRrRr',
    'RrRrRDDDDDDrRrRR',
    'rRrRrDDDDDDrRrRr',
    'RrRrRDDDDDDrRrRR',
    'rRrRrRRRRRRrRrRr',
    'RrRrRrRrRrRrRrRR',
    '................',
  ],
  // 6 Barracks — blue-grey military stone
  [
    '................',
    '....bbbbbbbbbb..',
    '...bBBBBBBBBBBb.',
    '...bBBBLLLBBBBb.',
    '...bBBBLLLBBBBb.',
    '...bBBBBBBBBBBb.',
    '....bbbbbbbbbb..',
    'KKKKKKKKKKKKKKKK',
    'KkKkKkKkKkKkKkKK',
    'KKKKKKKKKKKKKKkK',
    'KkKkKkKKKKkKkKKK',
    'KKKKKKKddddKKKkK',
    'KkKkKkKddddKkKKK',
    'KKKKKKKddddKKKkK',
    'kkkkkkkkkkkkkkkk',
    '................',
  ],
  // 7 Forge — dark stone, glowing furnace
  [
    '................',
    '....ffffffff....',
    '...fFFFFFFFFFf..',
    '...fFFFLLFFFf...',
    '...fFFFLLFFFf...',
    '...fFFFFFFFFFf..',
    '....ffffffff....',
    'FFFFFFFFFFFFFFFF',
    'FfFfFfFfFfFfFfFF',
    'fFfFfFfFfFfFfFfF',
    'FfFfFfOOOOFfFfFF',
    'fFfFfFOOOOfFfFfF',
    'FfFfFfOOOOFfFfFF',
    'fFfFfFfFfFfFfFfF',
    'FFFFFFFFFFFFFFFF',
    '................',
  ],
  // 8 Road — worn dirt path
  [
    'pppppppppppppppp',
    'pPPPPPPPPPPPPPPp',
    'pPppppppppppppPp',
    'pPppppppppppppPp',
    'pPppppppppppppPp',
    'pPppppppppppppPp',
    'pPppppppppppppPp',
    'pPppCCCCCCppppPp',
    'pPppCCCCCCppppPp',
    'pPppppppppppppPp',
    'pPppppppppppppPp',
    'pPppppppppppppPp',
    'pPppppppppppppPp',
    'pPPPPPPPPPPPPPPp',
    'pppppppppppppppp',
    '................',
  ],
  // 9 Outpost — stone watchtower with flag
  [
    '.....FF.........',
    '.....Ff.........',
    '....WWWWWW......',
    '....WWWWWW......',
    '....WwwwwW......',
    '...WWWWWWWW.....',
    '...WWWWWWWW.....',
    '...Wwwwwwww.....',
    '...WWWWWWWW.....',
    'WWWWWWWWWWWWWWWW',
    'WWwwwwwwwwwwwwWW',
    'WWwwwwwwwwwwwwWW',
    'WWWWWWWWWWWWWWWW',
    '................',
    '................',
    '................',
  ],
  // 10 Gate — stone wall with wooden gate arch opening in center
  [
    'S.S.S.....S.S.S.',
    'SSSSSSaaaaSSSSSS',
    'SmSmSmaaaaSmSmSm',
    'mmmmmmaaaammmmmm',
    'SmSmSmaaaaSmSmSm',
    'mmmmmmaaaammmmmm',
    'SSSSSSSSSSSSSSSS',
    'ssssDDDDDDDDssss',
    'MsMsDDDDDDDDMsMs',
    'mmmmDDdDdDDDmmmm',
    'MsMsDDDDDDDDMsMs',
    'mmmmDDdDdDDDmmmm',
    'MsMsDDDDDDDDMsMs',
    'mmmmDDdDdDDDmmmm',
    'MsMsMsMsMsMsMsMs',
    'MMMMMMMMMMMMMMMM',
  ],
];
const BSTAMP_PAL = [
  {'.':null,'r':'#5c2a08','R':'#964820','L':'#c87038','E':'#7a5f40','w':'#dcc898','D':'#5888c0','d':'#281408','s':'#907858'}, // House
  {'.':null,'c':'#2a2018','C':'#484030','r':'#5c2a08','R':'#904820','L':'#c06828','B':'#9c4428','b':'#6a2e18','O':'#e89018','d':'#281408'}, // Bakery
  {'.':null,'S':'#c8c8c0','s':'#989898','m':'#585858','M':'#888880'},            // Wall
  {'.':null,'T':'#8090a0','t':'#606878','M':'#5a6878','m':'#485060','i':'#181c28'}, // Tower
  {'f':'#4a3018','F':'#6a4828','g':'#387028','G':'#4a9030'},                     // Farmland
  {'.':null,'r':'#686068','R':'#907888','L':'#d0c8a8','D':'#181418'},            // Mine
  {'.':null,'b':'#3c2e18','B':'#5c4830','L':'#d09840','K':'#786858','k':'#584838','d':'#281408'}, // Barracks
  {'.':null,'f':'#302820','F':'#504038','L':'#806850','O':'#f08020'},            // Forge
  {'.':null,'p':'#9a7a50','P':'#b89060','C':'#7a5a30'},                         // Road
  {'.':null,'W':'#c0aa80','w':'#a08860','F':'#b03020','f':'#701010'},            // Outpost
  {'.':null,'S':'#c8c8c0','s':'#989898','m':'#585858','M':'#888880','a':'#201810','D':'#5a3010','d':'#3a1e08'}, // Gate
];

// Town Center — grand stone hall with flag (16×16)
const TC_STAMP = [
  '....P...........',
  '....p...........',
  '...ttttttttttt..',
  '..tTTTTTTTTTTTt.',
  '..tTTTLLLLTTTTt.',
  '..tTTTLLLLTTTTt.',
  '...ttttttttttt..',
  'TTTTTTTTTTTTTTTT',
  'TtTtTtTtTtTtTtTT',
  'TTTTTTTTTTTTTTTT',
  'TtTtTTFFFFTtTtTT',
  'TTTTTTFFFFTTTTtT',
  'TtTtTTFFFFTtTtTT',
  'TTTTTTddddTTTTtT',
  'tttttttttttttttt',
  '................',
];
const TC_PAL = {'.':null,'T':'#887860','t':'#605840','L':'#b0a080','P':'#b82010','p':'#706050','F':'#3c2c18','d':'#1c1008'};

// ── Terrain stamp sprites (16×16) ─────────────────
const STAMP = {
  // 16×16 pine tree: triangular pointed canopy, visible trunk
  tree: [
    '.......p........',
    '......pDp.......',
    '.....pDDDp......',
    '....pDDlDDp.....',
    '...pDDDlDDDp....',
    '..pDDDDlDDDDp...',
    '.pDDDDDlDDDDDp..',
    'pDDDDDDdDDDDDDp.',
    '.pddddddddddddp.',
    '.......TT.......',
    '.......TT.......',
    '.......tT.......',
    '................',
    '................',
    '................',
    '................',
  ],
  mtn: [
    '........W.......',
    '.......WWW......',
    '......WWsWW.....',
    '.....WWssWWWW...',
    '....WWssmWWWWW..',
    '...WWssmmssWWW..',
    '..WWssmmmmssWW..',
    '.WWssmmmmmmsssW.',
    '.WWssmmmmmmmmss.',
    '.ssssmmmmmmssss.',
    '..ssssmmmmssss..',
    '...ssssssssss...',
    '....mmmmmmmm....',
    '...mmmmmmmmmm...',
    '................',
    '................',
  ],
  hill: [
    '................',
    '................',
    '.......hHh......',
    '......hHHHHh....',
    '.....hHHHHHHh...',
    '....hHHHHHHHHh..',
    '....hHHHHHHHHh..',
    '.....hHHHHHHh...',
    '......hHHHHh....',
    '.......hHHh.....',
    '........hh......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  peak: [
    '........W.......',
    '.......WWW......',
    '......WWwWW.....',
    '.....WWwwwWW....',
    '....WWwwwwwWW...',
    '...WWwwwwwwwWW..',
    '..WWwwwwwwwwwWW.',
    '.WWwwwwwwwwwwwW.',
    'WWwwwwwwwwwwwwW.',
    '.Wwwwwwwwwwwww..',
    '..wwwwwwwwwwww..',
    '...wwwwwwwwwww..',
    '....wwwwwwwwww..',
    '................',
    '................',
    '................',
  ],
  // Snowy tundra pine — narrow silhouette, snow (e) on branch tips, dark needles (D)
  tundra_tree: [
    '.......p........',
    '......pep.......',
    '.....pepep......',
    '....peDeep......',
    '...peDDeDeep....',
    '..peeDDDDeep....',
    '.peeeDDDDDeep...',
    'peeDDDDdDDDeep..',
    '.peeeeeeeeeeep..',
    '.......TT.......',
    '.......TT.......',
    '.......tT.......',
    '................',
    '................',
    '................',
    '................',
  ],
  // Saguaro cactus — tall trunk, two arms, 3/4 shading (H=highlight left, C=mid, c=shadow)
  cactus: [
    '.......HC.......',
    '.......HC.......',
    '..H....HC....C..',
    '..HC...HC...HC..',
    '..HCCCCHCCCCC...',
    '...HCCCHCCCC....',
    '....HCCHCCC.....',
    '....HCCHCCC.....',
    '....HCCHCCC.....',
    '....HCCHCCC.....',
    '....HCCHCCC.....',
    '....HCCHCCC.....',
    '....HCCHCCC.....',
    '....ccccccc.....',
    '................',
    '................',
  ],
};
const TREE_SEASON_PAL = [
  { '.':null, 'p':'#0a3006', 'D':'#2a7a20', 'd':'#155010', 'l':'#40a030', 'T':'#5a3410', 't':'#3a2008' }, // Spring
  { '.':null, 'p':'#092604', 'D':'#1a5c12', 'd':'#0d3808', 'l':'#2e8c20', 'T':'#5a3410', 't':'#3a2008' }, // Summer
  { '.':null, 'p':'#3a1a04', 'D':'#b05810', 'd':'#783008', 'l':'#d07018', 'T':'#5a3410', 't':'#3a2008' }, // Autumn
  { '.':null, 'p':'#282820', 'D':'#303830', 'd':'#202820', 'l':'#404840', 'T':'#5a3410', 't':'#3a2008' }, // Winter
];

const STAMP_PAL = {
  tree: { '.':null, 'p':'#092604', 'D':'#1a5c12', 'd':'#0d3808', 'l':'#2e8c20', 'T':'#5a3410', 't':'#3a2008' },
  mtn:  { '.':null, 'W':'#ecf0ff', 's':'#8890a0', 'm':'#505560' },
  hill: { '.':null, 'h':'#6a5530', 'H':'#a88048' },
  peak: { '.':null, 'W':'#f4f8ff', 'w':'#c0ccec' },
  // Snowy tundra pine: e=snow, D=dark blue-green needles, d=deep shadow, T=grey trunk
  tundra_tree: { '.':null, 'p':'#1a2030', 'e':'#cce8ff', 'D':'#1a3828', 'd':'#0e2018', 'T':'#706878', 't':'#484050' },
  // Desert cactus: C=cactus green, H=highlight, c=shadow/base
  cactus: { '.':null, 'H':'#6ab840', 'C':'#4a8c28', 'c':'#1e4c10' },
};

// ── Villager sprites (16×16, 3/4 perspective, 2 frames) ──
const VSPRITE = {
  // Knight — full plate armour, great helm
  Knight: [
    [
      '......KKKKKK....','....KKKKkKKKK...','...KKKKkkkKKKK..','...KKVVVVVKKKk..','...KKVVVVVKKKk..','....KKKKKKKKk...','....AAAAAAAAAA..','...AAAAAAAAAAAA.','...AAAALLAAAAAA.','...AAAAAAAAAAAA.','....AAAAAAAAAA..','....AAAAAAAAAA..','....AA....AA....','....kk....kk....','....kk....kk....','................',
    ],
    [
      '......KKKKKK....','....KKKKkKKKK...','...KKKKkkkKKKK..','...KKVVVVVKKKk..','...KKVVVVVKKKk..','....KKKKKKKKk...','....AAAAAAAAAA..','...AAAAAAAAAAAA.','...AAAALLAAAAAA.','...AAAAAAAAAAAA.','....AAAAAAAAAA..','....AAAAAAAAAA..','...AAA....AA....','...kkk....kk....','...kkk....kk....','................',
    ],
  ],
  // Woodcutter — wide leather hat, brown jacket
  Woodcutter: [
    [
      '..BBBBBBBBBBBB..','...BbbbbbbbbBb..','....BssssssssB..','....seessssss...','....seessssss...','......ssss......','....JJJJJJJJ....','...JJJJJJJJJJ..','...JJJJJJJJJj..','...JJJJJJJJJj..','....JJJJJJJj....','....JJJJJJJj....','....JJ....JJ....','....jj....jj....','....jj....jj....','................',
    ],
    [
      '..BBBBBBBBBBBB..','...BbbbbbbbbBb..','....BssssssssB..','....seessssss...','....seessssss...','......ssss......','....JJJJJJJJ....','...JJJJJJJJJJ..','...JJJJJJJJJj..','...JJJJJJJJJj..','....JJJJJJJj....','....JJJJJJJj....','...JJJ....JJ....','...jjj....jj....','...jjj....jj....','................',
    ],
  ],
  // Builder — yellow hard hat, orange vest
  Builder: [
    [
      '.....YYYYYYYY...','....YyyyyyyyYy..','....YssssssssY..','....seessssss...','....seessssss...','......ssss......','....OOOOOOOO....','...OOOOOOOOOO...','...OOOOOOOOOo...','...OOOOOOOOoo...','....OOOOOOoo....','....PPPPPPPp....','....PP....PP....','....pp....pp....','....pp....pp....','................',
    ],
    [
      '.....YYYYYYYY...','....YyyyyyyyYy..','....YssssssssY..','....seessssss...','....seessssss...','......ssss......','....OOOOOOOO....','...OOOOOOOOOO...','...OOOOOOOOOo...','...OOOOOOOOoo...','....OOOOOOoo....','....PPPPPPPp....','...PPP....PP....','...ppp....pp....','...ppp....pp....','................',
    ],
  ],
  // Basic — simple tunic, dark hair
  Basic: [
    [
      '.....HHHHHH.....','....HHHhHHHH....','....HHssssHH....','....seessssss...','....seessssss...','......ssss......','....tttttttt....','...tttttttttt...','...tttttttttT...','...tttttttttT...','....tttttttT....','....TTTTTTTt....','....TT....TT....','....tt....tt....','....bb....bb....','................',
    ],
    [
      '.....HHHHHH.....','....HHHhHHHH....','....HHssssHH....','....seessssss...','....seessssss...','......ssss......','....tttttttt....','...tttttttttt...','...tttttttttT...','...tttttttttT...','....tttttttT....','....TTTTTTTt....','...TTT....TT....','...ttt....tt....','...bbb....bb....','................',
    ],
  ],
};
const VPAL = {
  Knight:     { '.':null, 'K':'#a8a090', 'k':'#585048', 'V':'#180c08', 'A':'#787060', 'L':'#c8c0b0' },
  Woodcutter: { '.':null, 'B':'#5c3010', 'b':'#3a1e08', 's':'#d4a060', 'e':'#180800', 'J':'#5c3818', 'j':'#3a2410' },
  Builder:    { '.':null, 'Y':'#f0c020', 'y':'#a88010', 's':'#d4a060', 'e':'#180800', 'O':'#c86010', 'o':'#783408', 'P':'#7a5030', 'p':'#4a3020' },
  Basic:      { '.':null, 'H':'#4a3828', 'h':'#2a2018', 's':'#d4a060', 'e':'#180800', 't':'#8a7060', 'T':'#5a4838', 'b':'#3a2818' },
  Farmer:     { '.':null, 'G':'#c8a020', 'g':'#907010', 's':'#d4a060', 'e':'#180800', 'C':'#286018', 'c':'#1a3e10', 'N':'#9a7840', 'n':'#6a5028' },
};
// Farmer — wide straw hat, green tunic
VSPRITE.Farmer = [
  [
    '.GGGGGGGGGGGGGG.','..GggggggggggG..','....GssssssssG..','....seessssss...','....seessssss...','......ssss......','....CCCCCCCC....','...CCCCCCCCCC...','...CCCCCCCCCc...','...CCCCCCCCcc...','....CCCCCCcc....','....NNNNNNNn....','....NN....NN....','....nn....nn....','....nn....nn....','................',
  ],
  [
    '.GGGGGGGGGGGGGG.','..GggggggggggG..','....GssssssssG..','....seessssss...','....seessssss...','......ssss......','....CCCCCCCC....','...CCCCCCCCCC...','...CCCCCCCCCc...','...CCCCCCCCcc...','....CCCCCCcc....','....NNNNNNNn....','...NNN....NN....','...nnn....nn....','...nnn....nn....','................',
  ],
];

// Stone Miner — stone-gray cap, rough tunic, pickaxe stance
VSPRITE.StoneMiner = [
  [
    '.....MMMMMM.....','....MMMMmMMM....','....MssssssM....','....seessssss...','....seessssss...','......ssss......','....GGGGGGGG....','...GGGGGGGGGG...','...GGGGGGGGGg...','...GGGGGGGGGg...','....GGGGGGGg....','....GGGGGGGg....','....SS....SS....','....ss....ss....','....ss....ss....','................',
  ],
  [
    '.....MMMMMM.....','....MMMMmMMM....','....MssssssM....','....seessssss...','....seessssss...','......ssss......','....GGGGGGGG....','...GGGGGGGGGG...','...GGGGGGGGGg...','...GGGGGGGGGg...','....GGGGGGGg....','....GGGGGGGg....','...SSS....SS....','...sss....ss....','...sss....ss....','................',
  ],
];
VPAL.StoneMiner = { '.':null, 'M':'#5a5550', 'm':'#3a3530', 's':'#d4a060', 'e':'#180800', 'G':'#7a6858', 'g':'#4a3828', 'S':'#8a8078' };

// Toolsmith — dark leather cap and apron, forge-worn
VSPRITE.Toolsmith = [
  [
    '.....DDDDDD.....','....DDDDdDDD....','....DssssssD....','....seessssss...','....seessssss...','......ssss......','....LLLLLLLL....','...LLLLLLLLLL...','...LLLLLLLLLl...','...LLLLLLLLLl...','....LLLLLLLl....','....LLLLLLLl....','....CC....CC....','....cc....cc....','....cc....cc....','................',
  ],
  [
    '.....DDDDDD.....','....DDDDdDDD....','....DssssssD....','....seessssss...','....seessssss...','......ssss......','....LLLLLLLL....','...LLLLLLLLLL...','...LLLLLLLLLl...','...LLLLLLLLLl...','....LLLLLLLl....','....LLLLLLLl....','...CCC....CC....','...ccc....cc....','...ccc....cc....','................',
  ],
];
VPAL.Toolsmith = { '.':null, 'D':'#4a3020', 'd':'#2a1808', 's':'#d4a060', 'e':'#180800', 'L':'#3a2818', 'l':'#1a1008', 'C':'#382820', 'c':'#201810' };

// Baker — tall toque blanche, flour-dusted white apron
VSPRITE.Baker = [
  [
    '....WWWWWWWW....','....WWwwwwWW....','....WssssssW....','....seessssss...','....seessssss...','......ssss......','....AAAAAAAA....','...AAAAAAAAAA...','...AAAAAAAAAa...','...AAAAAAAAAa...','....AAAAAAAAa...','....AAAAAAAAa...','....PP....PP....','....pp....pp....','....pp....pp....','................',
  ],
  [
    '....WWWWWWWW....','....WWwwwwWW....','....WssssssW....','....seessssss...','....seessssss...','......ssss......','....AAAAAAAA....','...AAAAAAAAAA...','...AAAAAAAAAa...','...AAAAAAAAAa...','....AAAAAAAAa...','....AAAAAAAAa...','...PPP....PP....','...ppp....pp....','...ppp....pp....','................',
  ],
];
VPAL.Baker = { '.':null, 'W':'#ece8e0', 'w':'#b8b0a0', 's':'#d4a060', 'e':'#180800', 'A':'#f0ece4', 'a':'#b0a898', 'P':'#5a4838', 'p':'#3a2e24' };

// Archer — forest-green hood, leather quiver on back, bow stance
VSPRITE.Archer = [
  [
    '.....VVVVVV.....','....VVVvvVVV....','....VVssssVV....','....seessssss...','....seessssss...','......ssss......','....GGGGGGGG....','...GGGGGGGGGG...','...GGGGGQGGGg...','...GGGGGQGGgg...','....GGGGGGgg....','....GGGGGGGg....','....LL....LL....','....ll....ll....','....ll....ll....','................',
  ],
  [
    '.....VVVVVV.....','....VVVvvVVV....','....VVssssVV....','....seessssss...','....seessssss...','......ssss......','....GGGGGGGG....','...GGGGGGGGGG...','...GGGGGQGGGg...','...GGGGGQGGgg...','....GGGGGGgg....','....GGGGGGGg....','...LLL....LL....','...lll....ll....','...lll....ll....','................',
  ],
];
VPAL.Archer = { '.':null, 'V':'#2a6020', 'v':'#1a3c14', 's':'#d4a060', 'e':'#180800', 'G':'#3a7030', 'g':'#1e4018', 'Q':'#5a3a18', 'L':'#5a3818', 'l':'#3a2010' };

// Mechanic — blue-grey work cap, slate coat with tool belt
VSPRITE.Mechanic = [
  [
    '.....MMMMMM.....','....MMMMmMMM....','....MssssssM....','....seessssss...','....seessssss...','......ssss......','....CCCCCCCC....','...CCCCCCCCCC...','...CCCCCCCCCc...','...CCCCCBBBBc...','....CCCCCBBb....','....CCCCCBBb....','....LL....LL....','....ll....ll....','....ll....ll....','................',
  ],
  [
    '.....MMMMMM.....','....MMMMmMMM....','....MssssssM....','....seessssss...','....seessssss...','......ssss......','....CCCCCCCC....','...CCCCCCCCCC...','...CCCCCCCCCc...','...CCCCCBBBBc...','....CCCCCBBb....','....CCCCCBBb....','...LLL....LL....','...lll....ll....','...lll....ll....','................',
  ],
];
VPAL.Mechanic = { '.':null, 'M':'#5c3820', 'm':'#3c2010', 's':'#d4a060', 'e':'#180800', 'C':'#9a7850', 'c':'#6a5030', 'B':'#8a6840', 'b':'#5a4828', 'L':'#4a3820', 'l':'#2a1c10' };

// Explorer — wide adventurer hat, blue coat
VSPRITE.Explorer = [
  [
    '..HHHHHHHHHHHH..','...HhhhhhhhhHh..','....HssssssssH..','....seessssss...','....seessssss...','......ssss......','....BBBBBBBB....','...BBBBBBBBBB...','...BBBBBBBBBb...','...BBBBBBBBbb...','....BBBBBBbb....','....LLLLLLLl....','....LL....LL....','....ll....ll....','....KK....KK....','................',
  ],
  [
    '..HHHHHHHHHHHH..','...HhhhhhhhhHh..','....HssssssssH..','....seessssss...','....seessssss...','......ssss......','....BBBBBBBB....','...BBBBBBBBBB...','...BBBBBBBBBb...','...BBBBBBBBbb...','....BBBBBBbb....','....LLLLLLLl....','...LLL....LL....','...lll....ll....','...KKK....KK....','................',
  ],
];
VPAL.Explorer = { '.':null, 'H':'#5c3010', 'h':'#3a1e08', 's':'#d4a060', 'e':'#180800', 'B':'#2060c0', 'b':'#104880', 'L':'#1848a0', 'l':'#0c3070', 'K':'#4a3020' };

function pickName() {
  const pool = V_NAMES.filter(n => !_usedNames.has(n));
  const name = pool.length ? pool[Math.floor(Math.random()*pool.length)] : 'Villager';
  _usedNames.add(name); return name;
}
