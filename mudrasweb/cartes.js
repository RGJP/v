"use strict";

const cartes = [
  {
    "theme": "Détente",
    "devise": "ne t’en fais pas",
    "nom": "Mudra Relaxe",
    "sousTitre": "",
    "texte": [
      "Les tensions nous volent notre énergie — débarrassons-nous-en.",
      "Commencez par jouer à la « marionnette ». Vous vous imaginez que des fils fixés aux bras et aux jambes sont manipulés et bougés d’en haut. Vous levez bras et jambe puis vous vous laissez lentement et doucement tomber par terre sur l’expiration comme une poupée molle. Ensuite, vous vous tirez de nouveau dans le sens de la hauteur pour vous écrouler aussitôt après — ceci plusieurs fois de suite. Oubliez que cela puisse paraître loufoque !",
      "À présent, tenez le mudra en position assise ou couchée, tout en pensant à des vagues qui vous environnent et vous lèchent doucement en emportant toutes les tensions dans la mer. En même temps, expirez plusieurs fois lentement et profondément."
    ],
    "affirmation": "L’eau douce et chaude me détend et me caresse.",
    "numero": 46
  },
  {
    "theme": "Réconfort",
    "devise": "laisse-toi porter",
    "nom": "Mudra des reins",
    "sousTitre": "",
    "texte": [
      "Renforce les reins, réchauffe et apaise.",
      "Recherchons donc constamment le réconfort et la proximité, comme le font les enfants. Nous les trouvons chez nos proches qui vivent encore ou se trouvent déjà dans le monde spirituel, auprès d’êtres supérieurs, de saints, de notre sainte Mère Marie, etc.",
      "Disposez des photographies ou des objets correspondants en un endroit spécial.",
      "Même un bain parfumé nous apporte réconfort et chaleur. Ou bien, imaginez être plongé dans un bain luxueux, et laissez-vous caresser et cajoler par l’eau douce et chaude."
    ],
    "affirmation": "Tel un enfant, je cherche et trouve un réconfort humain et céleste, qui me porte, me protège et m’enveloppe d’amour.",
    "numero": 45
  },
  {
    "theme": "Sexualité",
    "devise": "sois sensuel",
    "nom": "Mudra Kundalini",
    "sousTitre": "Symbole du serpent",
    "texte": [
      "Ce mudra éveille la sensualité et les forces sexuelles.",
      "La sexualité et la sensualité ne cessent pas avec l’âge car les organes sexuels et les glandes endocrines fonctionnent toute la vie. Et cela est bien.",
      "La sensualité suppose d’une part de laisser en éveil tous les sens, c’est-à-dire de toucher, sentir, goûter, entendre, voir, ressentir consciemment ; et d’autre part de se sentir uni en amour aux autres, à la nature et, sur le plan spirituel, aux forces cosmiques.",
      "Ouvrez vos sens et votre cœur à tout ce qui est vivant, bon et beau. Cette attitude se transmet à l’extérieur de vous et vous devenez une personne remarquable et désirable."
    ],
    "affirmation": "Le cœur ouvert, je rencontre mon environnement et reçois en retour de la sympathie et de l’amour.",
    "numero": 15
  },
  {
    "theme": "Amitié",
    "devise": "je t’aime",
    "nom": "Mudra de l’amitié",
    "sousTitre": "",
    "texte": [
      "Renforce le cœur, les poumons et les reins.",
      "Les bonnes amitiés embellissent, facilitent et prolongent la vie — elles en sont les épices. Avec ce mudra, vous faites du bien à vos amis et à vous-mêmes, car tout ce que vous émettez revient en retour de la même façon.",
      "Vous envoyez en esprit un sourire tendre et encourageant à vos amis et aux membres de votre famille, et vous observez comment ces personnes y répondent."
    ],
    "affirmation": "qu’IL te porte sur mille mains,\nqu’IL te touche de mille lèvres,\nqu’IL t’aime de mille cœurs,\nqu’IL brille pour toi de millions d’étoiles.",
    "numero": 13
  },
  {
    "theme": "Acceptation",
    "devise": "entrez en harmonie avec vous-même",
    "nom": "Mudra du bassin",
    "sousTitre": "",
    "texte": [
      "Ce mudra atténue les crampes dans le ventre et aide en cas de troubles menstruels.",
      "Pour commencer, masser env. 100 fois l’annulaire et le petit doigt des deux mains. Tout en pratiquant le mudra, respirez profondément dans le ventre et représentez-vous que des tensions du bassin se libèrent à chaque expiration.",
      "Puis posez les mains sur le ventre et laissez consciemment leur chaleur (énergie) s’y diffuser.",
      "Dessinez en esprit un mandala sur de la soie avec beaucoup de rouge, d’orange et de jaune, posez l’image comme un enveloppement chaud sur le ventre et laissez agir ces couleurs régénératrices et guérisseuses dans votre bassin."
    ],
    "affirmation": "Je profite et jouis des bons moments et me chouchoute quand j’en ai besoin.",
    "numero": 12
  },
  {
    "theme": "Intention",
    "devise": "sois vrai",
    "nom": "Mudra Vayu",
    "sousTitre": "",
    "texte": [
      "Le mudra du vent aide contre tous les troubles occasionnés par un excès de vent : ballonnements, rhumatismes, arthrose, sciatique, tremblement des membre. En cas de troubles aigus, tenir le mudra aussi longtemps que nécessaire ; en cas de mal chronique, 4 fois par jour pendant env. 10 minutes.",
      "Veillez à ce que vos paroles, vos attentes et vos désirs correspondent à vos pensées : que le dedans soit comme le dehors !",
      "Voyez-vous en esprit comblé de réussite, de satisfaction et de bonheur. Cette représentation attire comme un aimant dans votre vie tout ce qui correspond à votre état intérieur."
    ],
    "affirmation": "Je nourris des sentiments aimants et des pensées positives, et attire magiquement ce qui est bon et digne d’être aimé.",
    "numero": 26
  },
  {
    "theme": "Engagement",
    "devise": "fais de ton mieux",
    "nom": "Mudra Feu",
    "sousTitre": "",
    "texte": [
      "Ce mudra recentre, stabilise et confère une sécurité intérieure.",
      "Restez fidèle à vous-même, donnez du mieux que vous pouvez, même si cela vous paraît dérisoire. Notre don ne peut pas toujours être optimal, mais au moins nous pouvons faire du mieux que nous pouvons. A posteriori, il s’avère souvent qu’un engagement, aussi faible qu’il nous paraisse, provoque davantage que nous ne pensions. Comme si une puissance invisible complétait ce qui manque.",
      "Vous placez votre agir et non-agir, c’est-à-dire toute votre vie, dans la lumière cosmique, qui lui donnera sa véritable valeur et profondeur."
    ],
    "affirmation": "Je donne du mieux que je peux, et me laisse offrir le reste.",
    "numero": 7
  },
  {
    "theme": "Intuition",
    "devise": "tu le sais",
    "nom": "Mudra Coquillage",
    "sousTitre": "",
    "texte": [
      "Le mudra Shankh convient à la gorge et à la voix ; il apporte un calme et une harmonie intérieurs et réveille l’intuition.",
      "La main droite symbolise un coquillage marin ; le pouce gauche la perle qui s’y loge, c’est-à-dire votre Soi supérieur, qui sait ce dont vous avez besoin et ce qui est juste et important pour vous.",
      "À chaque expiration, chantez un OM profond, long et fort (syllabe originelle, qui fait vibrer toutes les cellules) et représentez-vous comment vous pénétrez plus profondément dans votre for intérieur à chaque respiration — là où le Soi supérieur tient à disposition toutes les réponses à vos questions. Puis devenez silencieux et préparez-vous à entendre la voix intérieure."
    ],
    "affirmation": "Au plus profond de moi, je sais ce qui est juste et important pour moi.",
    "numero": 23
  },
  {
    "theme": "Lâcher-prise",
    "devise": "lâche prise, tout simplement",
    "nom": "Mudra de la vessie",
    "sousTitre": "Mudra Makara-Sadana de Bali",
    "texte": [
      "Fortifie la vessie, détoxique, nettoie. De plus, active la circulation, rafraîchit et réveille l’esprit.",
      "Tenir les mains sous une eau courante et expirer profondément quelques fois. Vous évacuez tout ce qui vous oppresse, vous pèse et vous fait souffrir, à l’aide de l’eau d’une part et d’une expiration puissante d’autre part. Vous confiez tout aux éléments air et eau.",
      "Puis vous tenez le mudra et vous vous voyez dans une lumière pure et rayonnante. Rafraîchi, vous repartez d’un pas joyeux et léger sur le chemin de votre vie."
    ],
    "affirmation": "Mon cœur est léger, mon pas allègre, ma tête est libre, ce que j’entreprends réussit.",
    "numero": 49
  },
  {
    "theme": "Attention",
    "devise": "écoute bien",
    "nom": "Mudra du ciel",
    "sousTitre": "",
    "texte": [
      "Le mudra Shunya aide contre les problèmes de nuque et d’oreille de toutes sortes. En cas de troubles aigus, tenir le mudra aussi longtemps que nécessaire. Dans les cas chroniques, pratiquer 4 fois par jour pendant env. 10 minutes.",
      "La musique guérit, et les compositions de Mozart sont les mieux étudiées sur ce point. Écoutez votre CD préféré ou du Mozart en vous détendant. La mâchoire inférieure pend souplement et si la sécrétion salivaire s’en trouve activée, la détente est parfaite. Maîtrisez vos pensées — et écoutez attentivement la musique à l’exclusion de tout autre son ou bruit."
    ],
    "affirmation": "Dans les sons célestes, je reconnais la bonté et la perfection de l’univers.",
    "numero": 56
  },
  {
    "theme": "Persévérance",
    "devise": "je peux attendre",
    "nom": "Mudra de la patience",
    "sousTitre": "",
    "texte": [
      "Ce mudra fortifie le foie, régule la chaleur du corps et égalise les émotions trop vives ainsi que les déchirements intérieurs.",
      "Tout ce qui croît, se régénère (par exemple dans un processus de guérison), se développe et se déploie, a besoin de temps. Au lieu de gaspiller impatiemment notre énergie, nous pouvons utiliser le temps d’attente, l’embellir et en tirer le meilleur parti.",
      "Laissez-vous donner par un arbre géant que vous imaginez, la force de la patience, de la constance, de l’endurance, de la persévérance et du calme intérieur. Vous inspirez son énergie profondément."
    ],
    "affirmation": "Ma patience et mon calme intérieurs se développent d’instant en instant.",
    "numero": 43
  },
  {
    "theme": "Valeur de soi",
    "devise": "je me suis fidèle",
    "nom": "Mudra de la valeur de soi",
    "sousTitre": "",
    "texte": [
      "Je suis un enfant de l’univers et mérite d’être aimé et respecté, de réussir et d’être heureux. Je me traite bien et me chouchoute raisonnablement. Je prends mon parti, et m’encourage moi-même. Je m’aime même quand je ne l’ai pas mérité, car c’est alors que j’en ai le plus besoin. Personne n’est parfait et mes faiblesses et mes erreurs sont comme des portes vers des mondes nouveaux, qui s’ouvrent dès que j’abandonne ce qui est négatif et qui entrave.",
      "Contemplez en esprit un paysage sauvage et varié. Chaque plante, chaque animal a sa propre valeur et contribue à la bonne santé et à l’harmonie de l’ensemble."
    ],
    "affirmation": "Je suis important et juste, tel que je suis. Je contribue au bien de tous.",
    "numero": 60
  },
  {
    "theme": "Courage",
    "devise": "montre qui tu es",
    "nom": "Mudra Durga",
    "sousTitre": "",
    "texte": [
      "Ce mudra anti-panique est dédié à la déesse invaincue, Durga. Assise sur un lion feulant, elle tient une arme dans chaque main de ses multiples bras, et la brandit pour tuer ou mettre en fuite ses ennemis.",
      "L’important, lors d’une crise de panique, est de contenir l’inspiration, de forcer l’expiration, de serrer fortement les mains, de fléchir légèrement les genoux et de se concentrer sur la plante des pieds.",
      "Vous êtes Durga, lançant son cri de guerre et brandissant ses armes. Votre seule apparition vous vaut le respect. Peut-être cette image vous fait-elle rire — tant mieux !"
    ],
    "affirmation": "L’épouvante n’est qu’un fantôme. Je le renvoie d’un coup dans les airs, triomphalement.",
    "numero": 4
  },
  {
    "theme": "Patrie intérieure",
    "devise": "protection et sécurité en soi",
    "nom": "Mudra Shakti",
    "sousTitre": "",
    "texte": [
      "Ce mudra aide en cas de problèmes d’endormissement et de tensions dans le bassin. Expirez profondément et lentement plusieurs fois.",
      "Le mudra Shakti est dédié à la déesse de la force vitale, qui nous mène et guide à travers la vie. Comme une bonne mère ou une amie, elle nous seconde et protège dans les périodes de solitude, lorsque nous nous sentons seuls et abandonnés.",
      "Représentez-vous en esprit la Grande Mère originelle, et priez-la de vous donner ce dont vous avez besoin dans le moment. Même après la nuit la plus sombre, le soleil se lève de nouveau et apporte un nouvel espoir, de bonnes choses, de la joie."
    ],
    "affirmation": "Je fais confiance à la déesse maternelle, qui m’offre sa compagnie et me réchauffe de son réconfort.",
    "numero": 21
  },
  {
    "theme": "Confiance et assurance",
    "devise": "fais confiance",
    "nom": "Mudra Vajrapradama",
    "sousTitre": "Sceau de la confiance inébranlable",
    "texte": [
      "Vous posez les mains tout en haut du sternum — là où se trouve, dans les chansons anciennes, la chambre cachée de l’âme.",
      "Nous ne savons souvent plus comment continuer, mais soudain, nous sentons que tout ira bien. Merveilleux, n’est-ce pas ?",
      "Vous vous voyez en esprit entreprendre une randonnée en montagne avec un guide. Vous êtes conduit sûrement jusqu’au but, qui vous rapproche un peu plus du ciel. Une vue splendide vous attend.",
      "Choisissez un objet (p. ex. une pierre) que vous placez à portée de main. Chaque fois que vous le touchez, dites :"
    ],
    "affirmation": "Je sais, tout ira bien.",
    "numero": 47
  },
  {
    "theme": "Faire une pause",
    "devise": "dépit : non merci",
    "nom": "Mudra de l’estomac",
    "sousTitre": "",
    "texte": [
      "Fortifie l’estomac et calme les nerfs.",
      "Toute irritation se répercute sur l’estomac, vole de l’énergie et démoralise. Si possible, ne vous laissez donc pas du tout gagner par le dépit, la colère, l’irritation. Ou bien évacuez aussitôt ces émotions en tambourinant des poings contre un mur et en tenant ensuite ce mudra. En même temps, vous inspirez lentement 10 fois par le nez et expirez fortement avec un son par la bouche.",
      "Puis le souffle redevient régulier et léger, et vous vous voyez avec un charmant sourire grâce auquel vous conquérez tranquillement le monde."
    ],
    "affirmation": "Mon calme et ma sérénité témoignent de ma force intérieure.",
    "numero": 37
  },
  {
    "theme": "Légèreté",
    "devise": "restez décontracté",
    "nom": "Mudra Vajra",
    "sousTitre": "Geste de la foudre-feu",
    "texte": [
      "Ce mudra active et régule la circulation tout en éveillant tous les sens.",
      "Tenez-vous debout et droit, les pieds orientés vers l’avant. Accélérez votre respiration et lancez les bras vers le haut à chaque inspiration (pas de lordose), ceci 6 à 12 fois. Puis tenez le mudra, bras tendus vers le haut, pendant environ 10 secondes et continuez à respirer profondément et fortement.",
      "Pour finir, asseyez-vous tranquillement 3 à 5 minutes, tout en tenant le mudra et voyez-vous en esprit dans une situation qui fait plaisir."
    ],
    "affirmation": "J’aborde le monde, courageusement, retrousse les manches pour la journée et mets de l’élan et de l’enthousiasme dans ce que je fais, .",
    "numero": 6
  },
  {
    "theme": "Richesse",
    "devise": "pensez grand",
    "nom": "Mudra Kubera",
    "sousTitre": "Consacré au dieu de la richesse",
    "texte": [
      "Ce mudra agit en cas de sinusite, d’engorgement et de rhume. Inspirez profondément plusieurs fois, sentez consciemment avec le sens de l’odorat et retenez votre souffle quelques secondes.",
      "La vraie richesse est au-dedans, dans un cœur plein de bonté et un esprit satisfait. L’argent, cependant, apaise, et permet beaucoup de réalisations intelligentes et bénéfiques. À tout moment, à toute fin, nous pouvons invoquer l’univers. Cela aide.",
      "En esprit, vous passez votre commande puis vous vous voyez sous un ciel étoilé. Il pleut des louis d’or que vous attrapez et nommez (joie, amour, courage, etc.). Vous en gardez une part et donnez le reste."
    ],
    "affirmation": "L’univers me fait de riches cadeaux ; je les gère et partage avec sagesse.",
    "numero": 59
  },
  {
    "theme": "Aspiration fervente",
    "devise": "saluez-la",
    "nom": "Mudra Nirvan",
    "sousTitre": "",
    "texte": [
      "Ce mudra spirale renforce le système neurovégétatif et active la production des hormones du bonheur. Tourner et croiser les poignets. Les petits doigts, annulaires et majeurs s’entrecroisent.",
      "Vous vous voyez en esprit assis sur une spirale qui s’enfonce profondément dans le sol et s’élève très haut vers l’infini du ciel. Si vous vous laissez tirer vers le bas, la vie paraît dénuée de sens et vide. Vous vous mouvez donc vers le haut en sachant qu’il existe encore d’autres mondes, forces et secrets à côté du monde visible. Vous vous remettez avec toutes vos aspirations les plus ardentes aux puissances supérieures — et chantez."
    ],
    "affirmation": "Au-delà de l’au-delà, au-delà des limites les plus reculées, je trouve la lumière et la félicité.",
    "numero": 67
  },
  {
    "theme": "Harmonie",
    "devise": "entièrement centré",
    "nom": "Mudra Matangi",
    "sousTitre": "Dédié à la divinité de l’harmonie intérieure et de la gouvernance royale",
    "texte": [
      "Les yeux, les oreilles, le cœur, l’estomac, le foie, le duodénum, le pancréas, la vessie et les reins profitent de ce mudra. Il confère sérénité et équilibre intérieur.",
      "Représentez-vous un lieu où vous trouvez le calme, l’harmonie et la beauté — et pouvez recueillir des forces. Un puits profond se trouve à vos pieds. Vous buvez de son eau merveilleuse, qui vous apporte l’harmonie et la paix. Tranquille et centré, vous maîtrisez de nouveau votre quotidien. Vous reposez en vous. Vous parlez et agissez à partir de votre milieu."
    ],
    "affirmation": "De la source de mon centre intérieur, je puise force et harmonie pour tout mon agir et non agir.",
    "numero": 44
  },
  {
    "theme": "Flexibilité",
    "devise": "s’adapter aux circonstances",
    "nom": "Mudra des vagues",
    "sousTitre": "",
    "texte": [
      "Renforce le système lymphatique, la circulation, le bas du dos et les organes génitaux, détend et calme.",
      "Dans les hauts et les bas de la vie, la sagesse de la nature reste notre meilleur repère (exemple du brin d’herbe) : nous ployons sous la tempête, nous adaptons, puis nous redressons de nouveau. Nous essayons diverses solutions et apprécions cette flexibilité en nous ! Facile à dire, je le sais — mais nous tenons bon.",
      "Dans un grand bal, vous vous voyez en train de danser, élégamment vêtue, et vous vous mouvez gaiement aux rythmes les plus variés de la musique."
    ],
    "affirmation": "Léger, je danse dans le bal de ma vie aux rythmes et aux sons célestes.",
    "numero": 55
  },
  {
    "theme": "Développement",
    "devise": "accepte la grandeur",
    "nom": "Mudra Annapurna",
    "sousTitre": "Dédié à la déesse de la nourriture et de la récolte",
    "texte": [
      "Ce mudra fortifie et nourrit le cœur.",
      "Pour notre développement psychique, mental et spirituel, nous avons besoin de nourritures appropriées, sinon, nous souffrons de carences, d’insatisfaction et de fatigue.",
      "Tout ce qui nous « enthousiasme » et « anime » est nourriture de l’esprit et de la psyché. Il s’agit de trouver dans le calme ce dont nous avons besoin et de tester intérieurement si cela est vraiment ce qu’il nous faut.",
      "Quelques minutes seulement dans notre retraite intérieure suffisent déjà à nous reconstruire et à nous rassasier.",
      "Représentez-vous un lieu qui vous donne de la force par sa beauté et son harmonie. Qu’est-ce qui vous nourrit, vous construit (des personnes, occupations, musiques, couleurs, activités sportives, la nature, les voyages, des actes spirituels, etc.) ? Vous vivez et faites intérieurement ce qui est bon pour vous."
    ],
    "affirmation": "Le bonheur réside en moi.",
    "numero": 20
  },
  {
    "theme": "Protection",
    "devise": "fais confiance",
    "nom": "Mudra Kapittha",
    "sousTitre": "",
    "texte": [
      "Les craintes et les peurs devant certaines situations ou personnes peuvent être transmuées en courage, puissance et force à l’aide de ce mudra.",
      "La main droite prend la forme du mudra. La tenir devant la poitrine et poser la gauche recourbée en coupelle sur les genoux ou à plat sur le cœur. Lever la droite en guise de protection (et de bénédiction). Imaginez que, du ciel, une lumière rayonnante afflue dans votre main gauche, et de là dans votre cœur. L’énergie y est transformée en une lumière protectrice, guérisseuse, bénissante et aimante. Par la main droite, vous l’envoyez à des situations ou à des personnes qui vous inspirent de la crainte."
    ],
    "affirmation": "Une lumière protectrice m’emplit et m’enveloppe… Je suis plein de confiance.",
    "numero": 29
  },
  {
    "theme": "Tolérance",
    "devise": "sois généreux",
    "nom": "Mudra Budhi",
    "sousTitre": "",
    "texte": [
      "Le mudra des liquides aide en cas d’œdèmes, d’yeux qui brûlent et de troubles des reins ou de la vessie. Pour une affection aiguë, tenir aussi longtemps que nécessaire, et en cas de problème chronique 4 fois par jour pendant env. 10 minutes.",
      "La pusillanimité et les attentes trop fortes à notre propre égard ou à l’égard d’autrui sont source de beaucoup de soucis et de souffrances. J’en sais quelque chose ! Débarrassons-nous-en !",
      "Vous vous voyez en esprit près d’une cascade assourdissante d’où s’élève un magnifique arc-en-ciel. Vous remettez généreusement à la cascade votre pusillanimité et toutes vos attentes (en même temps que l’excès de liquide dans votre corps). L’arc-en-ciel coloré incarne votre nouvelle générosité, légèreté et liberté."
    ],
    "affirmation": "Sans attentes, je suis libre.",
    "numero": 17
  },
  {
    "theme": "Liberté",
    "devise": "décoller tout simplement",
    "nom": "Mudra Garuda",
    "sousTitre": "",
    "texte": [
      "Aide en cas d’affections pulmonaires de toutes sortes et fait du bien aux poumons. Les mains reposent à gauche et à droite du sternum.",
      "Garuda, l’oiseau mythique, roi des airs et ennemi des serpents, représente la liberté, la puissance et la force. Souvent, nous n’avons pas les moyens de changer les circonstances mais nous avons le choix de nous laisser accabler ou de nous élever au-dessus des contingences. Nous pouvons donc changer notre attitude à tout moment — n’est-ce pas merveilleux ?",
      "En esprit, prenez votre envol sur le dos de Garuda. Les préoccupations quotidiennes deviennent insignifiantes. Vous jouissez de l’infini, de la liberté et de la beauté du monde céleste."
    ],
    "affirmation": "Derrière les nuages, la liberté est sans doute infinie.",
    "numero": 53
  },
  {
    "theme": "Stabilité",
    "devise": "je tiens bon",
    "nom": "Mudra de la vie",
    "sousTitre": "",
    "texte": [
      "Le mudra Pran fortifie les yeux, procure un calme intérieur, de la persévérance, de la confiance ; et vous permet de vous relever après chaque chute.",
      "Nous sommes bien plus forts, et capables de supporter beaucoup plus que nous ne le croyons. Avec une attitude intérieure positive et constructive, nous amenons cette endurance à son plein développement.",
      "Imaginez que dans votre bassin flambe un grand feu qui se déploie toujours davantage à chaque respiration. Il doit régénérer et fortifier votre corps, réchauffer votre cœur, clarifier votre esprit et le faire briller."
    ],
    "affirmation": "Mon feu intérieur me remplit, me fortifie et me montre mes facultés et mes possibilités.",
    "numero": 2
  },
  {
    "theme": "Curiosité",
    "devise": "explose les limites",
    "nom": "Mudra du foie",
    "sousTitre": "",
    "texte": [
      "Fortifie le foie et le système neurovégétatif, rend placide et éveille une joie anticipative.",
      "Il n’est pas toujours facile de regarder l’avenir avec calme et curiosité, mais comme le futur n’est de toute façon pas prévisible, que nous reste-t-il d’autre à faire ?",
      "Étant donné que la joie anticipative et la curiosité fortifient le foie, réveillent notre vitalité et déclenchent la production d’hormones du bonheur, représentez-vous donc tout simplement comment vous voulez vivre l’avenir et attendez-vous à un miracle — grand ou minuscule — chaque jour."
    ],
    "affirmation": "Je suis un enfant du soleil, j’accepte les côtés sombres et jouis des aspects solaires de la vie.",
    "numero": 32
  },
  {
    "theme": "Raison",
    "devise": "réfléchis",
    "nom": "Mudra Réflexion",
    "sousTitre": "Yampasham",
    "texte": [
      "Rester calme et silencieux, réfléchir à un problème, considérer l’affaire sous différents angles, tenir compte de l’ensemble comme des moindres détails, trouver la bonne mesure, prendre en considération le bien-être de toutes les parties prenantes concernées ; c’est ainsi que s’obtiennent de bons résultats.",
      "Vous vous voyez assis sur une montagne et contemplez de cette hauteur votre vie, vos actions, votre façon de communiquer ou encore une affaire particulière qui vous donne du fil à retordre. De ce point d’observation, vous voyez bien sûr davantage et plus loin, de sorte que vous trouverez certainement une solution favorable à votre problème."
    ],
    "affirmation": "Les pensées constructives et positives sont les semences d’une vie riche de sens et de joie.",
    "numero": 40
  },
  {
    "theme": "Ouverture",
    "devise": "ouvre les fenêtres de l’âme",
    "nom": "Mudra des bronches",
    "sousTitre": "",
    "texte": [
      "Ce mudra ouvre les bronches et facilite la respiration. En cas de difficultés respiratoires aiguës, tenir ce mudra aussi longtemps que possible. Pour un trouble chronique, pratiquer 4 fois par jour pendant 5 à 10 minutes. Sur l’inspiration, profonde, pleine et entière, rentrer le ventre.",
      "Vous vous voyez en esprit assis au sommet d’une montagne. Vous profitez de la vue, de l’espace, de l’air pur et rafraîchissant des hauteurs, que vous inspirez profondément en même temps que le prâna, ou énergie cosmique. Il doit vous apporter de la force et équilibrer toute carence."
    ],
    "affirmation": "Je suis ouvert à toute la beauté et à tout le bien et les accueille avec gratitude.",
    "numero": 52
  },
  {
    "theme": "Objectif",
    "devise": "je le peux — je le veux",
    "nom": "Mudra de la volonté",
    "sousTitre": "",
    "texte": [
      "Ce mudra active la circulation, fait du bien aux organes et renforce sur tous les plans.",
      "Le but de la vie consiste à nous donner constamment des objectifs qui nous correspondent et sont source de joie. Avancez à petits pas, quel que soit le domaine : un apprentissage, un changement, une construction, une guérison, une activité sportive. Vous vous donnez un objectif ambitieux (de préférence par écrit), le subdivisez en objectifs intermédiaires, que vous abordez par petites étapes, en commençant tout de suite. Les petits succès intermédiaires renforcent votre volonté et à la place de celle-ci, ce sera bientôt l’enthousiasme qui vous guidera."
    ],
    "affirmation": "Le moindre petit pas est une joie et me rapproche de mon objectif.",
    "numero": 1
  },
  {
    "theme": "Mélancolie",
    "devise": "va-t’en",
    "nom": "Mudra Savitur",
    "sousTitre": "Origine : Chine",
    "texte": [
      "Aussi appelé Mudra Tsé. Aide en cas de dépression et de mélancolie.",
      "Inspirer de l’air frais, profondément, boire beaucoup d’eau, sauter, écarter largement les bras, les lever, frapper dans les mains et après seulement tenir le mudra.",
      "Savitur est la force et la puissance cosmiques derrière le soleil — la réalité insaisissable qui anime, porte et guide l’univers et chaque être en lui.",
      "Vous vous voyez en esprit le matin à l’aube. Le soleil se lève lentement, il fait de plus en plus clair, et un nouveau jour, une nouvelle période commence aussi pour vous."
    ],
    "affirmation": "SA lumière éclaire mon esprit, réchauffe mon cœur et me montre le chemin vers sa patrie céleste de la joie.",
    "numero": 24
  },
  {
    "theme": "Supériorité",
    "devise": "rester tout à fait calme",
    "nom": "Mudra Musthi",
    "sousTitre": "Sceau du poing",
    "texte": [
      "Chaque accès de colère est un but marqué dans vos propres filets et prépare le cerveau au prochain, nous dit la science. La colère libère de l’adrénaline qui rend agressif et nous vole en même temps de l’énergie.",
      "Vous décompressez d’abord un peu en tambourinant quelques fois du poing gauche dans la paume de la main droite.",
      "Pendant que vous tenez le mudra, vous vous voyez en esprit sous une douche glaciale qui vous refroidit. Puis vous vous demandez très calmement ce qu’il y a à changer et comment éviter de futurs accès de colère. Il existe toujours une solution — cherchez-la."
    ],
    "affirmation": "De sang froid et avec un grand cœur, je maîtrise ma vie.",
    "numero": 38
  },
  {
    "theme": "Réflexion",
    "devise": "sois sage",
    "nom": "Mudra Atmanjali",
    "sousTitre": "Salut au soi intérieur",
    "texte": [
      "Le geste du salut stimule l’activité cérébrale et apporte le calme intérieur.",
      "Ce mudra est pour ainsi dire la porte vers la réflexion intérieure et par là également vers la source de la force, de la guérison, de la sagesse et de la joie. Vous laissez la respiration devenir lente et profonde.",
      "Chaque année, nos besoins changent un peu. Vous voyez en esprit votre sagesse intérieure comme un être de lumière. Demandez tout ce que vous voulez savoir, ce qui est le plus important pour vous maintenant et dans l’avenir, ce qui rend votre vie légère, qui vous correspond et vous donne de la joie."
    ],
    "affirmation": "La réflexion et la sagesse intérieures déterminent ma vie.",
    "numero": 18
  },
  {
    "theme": "Modération",
    "devise": "non — non — non",
    "nom": "Mudra de la digestion",
    "sousTitre": "",
    "texte": [
      "Ce mudra agit en cas de ballonnements ou d’un sentiment de ventre trop plein dû à un excès de nourriture ou à des contraintes de temps trop fortes.",
      "Tout excès est chaque fois comme le gonflement d’une exigence démesurée ou une contrainte de temps que nous pouvons réduire ou éviter par un refus net : « Non », « pas moi, pas comme cela », ou « pas maintenant ».",
      "Vous imaginez une coupe pleine de sable qui représente tout ce qui est en trop et vous la videz lentement. Répérez plusieurs fois. La coupe vide se remplit d’énergie de vie cosmique, que vous inspirez avec délectation."
    ],
    "affirmation": "Je recherche la bonne mesure et me concentre sur ce qui est vraiment important.",
    "numero": 36
  },
  {
    "theme": "Impulsion",
    "devise": "prendre de l’élan",
    "nom": "Mudra Puissance",
    "sousTitre": "",
    "texte": [
      "Ce mudra vous fait reprendre vos esprits, vous revigore le matin au lit quand vous vous réveillez, ou rapidement dans la journée, en cas de besoin.",
      "Vous ouvrez d’abord la fenêtre et buvez un verre d’eau. Puis vous vous frottez les mains et les frappez vigoureusement, comme pour applaudir. À présent, croisez les doigts, tournez les paumes vers l’extérieur et étirez les bras au rythme de votre respiration vers l’avant, vers le bas, vers le haut. Répétez cela plusieurs fois.",
      "Puis posez les mains entrecroisées à l’arrière de la tête (ce qui égaie) ou le dos des mains pendant une seconde sur le front (met en mouvement), regardez vers le haut et inspirez profondément plusieurs fois."
    ],
    "affirmation": "Je regorge d’énergie.",
    "numero": 9
  },
  {
    "theme": "Colonne vertébrale",
    "devise": "tiens-toi droit",
    "nom": "Mudra Poisson",
    "sousTitre": "",
    "texte": [
      "Le mudra Matsayam vivifie et fortifie le dos, régule la tension artérielle, active la circulation et réchauffe.",
      "Avant de tenir ce mudra, massez vigoureusement le dos d’une main à l’aide de l’autre. D’abord celle de droite, puis celle de gauche.",
      "Vous renforcez encore davantage votre dos si, pendant que vous pratiquez ce mudra, vous êtes assis bien droit sans vous adosser. Affaissez-vous de temps en temps puis redressez-vous. Vous vivifiez ainsi les disques intervertébraux et assouplissez les tendons et les muscles. Voyez-vous amoureux, des ailes vous poussent. Léger, vous vous dirigez vers quelque chose de beau."
    ],
    "affirmation": "Droit, léger et le cœur joyeux, éveillé et mobile, ainsi je traverse la vie.",
    "numero": 5
  },
  {
    "theme": "Balance",
    "devise": "Parfaitement équilibré",
    "nom": "Mudra Terre",
    "sousTitre": "",
    "texte": [
      "Le mudra Prithivi renforce le sens de l’odorat, est bénéfique pour le foie, les ongles, la peau, les cheveux et les os. Sur le plan de l’âme et de l’esprit, il apporte la pondération et aide contre les variations d’humeur.",
      "Nos humeurs déterminent la qualité de notre vie. Nous pouvons les influencer en domptant nos pensées. Donnons donc toujours de l’importance à ce qui compte et qui est bon pour nous, c’est-à-dire à ce qui nous fait du bien et nous apporte de la joie. Facile à dire, mais cela vaut toujours la peine d’essayer.",
      "Vous êtes en esprit dans une barque et ramez tranquillement vers l’île de vos rêves. Là vous trouvez tout ce que votre âme désire."
    ],
    "affirmation": "Ma vie est un cadeau. J’en prends soin et en tire le meilleur parti.",
    "numero": 51
  },
  {
    "theme": "Stop",
    "devise": "joue et jouis",
    "nom": "Mudra Apaisement",
    "sousTitre": "",
    "texte": [
      "L’hyperactivité est désagréable, ronge les nerfs et affaiblit le système immunitaire. On se sent survolté et on ne peut même plus supporter le calme tant désiré (paradoxe). Tenir le mudra-apaisement aussi souvent que possible en veillant à la respiration (se reporter au manuel).",
      "En esprit, vous vous voyez dans l’Arctique. Des icebergs étincellent au soleil, la mer est calme, d’un bleu profond. Vous vivez au milieu des pingouins, des dauphins, des otaries, des ours polaires, en bonne entente, dans le calme et l’harmonie, et vous vous laissez émerveiller par le soleil, la mer et la glace."
    ],
    "affirmation": "À chaque inspiration, je plonge plus profondément dans le calme et le vide — et en puise une force nouvelle et une riche plénitude.",
    "numero": 54
  },
  {
    "theme": "Abandon",
    "devise": "plongé au plus profond",
    "nom": "Mudra Dhyani",
    "sousTitre": "Geste de méditation",
    "texte": [
      "Le fait de se plonger, en toute concentration et en abandon total, dans une activité, une contemplation ou une méditation, nous fait entrer dans un silence guérisseur, merveilleux, comblant de bonheur, et agit contre les douleurs aiguës ou chroniques.",
      "Sans l’air, qui est invisible, nous mourrions. Or il existe des énergies que nous percevons encore moins que l’air et qui emplissent l’univers, le portent et rendent notre existence possible. Adonnons-nous à cet insaisissable, emplissons-nous de ce vide apparent, et quelque chose qui dépasse l’entendement s’accomplira en nous, autour de nous, pour nous. En inspirant, vous comptez de 1 à 7 et en expirant, à rebours de 7 à 0. Demeurez un instant en apnée, dans la plénitude invisible."
    ],
    "affirmation": "Je m’abandonne au vide, et ainsi se développent une riche plénitude et la félicité.",
    "numero": 30
  },
  {
    "theme": "Gratitude",
    "devise": "reconnais-le bien",
    "nom": "Mudra Linga",
    "sousTitre": "",
    "texte": [
      "Défait les mucosités dans les poumons, aide généralement en cas de refroidissement et active le système immunitaire.",
      "La gratitude mobilise les forces de guérison, détend les tensions, calme et améliore l’humeur. Comme si l’on plongeait dans des sphères supérieures.",
      "Laissez le souffle devenir lent et profond. Exprimez à chaque respiration un remerciement et une louange qui viennent du cœur.",
      "Vous saluez et appréciez très consciemment tout le bien qui est en vous, tout le beau que vous avez en partage ainsi que vos aptitudes pratiques et spirituelles. Vous remerciez pour tous ces dons et ouvrez ainsi grand les portes sur une vie comblante, pleine de joie. Celui qui loue et rend grâce reçoit en retour."
    ],
    "affirmation": "Je suis empli de louanges et de gratitude.",
    "numero": 16
  },
  {
    "theme": "Ordre",
    "devise": "expérimente",
    "nom": "Mudra Aditi",
    "sousTitre": "Dédié à la Grande Mère universelle",
    "texte": [
      "Ce mudra crée de l’ordre sur tous les plans.",
      "Nous devons constamment réordonner nos pensées et nos sentiments, ainsi que toutes nos actions, et les réadapter aux circonstances et à nos forces. Nous devrions avoir plaisir à le faire, et si le résultat ne nous satisfait pas, recommençons, tout simplement. Prenons plaisir à expérimenter !",
      "Vous vous imaginez dans le rôle d’un jardinier. Vous avez planté des rangées de légumes — ce sont toutes vos obligations « utiles ». La plate-bande aux épices représente tout ce qui donne du goût et du piment à votre vie, les herbes médicinales vous aident dans les situations difficiles et les fleurs sont là pour votre joie. Soignez bien votre jardin. Ne laissez nulle part les mauvaises herbes prendre le dessus — tout est bien ordonné !"
    ],
    "affirmation": "L’ordre intérieur est déterminant dans ma vie.",
    "numero": 42
  },
  {
    "theme": "Priorités",
    "devise": "fixez-les",
    "nom": "Mudra du temps",
    "sousTitre": "",
    "texte": [
      "Ce mudra réduit le stress, donne un appui intérieur et renforce le système nerveux.",
      "Le temps est notre bien le plus précieux. Se fixer clairement les priorités nous délivre de la pression du temps et confère à chaque jour sa spécificité.",
      "En esprit, vous êtes assis dans une grotte près d’un étang. D’une pierre, une goutte tombe à intervalles réguliers dans l’eau. Vous observez les vagues qui se forment en cercles concentriques, de plus en plus grands. De même, une minuscule priorité que vous vous donnez peut produire de grands effets et mettre des choses importantes en mouvement."
    ],
    "affirmation": "Rien n’est trop petit pour devenir très grand.",
    "numero": 57
  },
  {
    "theme": "Confiance",
    "devise": "peur, va-t’en",
    "nom": "Mudra Courage",
    "sousTitre": "",
    "texte": [
      "Ce mudra du Japon m’aide toujours quand je suis rongée par le malaise, la peur ou l’angoisse. La technique suivante vous permet de vous débarrasser de peurs aiguës ou chroniques.",
      "Regardez d’abord très précisément la cause de votre peur et imaginez très brièvement le pire. Les images intérieures sont petites et en noir et blanc. Ensuite, voyez en grandes images de couleur comment tout se passera bien, selon vos vœux. Vous vous voyez en train de rire, satisfait et heureux."
    ],
    "affirmation": "Je m’en remets… et fais confiance à la force et à la puissance supérieures, qui me guident, me portent et me protègent.",
    "numero": 8
  },
  {
    "theme": "Pureté",
    "devise": "Nettoyer fait du bien",
    "nom": "Mudra de l’intestin",
    "sousTitre": "",
    "texte": [
      "Ce mudra atténue les crampes abdominales et stimule les intestins.",
      "Si nous nettoyons régulièrement la fenêtre de notre âme, la vue est claire ; et quand nous voyons clairement, la vie est vraiment belle. Cela signifie que nous nettoyons ce qui est trouble dans notre passé ; et aussi que nous clarifions et pardonnons quand cela est nécessaire.",
      "Un pardon généreux rend heureux et nous attire des miracles tel un aimant intérieur. Je parle d’expérience.",
      "En esprit, vous laissez défiler des personnes et des situations devant vous, en lâchant ce qui est douloureux et négatif."
    ],
    "affirmation": "Liberté intérieure, paix et joie m’emplissent.",
    "numero": 50
  },
  {
    "theme": "Enthousiasme",
    "devise": "renouvelle ou démarre un projet",
    "nom": "Mudra Narayana",
    "sousTitre": "Dédié à la déesse du renouvellement",
    "texte": [
      "Ce mudra est utile au démarrage d’un nouveau projet ou d’un changement planifié. Il active l’énergie de « la main à la pâte », de la persévérance, de la patience et de la confiance.",
      "Le renouvellement régulier est une composante de la vie, comme le printemps l’est de l’année. Même les arbres les plus vieux produisent toujours de nouvelles branches, un nouveau feuillage, de nouvelles fleurs. Le plus petit renouvellement peut avoir de grandes conséquences. Il crée un nouveau courant ascendant, arrache au train-train, nous lance un défi, donne du courage et introduit le suspens et la réussite dans la vie.",
      "Vous voyez dès à présent dans votre esprit comment la nouveauté doit se profiler. Modifiez-en l’image jusqu’à ce qu’elle corresponde pleinement à vos besoins et à vos possibilités, et qu’elle vous enthousiasme."
    ],
    "affirmation": "Je recommence et goûte l’enthousiasme du débutant.",
    "numero": 11
  },
  {
    "theme": "Chance",
    "devise": "saisis-la",
    "nom": "Mudra Hakini",
    "sousTitre": "Dédié à la déesse de la vérité, de la clarté et de l’unité intérieures",
    "texte": [
      "Ce mudra synchronise les deux hémisphères cérébraux, active la mémoire, améliore la capacité à assimiler et à restituer les matières apprises (examens), et fait du bien aux poumons.",
      "Chaque situation, même fâcheuse, est aussi une chance qu’il s’agit de discerner et d’utiliser.",
      "En esprit, élevez-vous jusqu’à votre chakra du front. C’est comme si vous étiez sur un petit nuage rose. Vous posez des questions en rapport avec les chances particulières rencontrées dans votre vie (ou dans des occasions spécifiques) ; devenez silencieux ; écoutez attentivement !"
    ],
    "affirmation": "Je veux percevoir les chances qui me sont données, les utiliser, en profiter, les mettre en œuvre.",
    "numero": 28
  },
  {
    "theme": "Vitalité",
    "devise": "mets-toi en mouvement",
    "nom": "Mudra de l’entrain",
    "sousTitre": "",
    "texte": [
      "Aide en cas de fatigue aiguë et chronique.",
      "Puisez beaucoup d’air frais, buvez beaucoup d’eau et mâchez du dur !",
      "Cédez tout d’abord quelques minutes à la fatigue — vous vous rendez. Avec une respiration longue et profonde, vous vous déchargez d’une énergie usée.",
      "Puis balancez les bras et les jambes de tous côtés, frappez dans les mains et formez le mudra : le médium gauche s’appuie légèrement sur le pouce droit. En même temps, vous inspirez quelques fois, lentement et profondément, une énergie nouvelle.",
      "Visualisez de merveilleux tableaux de couleur jaune et blanche."
    ],
    "affirmation": "La force de vie universelle circule partout en moi, rafraîchit mon esprit, et cajole mon âme.",
    "numero": 27
  },
  {
    "theme": "Amour",
    "devise": "sois bienveillant",
    "nom": "Mudra Apan-Vayu",
    "sousTitre": "",
    "texte": [
      "Le mudra du cœur agit pour tous les types de maux cardiaques. En cas de mal aigu, tenir le mudra aussi longtemps que nécessaire ; en situation chronique, pratiquer 4 fois par jour pendant 10 minutes.",
      "La couleur rouge fait du bien au cœur. Visualisez un bouquet de roses rouges que vous donnez toutes, sauf une. Plongez-vous à présent dans la splendeur de cette unique rose et percevez-la avec tous vos sens. Laissez-vous charmer par sa beauté. Peut-être la fée des roses a-t-elle un message pour vous — écoutez bien !"
    ],
    "affirmation": "Dans la beauté et la perfection d’une unique rose, je devine la sagesse et la richesse de l’univers entier.",
    "numero": 3
  },
  {
    "theme": "Justice",
    "devise": "je ne juge pas",
    "nom": "Mudra de la justice",
    "sousTitre": "",
    "texte": [
      "Ce mudra renforce le plexus solaire, confère un esprit clair, centre la personne et la stabilise.",
      "Revendiquez vos droits mais ne jugez jamais. Laissez tout jugement aux soins de la justice supérieure. Condamnez les actes mais jamais leur auteur. Songez que seules des personnes blessées en blessent d’autres, seuls les opprimés oppriment, seuls les faibles affaiblissent, seuls les frustrés frustrent.",
      "Confiez les personnes qui vous font ou ont fait du tort au Très-Haut. Remettez également au Très-Haut les souffrances qui vous ont été infligées, et laissez-vous consoler."
    ],
    "affirmation": "Ton amour guérit mes blessures. Ta force me fortifie. Ta bonté me comble de nouveaux bienfaits.",
    "numero": 63
  },
  {
    "theme": "Contrôle",
    "devise": "adieu soucis",
    "nom": "Mudra de la rate",
    "sousTitre": "",
    "texte": [
      "Renforce la rate et le pancréas.",
      "Prévoyance et précaution font toujours du bien, mais les soucis nous nuisent. Nous sommes tous de temps en temps gagnés par des soucis, et les prenons même parfois en affection. Mark Twain nous conseille de nous débarrasser de ces habitudes d’un coup de balai et de les jeter bien loin, hors de la maison — autant de fois qu’il le faut, parce qu’ils ont tôt fait de rentrer de nouveau par la porte de derrière.",
      "Alors, retroussons nos manches — puis imaginons simplement comment ce serait si tout allait bien. Un point, c’est tout.",
      "Confions en outre tout l’incontrôlable à la sagesse et à l’amour de la vie, et plaçons-le sous la protection des forces cosmiques."
    ],
    "affirmation": "Je fais pleinement confiance car le bien triomphe toujours.",
    "numero": 25
  },
  {
    "theme": "Discipline",
    "devise": "réorganise",
    "nom": "Mudra de l’écoulement",
    "sousTitre": "",
    "texte": [
      "Ce mudra anti-stress aide dans les situations aiguës de tension nerveuse. Vous inspirez et expirez plusieurs fois consciemment et lentement, en prolongeant la pause après l’expiration.",
      "Attention à l’addiction au stress ! Avant que votre stress ne devienne chronique, vous devez développer une stratégie à son encontre : faire un pas en arrière — marquer un arrêt — réfléchir — lâcher tout ce qui est de trop — déléguer — composer un nouvel emploi du temps, etc.",
      "Vous remettez tout ce qui vous cause des tensions au soleil couchant et vous vous imaginez en bonne compagnie. Vous vous accordez du temps libre dans la nature ou avec votre partenaire, ou jouez avec un enfant, un animal domestique, sans oublier de le câliner."
    ],
    "affirmation": "Ma plus grande richesse réside dans les petites joies quotidiennes.",
    "numero": 14
  },
  {
    "theme": "Conscience de sa propre valeur",
    "devise": "protégé et soutenu",
    "nom": "Mudra de la prestance",
    "sousTitre": "",
    "texte": [
      "Ce mudra aide en situation d’examen ou de prestation en public. Les index sont dirigés vers le haut et les pouces vers le cœur.",
      "Faites de votre mieux, réglez-vous sur l’amour, la bienveillance et la compréhension supérieure dans les cœurs des hommes. Vous voulez obtenir quelque chose de bénéfique pour tous les participants (y compris pour vous-même) et placez votre demande (votre projet) sous la protection des forces supérieures. Déposez les concepts ci-dessous dans votre cœur comme des semences dans la terre — ils germeront, croîtront, fleuriront et porteront de riches fruits."
    ],
    "affirmation": "Assurance, confiance en soi, conscience de sa propre valeur.",
    "numero": 61
  },
  {
    "theme": "Être relié",
    "devise": "j’en fais partie",
    "nom": "Mudra des abeilles",
    "sousTitre": "",
    "texte": [
      "Le mudra Bhramara agit contre les allergies de toutes sortes et renforce le système immunitaire.",
      "Vous activez le système immunitaire et le sens de l’odorat en inspirant profondément pendant les 6 à 12 premières respirations.",
      "Imaginez que vous sentez un parfum agréable et entêtant. Puis reprenez une respiration normale en vous représentant comment vous pouvez avoir, accomplir et être tout ce qui vous fait plaisir sans risque d’allergie. Songez que ce ne sont pas la nature ou votre environnement qui vous rendent malade mais vos propres peurs, aversions et limites (généralement inconscientes)."
    ],
    "affirmation": "Vaillamment, je vais à la rencontre de la nature, de mon entourage, et des défis quotidiens.",
    "numero": 35
  },
  {
    "theme": "Charisme",
    "devise": "sois beau/belle",
    "nom": "Mudra Flammes",
    "sousTitre": "",
    "texte": [
      "Ce mudra fait du bien au dos et stimule la circulation.",
      "Mettez-vous au mieux de vous-même, habillez-vous joliment, prenez bien soin de vous et allez à la rencontre des autres avec une attitude bienveillante, serviable et positive. Décochez ici et là un sourire compréhensif et aimant ; le charisme se manifeste alors de lui-même. Les gens doués de charisme sont également aimables. Ils entraînent les autres, et leur enthousiasme est communicatif.",
      "Essayez d’abord intérieurement, puis transmettez ces images vers l’extérieur. Vous serez étonné du résultat !"
    ],
    "affirmation": "Je souris dans le miroir de la vie et reconnais la bienveillance et la beauté.",
    "numero": 10
  },
  {
    "theme": "Décision",
    "devise": "je fais le bon choix",
    "nom": "Mudra Naga",
    "sousTitre": "Consacré à la grande déesse des serpents",
    "texte": [
      "La déesse des serpents symbolise une force surnaturelle, la sagesse, la subtilité et la puissance. Ce mudra défait les tensions émotionnelles et mentales.",
      "Il est important que nous prenions toujours des décisions claires, aussi difficile que cela puisse être. Tenir le mudra pendant quelques secondes devant le front puis devant la poitrine. En même temps, observer la respiration et établir le silence en soi.",
      "À présent, vous prenez une pièce de monnaie, déterminez le côté face et le côté pile, et la jetez en l’air. Quelle que soit la face sur laquelle elle tombe, ce sera la bonne. Toute décision que nous prenons du plus profond de nous-mêmes est juste. Les chemins à parcourir sont souvent enchevêtrés et pénibles. Si nous comptons alors sur l’aide des forces supérieures, tout ira bien."
    ],
    "affirmation": "Je décide en toute lucidité et d’un cœur plein de bonté.",
    "numero": 62
  },
  {
    "theme": "Être tout-en-un",
    "devise": "relié en unité",
    "nom": "Mudra Jnana-Chin",
    "sousTitre": "Sceau de l’enseignement et du savoir",
    "texte": [
      "Ce mudra régénère et fortifie l’ensemble du corps, éclaircit et clarifie l’esprit, agit comme un baume sur l’âme.",
      "Les doigts de la main gauche sont dirigés vers le bas, ceux de la main droite vers le haut. Le contact entre les extrémités des pouces et des index symbolise la liaison entre les consciences humaine et cosmique.",
      "En collaboration avec la conscience cosmique, nous pouvons déposer ou remettre nos peurs, nos doutes, nos soucis et fardeaux quotidiens. Dans cette union, nous ne sommes jamais seuls, mais tout en un."
    ],
    "affirmation": "En liaison avec la lumière éternelle apparaît mon véritable Soi. Il rayonne mon amour dans le monde.",
    "numero": 68
  },
  {
    "theme": "Équanimité",
    "devise": "Souris !",
    "nom": "Mudra Shaakini",
    "sousTitre": "Dédié à la déesse du chakra de la gorge",
    "texte": [
      "Ce mudra fait du bien à la thyroïde et dénoue les tensions de la nuque, des articulations des mâchoires et de la tête ; il facilite la liaison tête-cœur-ventre, même au sens figuré.",
      "Posez d’abord les deux mains sur la nuque, pressez légèrement les doigts, rentrez le menton et faites glisser les mains le long de la nuque jusque vers l’avant au moins 8 fois. Puis formez le mudra en laissant pendre souplement la mâchoire inférieure ; à chaque expiration, dire : lalala.",
      "Vos décisions sont-elles chaque jour (ou dans une affaire particulière) en accord avec votre cœur et votre ventre ? Ou bien exigez-vous trop, trop peu de vous, ou quelque chose qui ne vous correspond pas du tout ?"
    ],
    "affirmation": "Dans mon cœur, je sais ce qui est bon pour moi, et j’agis en conséquence.",
    "numero": 33
  },
  {
    "theme": "Gaieté",
    "devise": "respirez à fond",
    "nom": "Mudra du poumon",
    "sousTitre": "Origine : Japon",
    "texte": [
      "Ce mudra aide en cas de problèmes pulmonaires, quels qu’ils soient. Pour soigner les troubles chroniques, il se pratique 4 fois par jour pendant env. 10 minutes.",
      "Tristesse et chagrin sont le fait d’un poumon affaibli. Ces émotions peuvent être inconscientes. La personne remarque seulement qu’elle ne se réjouit véritablement de rien ou réagit avec pessimisme et cynisme à toutes choses.",
      "Vous respirez profondément, lentement, consciemment. Après l’inspiration, retenir l’air pendant 3 à 7 secondes. Puis expirer à fond.",
      "Imaginez-vous en train de faire pénétrer en vous, en même temps que l’air que vous respirez, beaucoup de prâna, ou énergie de vie, dans des couleurs claires et rayonnantes qui illuminent vos poumons et votre poitrine."
    ],
    "affirmation": "Je suis plein d’énergie de vie.",
    "numero": 22
  },
  {
    "theme": "Sens supérieur",
    "devise": "soyez profond",
    "nom": "Mudra Panava",
    "sousTitre": "Geste de la recherche de soi",
    "texte": [
      "Quel est le sens de notre vie ? Quel est le sens des défis que nous devons surmonter et des coups du sort qui nous frappent ? La philosophie du yoga m’aide à répondre à ces questions. Elle enseigne que nous donnons un sens à notre vie en nous fixant nous-mêmes des tâches pour grandir intérieurement, devenir plus nobles et plus sages, et nous rapprocher du divin par la méditation (et la prière). Nous n’éluciderons sans doute jamais le sens le plus profond de notre existence, et cela aussi a certainement un sens.",
      "Les pouces reposent à la racine des petits doigts, et les mains placées devant le plexus solaire sont orientées vers l’avant. En total don de soi, vous dites ou chantez l’affirmation suivante :"
    ],
    "affirmation": "Ma vie et tous mes faits et gestes dans l’ici et maintenant ont un sens plus profond.",
    "numero": 66
  },
  {
    "theme": "Soulagement",
    "devise": "enterrer les fardeaux du passé",
    "nom": "Mudra Apan",
    "sousTitre": "",
    "texte": [
      "Ce mudra élimine du corps les toxines et dissout les blocages énergétiques. Sur le plan émotionnel et mental, il défait les vieux schémas gênants et lève les résistances intérieures.",
      "Écrivez sur une feuille de papier une affaire particulière ou tout ce qui vous a blessé dans le passé et vous pèse encore aujourd’hui. Brûlez cette feuille, versez de l’eau sur les cendres que vous enfouissez ensuite dans la terre. Vous enterrez ainsi toutes vos entraves et tous vos fardeaux, et vous vous préparez un avenir « léger ». En esprit, vous vous asseyez devant un champ fraîchement labouré que vous plantez à nouveau pour une riche récolte."
    ],
    "affirmation": "Je suis prêt pour un avenir prometteur.",
    "numero": 41
  },
  {
    "theme": "Métamorphose",
    "devise": "transformez la situation",
    "nom": "Mudra Varhakam",
    "sousTitre": "",
    "texte": [
      "Ce mudra rafraîchit l’esprit, rend centré, crée de l’harmonie et confère de l’équanimité. Tenir les avant-bras à l’horizontale et les mains à hauteur du cou.",
      "Pendant que vous formez les mudras, représentez-vous une coupe pleine de citrons. Tous sauf un sont brillants et impeccables. Mais le dernier présente une grosse tache. Que cela vous irrite ou non, la tache est bel et bien là. Il vaut mieux presser le citron, ajouter une portion de sucre et vous confectionner une bonne limonade."
    ],
    "affirmation": "Je suis intelligent, subtil, sais transformer chaque situation à mon avantage, et veille à ce que toutes les parties prenantes en profitent.",
    "numero": 58
  },
  {
    "theme": "Inspiration",
    "devise": "sois créatif",
    "nom": "Mudra Sarasvati",
    "sousTitre": "",
    "texte": [
      "Active et synchronise les deux hémisphères cérébraux.",
      "Inspirez profondément de l’air frais, buvez de l’eau, balancez bras et jambes et massez vigoureusement les mains.",
      "Pendant que vous pratiquez le mudra, visualisez un ciel qui change en permanence : nuages colorés, blancs, noirs ; tempête ; éclairs et tonnerre ; arc-en-ciel ; ciel dégagé, d’un bleu profond.",
      "Puis munissez-vous de papier et de quoi écrire. Notez toutes les idées se rapportant à votre projet ou à votre situation de vie, même les plus folles, même celles que vous avez pensées et souhaitées depuis longtemps, puis choisissez les plus utiles."
    ],
    "affirmation": "Sarasvati, merveilleuse déesse de la créativité, me montre mes talents et me donne d’innombrables bonnes idées que j’accueille avec joie et gratitude.",
    "numero": 19
  },
  {
    "theme": "Perpétuel changement",
    "devise": "tout passe",
    "nom": "Mudra de la roue de la vie",
    "sousTitre": "",
    "texte": [
      "Le mudra Dharmachakra apaise sur tous les plans et confère l’équanimité.",
      "Tenir les mains devant la poitrine. La paume droite tournée vers l’extérieur est un peu plus haute, la gauche est dirigée vers l’intérieur.",
      "La pluie et la tempête passent, ainsi que chaque souffrance et chaque douleur. Ce chakra nous aide à accepter simplement tout mal et toute douleur, et à tirer le meilleur parti de l’instant présent, envers et contre tout. Je parle d’expérience.",
      "Vous vous voyez en esprit sur la roue du temps. À chaque expiration, vous soufflez légèrement sur la roue afin qu’elle tourne et vous fasse entrer dans une période nouvelle, intéressante, joyeuse."
    ],
    "affirmation": "Je dirige mes cinq sens sur tout ce qui est beau et me réjouit.",
    "numero": 64
  },
  {
    "theme": "Calme intérieur",
    "devise": "sois silencieux",
    "nom": "Mudra Tambour",
    "sousTitre": "",
    "texte": [
      "Ce mudra calme les nerfs.",
      "Vous vous défaites de votre nervosité en tambourinant souplement des doigts pendant quelques secondes sur un support dur. Puis laissez reposer les doigts, concentrez-vous sur leurs extrémités et appuyez-les doucement sur le support en expirant profondément et pleinement. Répétez plusieurs fois.",
      "Formez maintenant le mudra et voyez-vous en esprit allongé sous un arbre, dans un hamac qui vous balance à un rythme léger. Vous regardez la frondaison, une bise légère souffle et agite doucement les feuilles. Vous fredonnez une mélodie simple et agréable."
    ],
    "affirmation": "Un rythme doux me berce et m’endort dans un calme merveilleux.",
    "numero": 34
  },
  {
    "theme": "Consolation",
    "devise": "laisse-toi consoler",
    "nom": "Mudra de la prière",
    "sousTitre": "Granthitam",
    "texte": [
      "Ce mudra favorise l’expiration et le lâcher-prise (en cas de deuil, douleur, perte, manque). Les extrémités des doigts reposent sur le dos des mains. Le contact entre le pouce et l’index symbolise la liaison de la conscience humaine avec la conscience cosmique.",
      "Lâchez tout ce qui vous oppresse et remettez-le à la conscience cosmique. Entrez en relation avec elle. Vous voyez en esprit un être de lumière qui vous écoute, vous console et vous seconde. Il ne peut changer les faits qui vous accablent (beaucoup relèvent d’un plan supérieur), mais il peut vous apporter sa consolation et son aide — si vous le permettez."
    ],
    "affirmation": "Cela me console dans le silence délicieux de mon âme.",
    "numero": 48
  },
  {
    "theme": "Guérison",
    "devise": "accepte-la",
    "nom": "Mudra de la vache",
    "sousTitre": "",
    "texte": [
      "Le mudra Surbhi agit contre les rhumatismes, l’arthrose, les inflammations et les douleurs de toutes sortes. En cas de troubles chroniques, pratiquez ce mudra 4 fois par jour pendant 10 minutes.",
      "Vous êtes le calice merveilleux d’une fleur. Comme cette fleur, vous vous ouvrez à la lumière et vous laissez remplir — de sa clarté, de ses couleurs, de sa chaleur, et de sa force de guérison rayonnante. Sentez la chaleur de cette lumière, elle réveille vos cellules, met vos atomes en vibration, les fait chanter !",
      "Si nécessaire, envoyez des faisceaux de lumière dans les régions de votre corps qui pourraient avoir besoin de guérison."
    ],
    "affirmation": "Je m’ouvre à la lumière cosmique, à l’amour universel, à la force dispensatrice de joie et de guérison.",
    "numero": 31
  },
  {
    "theme": "Vitalité",
    "devise": "accepte-la",
    "nom": "Mudra anti-vieillissement",
    "sousTitre": "",
    "texte": [
      "Ce mudra renforce la santé sur tous les plans, fait du bien au système lymphatique et agit contre le vieillissement.",
      "Pressez fortement les mains l’une contre l’autre sur l’expiration tout en écartant vigoureusement les doigts. Répétez plusieurs fois — en appuyant chaque jour un peu plus longtemps et plus fort et en augmentant le nombre de fois que vous répétez l’exercice.",
      "Vous vous voyez à un âge avancé, plein de vitalité, de capacité à vous enthousiasmer, jeune et frais d’esprit. Les gens recherchent votre proximité, se sentent bien en votre compagnie et se réjouissent de vos paroles encourageantes et aimantes."
    ],
    "affirmation": "Je vais au-devant des aventures de la vie, plein d’élan, d’attente et d’enthousiasme.",
    "numero": 39
  },
  {
    "theme": "Magie ou mystère ?",
    "devise": "laissez-vous transformer comme par enchantement",
    "nom": "Mudra Vismaya",
    "sousTitre": "Geste pour une vision plus pénétrante, plus claire et plus profonde",
    "texte": [
      "La vie, l’être humain, l’univers sont un grand mystère. Bien que la science croie beaucoup savoir, nous ne savons presque rien. En fait, nous sommes un espace vide empli d’énergie en vibration. Cet insaisissable nous fait pressentir une grande intelligence présente derrière toutes choses, un plan, un mystère, qui ne peut pas se terminer avec la mort. Consolation, fascination, apport de sens !",
      "Vous imaginez une sainte cathédrale ou un temple, vous vous laissez émouvoir par son atmosphère magique et êtes conscient des grands mystères qui constituent le sens caché de notre vie et la déterminent."
    ],
    "affirmation": "Ma vie est plongée dans les grands mystères de l’univers. Je fais confiance à sa bonté.",
    "numero": 65
  }
];
