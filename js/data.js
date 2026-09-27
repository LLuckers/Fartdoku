/* Fartdoku – Spieldaten: Verdächtige, Räume, Möbel, Snacks, Schlosspläne und Fälle. */
(function () {
  'use strict';
  const FD = (globalThis.Fartdoku = globalThis.Fartdoku || {});

  FD.DOGS = [
    {
      id: 'pierre', name: 'Pierre', color: '#FF4B4B', title: 'Der Aristokrat',
      bio: 'Trägt Baskenmütze zum Frühstück und hält Samtkissen für ein Grundrecht.',
      quirk: 'Riecht nach Arroganz. Behauptet, Pansen sei unter seiner Würde.',
      fartClass: 'Parfümiert, aber tödlich',
    },
    {
      id: 'pupsalot', name: 'Sir Pupsalot', color: '#FFB627', title: 'Der Gentleman',
      bio: 'Zylinder, Monokel, tadellose Manieren. Traut sich wegen des brummenden Kühlschranks nicht in die Küche.',
      quirk: 'Entschuldigt sich stets höflich – meistens zu spät.',
      fartClass: 'Leise, lang, britisch',
    },
    {
      id: 'bruno', name: 'Bruno', color: '#2EC4B6', title: 'Der Staubsauger',
      bio: 'Frisst alles, was nicht bei drei auf dem Schrank ist. Und manches, was dort ist.',
      quirk: 'Goldkette, Herz aus Gold, Magen aus Beton.',
      fartClass: 'Presslufthammer',
    },
    {
      id: 'mimi', name: 'Madame Mimi', color: '#FF3E8A', title: 'Die Diva',
      bio: 'Perlenkette, rosa Schleife und die feste Überzeugung, niemals zu pupsen.',
      quirk: 'Fällt in Ohnmacht, sobald jemand „Harzer“ sagt.',
      fartClass: 'Unbeweisbar',
    },
    {
      id: 'gaston', name: 'Gaston', color: '#FF7A2F', title: 'Der Gourmet',
      bio: 'Hat den Schlüssel zur Speisekammer und einen sehr verdächtigen Kochlöffel.',
      quirk: 'Nennt jeden Snack „eine Komposition“.',
      fartClass: 'Mit Knoblauchnote',
    },
    {
      id: 'baron', name: 'Baron von Blähung', color: '#7B61FF', title: 'Der Hausherr',
      bio: 'Dem Baron gehört das Schloss, die Krone und angeblich auch die Luft darin.',
      quirk: 'Lässt Untergebene grundsätzlich vorgehen. Vor allem in Räume, in denen es riecht.',
      fartClass: 'Hochadelig',
    },
    {
      id: 'coco', name: 'Coco Chanpups', color: '#3EC1F3', title: 'Das It-Girl',
      bio: 'Herzchen-Sonnenbrille, 40 000 Follower und eine Schwäche für Bohneneintopf.',
      quirk: 'Postet jeden Snack, bevor sie ihn frisst.',
      fartClass: 'No. 5',
    },
  ];

  FD.SNACKS = {
    kaese: {
      name: 'Harzer Käse', nom: 'Der Harzer Käse', stink: 5,
      bio: 'Fermentiert, gereift, verboten. Schmilzt Erstausgaben aus drei Metern Entfernung.',
    },
    doener: {
      name: 'Dönerfleisch', nom: 'Das Dönerfleisch', stink: 3,
      bio: 'Vom Spieß gefallen, vom Frenchie gefunden. Hinterlässt eine fettige Spur.',
    },
    pansen: {
      name: 'Pansen', nom: 'Der Pansen', stink: 4,
      bio: 'Grün, getrocknet, geliebt. Der Duft kriecht durch jede Ritze.',
    },
    rosenkohl: {
      name: 'Rosenkohl', nom: 'Der Rosenkohl', stink: 3,
      bio: 'Gesund für Menschen, eine Chemiewaffe im Hundedarm.',
    },
    bohnen: {
      name: 'Bohneneintopf', nom: 'Der Bohneneintopf', stink: 4,
      bio: 'Die Köchin nennt ihn „Omas Rezept“. Das Schloss nennt ihn „Stufe 4“.',
    },
  };

  FD.ROOMS = {
    salon: { name: 'Salon', in: 'im Salon', In: 'Im Salon', color: '#FFC2D9' },
    bibliothek: { name: 'Bibliothek', in: 'in der Bibliothek', In: 'In der Bibliothek', color: '#D2C4FF' },
    kueche: { name: 'Küche', in: 'in der Küche', In: 'In der Küche', color: '#B8F0E6' },
    weinkeller: { name: 'Weinkeller', in: 'im Weinkeller', In: 'Im Weinkeller', color: '#EBCBA8' },
    ballsaal: { name: 'Ballsaal', in: 'im Ballsaal', In: 'Im Ballsaal', color: '#FFEBA3' },
    gewaechshaus: { name: 'Gewächshaus', in: 'im Gewächshaus', In: 'Im Gewächshaus', color: '#CDF2A8' },
    speisekammer: { name: 'Speisekammer', in: 'in der Speisekammer', In: 'In der Speisekammer', color: '#FFD3AE' },
    wintergarten: { name: 'Wintergarten', in: 'im Wintergarten', In: 'Im Wintergarten', color: '#BDE6FF' },
    butler: { name: 'Butlerzimmer', in: 'im Butlerzimmer', In: 'Im Butlerzimmer', color: '#E4DAD0' },
  };

  // sit: true = man kann darauf liegen; false = blockiert das Feld.
  FD.OBJECTS = {
    kissen: { name: 'Samtkissen', sit: true, on: 'auf einem Samtkissen', dat: 'einem Samtkissen' },
    teppich: { name: 'Teppich', sit: true, on: 'auf einem Teppich', dat: 'einem Teppich' },
    sessel: { name: 'Sessel', sit: true, on: 'in einem Sessel', dat: 'einem Sessel' },
    korb: { name: 'Hundekorb', sit: true, on: 'in einem Hundekorb', dat: 'einem Hundekorb' },
    regal: { name: 'Bücherregal', sit: false, dat: 'einem Bücherregal' },
    kuehlschrank: { name: 'Kühlschrank', sit: false, dat: 'einem Kühlschrank' },
    kamin: { name: 'Kamin', sit: false, dat: 'einem Kamin' },
    tisch: { name: 'Tisch', sit: false, dat: 'einem Tisch' },
    uhr: { name: 'Standuhr', sit: false, dat: 'einer Standuhr' },
    ruestung: { name: 'Ritterrüstung', sit: false, dat: 'einer Ritterrüstung' },
    pflanze: { name: 'Topfpflanze', sit: false, dat: 'einer Topfpflanze' },
    fass: { name: 'Weinfass', sit: false, dat: 'einem Weinfass' },
    herd: { name: 'Herd', sit: false, dat: 'einem Herd' },
    fluegel: { name: 'Flügel', sit: false, dat: 'einem Flügel' },
  };

  FD.LEVELS = [
    { level: 1, name: 'Leichter Mief' },
    { level: 2, name: 'Dicke Luft' },
    { level: 3, name: 'Grüne Wolke' },
    { level: 4, name: 'Biologischer Ökodemozid' },
  ];

  FD.WITNESSES = {
    butler: { name: 'Der Butler', prefix: ['Mit Verlaub:', 'Wenn ich anmerken darf:', ''] },
    koechin: { name: 'Die Köchin', prefix: ['Ich schwöre beim Kochlöffel:', 'Na hören Sie mal:', ''] },
    labor: { name: 'Der Labor-Bericht', prefix: ['Messprotokoll:', 'Befund:', ''] },
    gaertner: { name: 'Der Gärtner', prefix: ['Ich sag mal so:', 'Ganz ehrlich:', ''] },
    zimmer: { name: 'Das Zimmermädchen', prefix: ['Ich hab nix gesagt, aber:', 'Also, unter uns:', ''] },
    katze: { name: 'Die Nachbarskatze', prefix: ['Miau. Übersetzt:', 'Mrrr …', ''] },
    analyst: { name: 'Der Tatort-Analyst', prefix: ['Spurenlage eindeutig:', 'Laut Geruchsprofil:', ''] },
  };

  // Schlosspläne. rooms: ein Buchstabe pro Feld (siehe ROOM_CODES).
  // objects: '.' = leer, Kleinbuchstaben = Liegeplatz, Großbuchstaben = Möbel (blockiert).
  FD.ROOM_CODES = {
    S: 'salon', B: 'bibliothek', K: 'kueche', W: 'weinkeller', A: 'ballsaal',
    G: 'gewaechshaus', P: 'speisekammer', T: 'wintergarten', J: 'butler',
  };
  FD.OBJECT_CODES = {
    k: 'kissen', t: 'teppich', s: 'sessel', h: 'korb',
    R: 'regal', F: 'kuehlschrank', K: 'kamin', T: 'tisch', U: 'uhr',
    A: 'ruestung', P: 'pflanze', W: 'fass', H: 'herd', G: 'fluegel',
  };

  FD.MAPS = {
    ostfluegel: {
      name: 'Der Ostflügel',
      rooms: ['SSBB', 'SSBB', 'KKKB', 'KKKB'],
      objects: ['k..R', '.K..', '..Ht', 'F...'],
    },
    erdgeschoss: {
      name: 'Das Erdgeschoss',
      rooms: ['SSSKK', 'SSSKK', 'BBPPK', 'BBPPK', 'BBBPP'],
      objects: ['k.K.F', '.s..H', 'R.h..', '.t.W.', '..U..'],
    },
    keller: {
      name: 'Der Keller',
      rooms: ['WWWPP', 'WWWPP', 'JJKKP', 'JJKKK', 'JJKKK'],
      objects: ['W..hT', '.W...', 'A...t', '.k.F.', '..H..'],
    },
    westfluegel: {
      name: 'Der Westflügel',
      rooms: ['SSSBBB', 'SSSBBB', 'SSKKBB', 'GGKKWW', 'GGKKWW', 'GGGWWW'],
      objects: ['k.K.R.', '..t...', 's....R', 'P.F...', '..H.W.', '.P..hW'],
    },
    obergeschoss: {
      name: 'Das Obergeschoss',
      rooms: ['AAAAJJ', 'AAAAJJ', 'TTAABB', 'TTSSBB', 'TTSSBB', 'TTSSSB'],
      objects: ['G....h', '..t.U.', 'P....R', '..k...', '.s.T..', 'P...A.'],
    },
    schloss: {
      name: 'Schloss Le Pups',
      rooms: ['SSSAAAA', 'SSSAAAA', 'SSBBAAT', 'KKBBBTT', 'KKBBBTT', 'PKKWWTT', 'PPPWWWW'],
      objects: ['k.K..G.', '.s...t.', '...R..P', 'F..t...', '.H..U.s', '..T...P', 'h...W.W'],
    },
    gesamtplan: {
      name: 'Der Gesamtplan',
      rooms: ['SSSSBBBB', 'SSSSBBBB', 'SSAAABBJ', 'GGAAAKJJ', 'GGAAAKKK', 'GGTTWKKK', 'TTTTWWPP', 'TTTWWWPP'],
      objects: ['k..K.R.R', '.s.t..t.', '.....U.h', 'P.G....A', '..k..F..', '.P..W.H.', 's..P...k', '.t...W.T'],
    },
  };

  FD.MAPS_BY_SIZE = { 4: ['ostfluegel'], 5: ['erdgeschoss', 'keller'], 6: ['westfluegel', 'obergeschoss'], 7: ['schloss'], 8: ['gesamtplan'] };

  FD.CASES = [
    {
      id: 'fall-01', no: 1, title: 'Die Harzer-Käse-Explosion', level: 1, map: 'ostfluegel', snack: 'kaese',
      dogs: ['pierre', 'pupsalot', 'bruno'],
      story: 'Das Schloss wurde evakuiert. Die Erstausgaben in der Bibliothek schmelzen dahin. Finde den Furz-Frenchie!',
      // Handgebauter Einstiegsfall aus dem Spielkonzept.
      clues: [
        { type: 'on', t: 'pierre', obj: 'kissen', w: 'butler', text: '„Pierre schwor bei seiner Ehre, den Abend auf dem Samtkissen verbracht zu haben. Er roch nach Arroganz, aber keinesfalls nach Käse!“' },
        { type: 'notin', t: 'pupsalot', room: 'kueche', w: 'koechin', text: '„Sir Pupsalot war nie in meiner Küche – der traut sich wegen des brummenden Kühlschranks nicht rein.“' },
        { type: 'notin', t: 'pupsalot', room: 'salon', w: 'pupsalot', text: '„Ich lag friedlich im Salon … Moment, nein, da lag ja Pierre! Im Salon war ich jedenfalls nicht.“' },
        { type: 'beside', t: 'bruno', obj: 'kuehlschrank', w: 'koechin', text: '„Bruno lag direkt neben meinem brummenden Kühlschrank und hat ihn angeknurrt.“' },
        { type: 'in', t: 'snack', room: 'bibliothek', w: 'labor', text: '„Die Methan-Probe aus der Bibliothek zeigt 99 % fermentierten Harzer Käse.“' },
        { type: 'on', t: 'snack', obj: 'teppich', w: 'analyst', text: '„Der Harzer Käse lag auf einem Teppich. Der Teppich ist nicht mehr zu retten.“' },
      ],
    },
    {
      id: 'fall-02', no: 2, title: 'Döner um Mitternacht', level: 1, map: 'erdgeschoss', snack: 'doener',
      story: 'Um 0:03 Uhr schlug der Rauchmelder an. Es war kein Rauch. In der Luft hängt eine fettige Döner-Note.',
    },
    {
      id: 'fall-03', no: 3, salt: '6', title: 'Pansen-Panik im Keller', level: 1, map: 'keller', snack: 'pansen',
      story: 'Der Butler stieg in den Keller, um einen Rotwein zu holen. Er kam mit tränenden Augen und ohne Wein zurück.',
    },
    {
      id: 'fall-04', no: 4, salt: '6', title: 'Der Rosenkohl-Vorfall', level: 2, map: 'erdgeschoss', snack: 'rosenkohl',
      story: 'Die Köchin wollte die Hunde „gesünder ernähren“. Das Ergebnis ist ein Gasleck der Kategorie Grün.',
    },
    {
      id: 'fall-05', no: 5, salt: '5', title: 'Bohnen, Butler, Blähungen', level: 2, map: 'keller', snack: 'bohnen',
      story: 'Ein Topf Bohneneintopf ist verschwunden. Seitdem trägt der Butler eine Wäscheklammer auf der Nase.',
    },
    {
      id: 'fall-06', no: 6, title: 'Das Käse-Komplott', level: 2, map: 'westfluegel', snack: 'kaese',
      story: 'Jemand hat den Harzer Käse aus dem Tresor geholt. Die Tapeten im Westflügel lösen sich von der Wand.',
    },
    {
      id: 'fall-07', no: 7, salt: '3', title: 'Walzer mit Rückenwind', level: 3, map: 'obergeschoss', snack: 'bohnen',
      story: 'Beim Ball des Barons ertönte mitten im Walzer ein tiefes Tuba-Solo. Es war keine Tuba im Orchester.',
    },
    {
      id: 'fall-08', no: 8, salt: '1', title: 'Grüne Welle im Gewächshaus', level: 3, map: 'westfluegel', snack: 'rosenkohl',
      story: 'Im Gewächshaus sind über Nacht alle Tomaten verwelkt. Der Gärtner schwört, es lag nicht am Dünger.',
    },
    {
      id: 'fall-09', no: 9, salt: '7', title: 'Die lange Nacht der Döner', level: 3, map: 'schloss', snack: 'doener',
      story: 'Ein kompletter Dönerspieß ist verschwunden. Die Spur führt durch das ganze Schloss – und sie glänzt.',
    },
    {
      id: 'fall-10', no: 10, salt: '4', title: 'Operation Stinkbombe', level: 4, map: 'schloss', snack: 'pansen',
      story: 'Das Schloss wurde zum Sperrgebiet erklärt. Ein Spezialkommando mit Gasmasken bittet um Ihre Expertise.',
    },
    {
      id: 'fall-11', no: 11, salt: '3', title: 'Das große Beben von Le Pups', level: 3, map: 'gesamtplan', snack: 'kaese',
      story: 'Seismografen in drei Bundesländern schlugen aus. Die Quelle: Schloss Le Pups. Die Ursache: mutmaßlich Käse.',
    },
    {
      id: 'fall-12', no: 12, salt: '14', title: 'Biologischer Ökodemozid', level: 4, map: 'gesamtplan', snack: 'bohnen',
      story: 'Das Ozonloch über dem Schloss hat jetzt einen eigenen Namen. Alle sieben Frenchies sind verdächtig. Keiner hat ein Alibi.',
    },
  ];

  for (const c of FD.CASES) c.n = FD.MAPS[c.map].rooms.length;

  FD.RANDOM_TITLES = [
    'Ein Hauch von Verdacht', 'Das Phantom der Speisekammer', 'Stille Wasser, laute Winde',
    'Die Gaswolke von nebenan', 'Mief im Morgengrauen', 'Der Duft der Anklage',
    'Ein Furz im Frack', 'Kammerjäger ratlos', 'Die Nase der Gerechtigkeit',
  ];
  FD.RANDOM_STORIES = [
    'Schon wieder. Der Butler hat gekündigt, die Köchin ist im Urlaub, und irgendwas liegt in der Luft.',
    'Die Fenster sind beschlagen – von innen. Irgendwer hat verbotene Snacks gefunden.',
    'Die Kerzen im Schloss sind ausgegangen. Nicht vom Wind. Also, nicht von dem Wind.',
    'Ein anonymer Hinweis ging ein: „Es riecht, als hätte jemand einen Käse beleidigt.“',
  ];
})();
