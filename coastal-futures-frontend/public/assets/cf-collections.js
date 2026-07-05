/* Coastal Futures — central client COLLECTIONS layer (lists of objects).
   Twin of cf-site.js, but for editorial content the admin creates and the public reads.
   Back-end devs: replace the localStorage read/write with your API. Every admin screen
   writes a collection (CFCol.upsert/remove); every public page renders from CFCol.published().
   Only "published" items are visible to the public. Text fields carry both FR and EN
   ({fr,en}) so the CMS never loses a translation when the admin edits a string. */
(function(){
  var PREFIX='cf-col-';

  /* ---- seeds : the values shipped in the HTML, restored on reset ---- */
  var SEED={
    calls:[
      {id:'cohorte-2', pub:'published', state:'open', featured:true,
       type:{fr:'Entreprise verte',en:'Green enterprise'},
       title:{fr:'Cohorte 2 : incubation des entreprises vertes',en:'Cohort 2: green enterprise incubation'},
       desc:{fr:"Douze semaines d'accompagnement intensif, accès au réseau de mentors, et soutien complet à la labellisation pour les jeunes entreprises vertes en phase de démarrage.",en:'Twelve weeks of intensive support, access to the mentor network, and full help towards certification for early-stage young green businesses.'},
       countries:['Sénégal','Ghana','Guinée-Conakry','Liberia','Sierra Leone'],
       criteria:[{fr:'Porteur âgé de 18 à 35 ans',en:'Leader aged 18 to 35'},{fr:'Projet vert en phase de démarrage',en:'Early-stage green project'},{fr:'Résider dans un pays du programme',en:'Resident in a programme country'},{fr:'Impact mesurable sur le littoral',en:'Measurable impact on the coast'}],
       deadline:'2026-06-30', apps:42, cap:60},
      {id:'mangroves', pub:'published', state:'open',
       type:{fr:'Restauration de mangroves',en:'Mangrove restoration'},
       title:{fr:'Bourse restauration de mangroves côtières',en:'Coastal mangrove restoration grant'},
       desc:{fr:'Financement de semis et suivi des indicateurs de surface restaurée pour les projets communautaires de protection du littoral.',en:'Funding for seedlings and tracking of restored-area indicators for community coastal-protection projects.'},
       countries:['Liberia','Sierra Leone'], deadline:'2026-07-15', apps:19},
      {id:'energie', pub:'published', state:'open',
       type:{fr:'Énergie renouvelable',en:'Renewable energy'},
       title:{fr:'Fonds énergie renouvelable jeunesse',en:'Youth renewable energy fund'},
       desc:{fr:"Subventions d'amorçage pour les mini-réseaux solaires et solutions d'accès à l'énergie portées par des jeunes.",en:'Seed grants for youth-led solar mini-grids and energy-access solutions.'},
       countries:['Sénégal','Ghana','Guinée-Conakry'], deadline:'2026-08-12', apps:27},
      {id:'mentorat', pub:'published', state:'open',
       type:{fr:'Mentorat',en:'Mentorship'},
       title:{fr:'Programme mentorat finance verte',en:'Green finance mentorship programme'},
       desc:{fr:"Six mois d'accompagnement par des experts de la finance verte pour structurer votre modèle et préparer une levée de fonds.",en:'Six months of guidance from green-finance experts to structure your model and prepare a fundraise.'},
       countries:['Tous les pays'], deadline:'2026-08-28', apps:11},
      {id:'circulaire', pub:'published', state:'upcoming',
       type:{fr:'Économie circulaire',en:'Circular economy'},
       title:{fr:'Appel économie circulaire côtière',en:'Coastal circular economy call'},
       desc:{fr:'Soutien aux coopératives de collecte et de valorisation des déchets du littoral. Ouverture prochaine, préparez votre dossier.',en:'Support for coastal waste-collection and recovery cooperatives. Opening soon, prepare your application.'},
       countries:['Ghana','Sénégal'], opens:{fr:'Ouverture sept. 2026',en:'Opens Sept. 2026'}},
      {id:'agriculture', pub:'published', state:'upcoming',
       type:{fr:'Agriculture résiliente',en:'Resilient agriculture'},
       title:{fr:'Bourse agriculture climato-résiliente',en:'Climate-resilient agriculture grant'},
       desc:{fr:"Financement de parcelles pilotes et d'équipements pour les jeunes agriculteurs des zones côtières.",en:'Funding for pilot plots and equipment for young farmers in coastal areas.'},
       countries:['Sierra Leone','Liberia'], opens:{fr:'Ouverture oct. 2026',en:'Opens Oct. 2026'}},
      {id:'cohorte-1', pub:'published', state:'closed',
       type:{fr:'Entreprise verte',en:'Green enterprise'},
       title:{fr:'Cohorte 1 : incubation des entreprises vertes',en:'Cohort 1: green enterprise incubation'},
       desc:{fr:'Premier appel du programme, clôturé en avril 2026. La première cohorte est en cours de constitution.',en:'The programme first call, closed in April 2026. The first cohort is being assembled.'},
       countries:['Tous les pays'], apps:140}
    ],

    /* Selection criteria : the grid a project is JUDGED on, distinct from eligibility
       (who may apply). Audit v9 A1/B1 : one source, published, carried into the
       application (self-assessment) and the evaluation grid, then aggregated for
       reporting. Weights sum to 100. Never confuse with the calls' `criteria`
       (those are admissibility conditions). */
    selection_criteria:[
      {id:'durabilite', weight:40, icon:'ti-plant-2',
       title:{fr:'Durabilité environnementale',en:'Environmental sustainability'},
       short:{fr:'Bénéfice écologique réel et mesurable',en:'Real, measurable ecological benefit'},
       desc:{fr:"Le projet apporte un bénéfice environnemental concret et mesurable pour le littoral : carbone, biodiversité, eau, sols ou déchets. Nous regardons la preuve d'impact, pas l'intention.",en:'The project delivers a concrete, measurable environmental benefit for the coast: carbon, biodiversity, water, soils or waste. We look at proof of impact, not intention.'},
       prompt:{fr:'En quoi votre projet produit-il un bénéfice environnemental mesurable ?',en:'How does your project produce a measurable environmental benefit?'}},
      {id:'emplois', weight:30, icon:'ti-users',
       title:{fr:"Création d'emplois",en:'Job creation'},
       short:{fr:'Emplois verts créés ou visés, surtout pour les jeunes',en:'Green jobs created or targeted, especially for youth'},
       desc:{fr:"Le projet crée ou vise des emplois décents, en priorité pour les jeunes et les femmes du territoire. Nous regardons le nombre, la qualité et la crédibilité de la trajectoire d'emploi.",en:'The project creates or targets decent jobs, primarily for young people and women in the territory. We look at the number, quality and credibility of the employment trajectory.'},
       prompt:{fr:'Combien d’emplois votre projet crée-t-il ou vise-t-il, et pour qui ?',en:'How many jobs does your project create or target, and for whom?'}},
      {id:'synergie', weight:30, icon:'ti-share',
       title:{fr:'Synergie et réplicabilité',en:'Synergy and replicability'},
       short:{fr:'Potentiel de réplication dans un autre pays du programme',en:'Potential to replicate in another programme country'},
       desc:{fr:"Le projet peut se répliquer ou se connecter à d'autres initiatives dans un autre pays côtier du programme. Nous regardons le potentiel de passage à l'échelle et de coopération régionale.",en:'The project can replicate or connect to other initiatives in another coastal programme country. We look at the potential for scale-up and regional cooperation.'},
       prompt:{fr:'Comment votre projet pourrait-il se répliquer dans un autre pays du programme ?',en:'How could your project replicate in another programme country?'}}
    ],
    news:[
      {id:'agrotrip-saloum-edition-6', pub:'published', date:'2026-06-01', author:'Équipe programme',
       role:{fr:'Équipe du programme',en:'Programme team'}, readMin:6,
       cat:{fr:'Événement',en:'Event'}, catCode:'evenement', country:'Sénégal', paysCode:'senegal',
       img:'assets/media/10-agrotrip/agrotrip-baobab-gathering.webp', heroImg:'assets/media/10-agrotrip/agrotrip-bolong-pirogue.webp',
       heroCaption:{fr:"Retour de la balade en pirogue sur les bolongs de Ndagane, au cœur des mangroves du Saloum.",en:'Returning from the pirogue ride on the bolongs of Ndagane, in the heart of the Saloum mangroves.'},
       tags:[{fr:'AgroTrip',en:'AgroTrip'},{fr:'Saloum',en:'Saloum'},{fr:'Mangroves',en:'Mangroves'},{fr:'Reboisement',en:'Reforestation'},{fr:'Leadership féminin',en:'Women leadership'},{fr:'Sénégal',en:'Senegal'}],
       title:{fr:'AgroTrip Édition 6 : trois jours dans les mangroves du Saloum',en:'AgroTrip Edition 6: three days in the Saloum mangroves'},
       excerpt:{fr:"Du 29 au 31 mai 2026, entre Fimela, Toubacouta et Ndagane, l'AgroTrip a mêlé leadership féminin, savoirs de la mangrove et un reboisement de 144 arbres avec l'Institut Africain de la Gouvernance.",en:'From 29 to 31 May 2026, across Fimela, Toubacouta and Ndagane, AgroTrip wove together women leadership, mangrove knowledge and a 144-tree reforestation with the Africa Governance Institute.'},
       body:{fr:"<p><span class='drop'>T</span>rois jours dans le Sine-Saloum, entre Fimela, Toubacouta et Ndagane : du 29 au 31 mai 2026, l'AgroTrip Édition 6, « Welcome to Saloum », a réuni jeunes entrepreneurs, femmes des terroirs et partenaires autour d'une même conviction. La résilience du littoral se construit sur le terrain, au contact des mangroves et de celles et ceux qui en vivent.</p><p>Porté dans l'esprit de Coastal Futures et de l'Institut Africain de la Gouvernance, ce voyage a mêlé gastronomie, leadership féminin, savoirs de la mangrove et un geste fort pour le climat : la plantation de 144 arbres à Toubacouta.</p><div class='keyfacts'><div class='kf-h'><i class='ti ti-info-circle'></i>L'essentiel de l'AgroTrip</div><div class='kf-grid'><div class='kf-item'><div class='n tnum'>144</div><div class='l'>Arbres plantés à la forêt de Sangako, Toubacouta</div></div><div class='kf-item'><div class='n tnum'>3</div><div class='l'>Jours d'immersion : Fimela, Toubacouta, Ndagane</div></div><div class='kf-item'><div class='n tnum'>29-31</div><div class='l'>Mai 2026, au cœur du Saloum</div></div></div></div><h2>Jour 1 : les racines qui résistent</h2><p>Le road trip gourmand parti de Dakar a posé ses valises à Fimela, accueilli par les terres du Saloum. La première rencontre, l'AgroTalk « Les Racines qui Résistent », a placé le leadership féminin et la résilience climatique au centre de la conversation : comment les femmes du littoral tiennent, transmettent et réinventent les savoirs face au changement.</p><div class='art-figure'><figure><img src='assets/media/10-agrotrip/agrotrip-agrotalk-panel.webp' alt='AgroTalk Les Racines qui Resistent a Fimela'><figcaption>AgroTalk « Les Racines qui Résistent » : le leadership féminin et la résilience climatique en ouverture de l'AgroTrip, à Fimela.</figcaption></figure></div><p>La soirée d'ouverture, le Nguèl, a prolongé les échanges en musique et en convivialité, avant le « Mango Sunset Dinner » partagé face au coucher de soleil.</p><div class='pullquote'><blockquote>Les racines qui résistent sont celles qui tiennent le littoral : la mangrove, les femmes et la jeunesse avancent ensemble.</blockquote><cite>AgroTalk, Fimela</cite></div><h2>Jour 2 : l'expérience de la mangrove</h2><p>Cap sur Toubacouta. La journée s'est ouverte par un reboisement de la forêt de Sangako et des écoles de Toubacouta, mené avec l'Institut Africain de la Gouvernance : 144 arbres mis en terre, un geste symbolique pour la résilience climatique du littoral.</p><div class='art-figure'><figure><img src='assets/media/10-agrotrip/agrotrip-reforestation-volunteer.webp' alt='Reboisement de la foret de Sangako avec IAG'><figcaption>Reboisement de la forêt de Sangako et des écoles de Toubacouta avec l'Institut Africain de la Gouvernance : 144 arbres plantés.</figcaption></figure></div><p>L'atelier « Saveurs de la Mangrove » a ensuite ouvert les secrets de la transformation des huîtres marinées et du poisson séché, avant un déjeuner au Restaurant des Femmes de Toubacouta. L'après-midi, « Récolte des Profondeurs » a conduit le groupe dans les mangroves : cueillette d'huîtres de palétuviers, pêche aux crevettes et aux coquillages.</p><div class='art-gallery'><figure><img src='assets/media/10-agrotrip/agrotrip-mangrove-flavours.webp' alt='Atelier Saveurs de la Mangrove a Toubacouta'><figcaption>Atelier « Saveurs de la Mangrove » : huîtres marinées et poisson séché, le savoir-faire des femmes de Toubacouta.</figcaption></figure><figure><img src='assets/media/10-agrotrip/agrotrip-oyster-harvest.webp' alt='Recolte huitres dans les mangroves de Toubacouta'><figcaption>« Récolte des Profondeurs » : cueillette d'huîtres de palétuviers au cœur des mangroves.</figcaption></figure></div><h2>Jour 3 : slow Sunday Saloum</h2><p>Le dernier jour a pris le rythme du fleuve. « Glisser sur les Bolongs », une balade en pirogue dans les mangroves de Ndagane, a offert un dernier face-à-face avec ce paysage que le programme s'attache à protéger. Un Brunch Sérère a clôturé le séjour, avant le retour sur Dakar.</p><div class='art-gallery'><figure><img src='assets/media/10-agrotrip/agrotrip-pirogue-glide.webp' alt='Balade en pirogue sur les bolongs de Ndagane'><figcaption>« Glisser sur les Bolongs » : navigation dans les mangroves de Ndagane.</figcaption></figure><figure><img src='assets/media/10-agrotrip/agrotrip-dusk-shore.webp' alt='Rive du Saloum en fin de journee'><figcaption>Les pieds dans l'eau du Saloum, au fil des bolongs.</figcaption></figure></div><p>Au-delà des paysages, l'AgroTrip rappelle ce que défend Coastal Futures : des solutions fondées sur la nature, une économie bleue portée par les femmes et la jeunesse, et des communautés qui font de la mangrove une ressource d'avenir. Les liens tissés dans le Saloum nourrissent la cohorte qui se constitue à travers les cinq pays côtiers.</p>",en:"<p><span class='drop'>T</span>hree days in the Sine-Saloum, across Fimela, Toubacouta and Ndagane: from 29 to 31 May 2026, AgroTrip Edition 6, 'Welcome to Saloum', brought together young entrepreneurs, women from the land and partners around one conviction. Coastal resilience is built in the field, close to the mangroves and to the people who live from them.</p><p>Carried in the spirit of Coastal Futures and the Africa Governance Institute, the trip wove together gastronomy, women leadership, mangrove knowledge and a strong gesture for the climate: planting 144 trees in Toubacouta.</p><div class='keyfacts'><div class='kf-h'><i class='ti ti-info-circle'></i>AgroTrip at a glance</div><div class='kf-grid'><div class='kf-item'><div class='n tnum'>144</div><div class='l'>Trees planted in the Sangako forest, Toubacouta</div></div><div class='kf-item'><div class='n tnum'>3</div><div class='l'>Days of immersion: Fimela, Toubacouta, Ndagane</div></div><div class='kf-item'><div class='n tnum'>29-31</div><div class='l'>May 2026, in the heart of the Saloum</div></div></div></div><h2>Day 1: the roots that resist</h2><p>The gourmet road trip from Dakar settled in Fimela, welcomed by the land of the Saloum. The first gathering, the AgroTalk 'Roots that Resist', placed women leadership and climate resilience at the centre of the conversation: how coastal women hold, pass on and reinvent knowledge in the face of change.</p><div class='art-figure'><figure><img src='assets/media/10-agrotrip/agrotrip-agrotalk-panel.webp' alt='AgroTalk Roots that Resist in Fimela'><figcaption>AgroTalk 'Roots that Resist': women leadership and climate resilience opening AgroTrip, in Fimela.</figcaption></figure></div><p>The opening evening, the Nguèl, extended the exchanges with music and warmth, before the 'Mango Sunset Dinner' shared facing the sunset.</p><div class='pullquote'><blockquote>The roots that resist are the ones that hold the coast: the mangrove, women and youth move forward together.</blockquote><cite>AgroTalk, Fimela</cite></div><h2>Day 2: the mangrove experience</h2><p>On to Toubacouta. The day opened with a reforestation of the Sangako forest and the Toubacouta schools, led with the Africa Governance Institute: 144 trees in the ground, a symbolic gesture for the climate resilience of the coast.</p><div class='art-figure'><figure><img src='assets/media/10-agrotrip/agrotrip-reforestation-volunteer.webp' alt='Reforestation of the Sangako forest with AGI'><figcaption>Reforestation of the Sangako forest and the Toubacouta schools with the Africa Governance Institute: 144 trees planted.</figcaption></figure></div><p>The 'Flavours of the Mangrove' workshop then opened the secrets of marinated oysters and dried fish, before lunch at the Women's Restaurant of Toubacouta. In the afternoon, 'Harvest of the Depths' led the group into the mangroves: gathering mangrove oysters, fishing for shrimp and shellfish.</p><div class='art-gallery'><figure><img src='assets/media/10-agrotrip/agrotrip-mangrove-flavours.webp' alt='Flavours of the Mangrove workshop in Toubacouta'><figcaption>'Flavours of the Mangrove' workshop: marinated oysters and dried fish, the know-how of the women of Toubacouta.</figcaption></figure><figure><img src='assets/media/10-agrotrip/agrotrip-oyster-harvest.webp' alt='Oyster harvest in the Toubacouta mangroves'><figcaption>'Harvest of the Depths': gathering mangrove oysters in the heart of the mangroves.</figcaption></figure></div><h2>Day 3: slow Sunday Saloum</h2><p>The last day took the rhythm of the river. 'Gliding on the Bolongs', a pirogue ride through the mangroves of Ndagane, offered one last encounter with the landscape the programme works to protect. A Serer Brunch closed the stay, before the return to Dakar.</p><div class='art-gallery'><figure><img src='assets/media/10-agrotrip/agrotrip-pirogue-glide.webp' alt='Pirogue ride on the bolongs of Ndagane'><figcaption>'Gliding on the Bolongs': navigating the mangroves of Ndagane.</figcaption></figure><figure><img src='assets/media/10-agrotrip/agrotrip-dusk-shore.webp' alt='Saloum shore at the end of the day'><figcaption>Feet in the water of the Saloum, along the bolongs.</figcaption></figure></div><p>Beyond the landscapes, AgroTrip is a reminder of what Coastal Futures stands for: nature-based solutions, a blue economy carried by women and youth, and communities that make the mangrove a resource for the future. The bonds woven in the Saloum nourish the cohort taking shape across the five coastal countries.</p>"}},

      {id:'lancement-dakar', pub:'published', featured:true, date:'2026-06-02', author:'Saïfi Dawalbet Hamit',
       role:{fr:'Coordination du programme',en:'Programme coordination'}, readMin:5,
       cat:{fr:'Événement',en:'Event'}, catCode:'evenement', country:'Régional', paysCode:'all',
       img:'assets/media/01-events/launch-ceremony-wide.webp', heroImg:'assets/media/01-events/launch-stage-panel.webp',
       heroCaption:{fr:"Répétition de la table ronde des jeunes innovateurs, à la veille du lancement à Dakar.",en:'Rehearsal of the young innovators panel, on the eve of the Dakar launch.'},
       tags:[{fr:'Lancement',en:'Launch'},{fr:'Dakar',en:'Dakar'},{fr:'Programme régional',en:'Regional programme'},{fr:'CEDEAO',en:'ECOWAS'}],
       title:{fr:'Coastal Futures sera lancé officiellement à Dakar le 10 juin 2026',en:'Coastal Futures officially launches in Dakar on 10 June 2026'},
       excerpt:{fr:"Ministères, institutions régionales et partenaires techniques et financiers se réuniront pour ouvrir le programme et dévoiler la plateforme d'impact.",en:'Ministries, regional institutions and technical and financial partners will gather to open the programme and unveil the impact platform.'},
       body:{fr:"<p><span class='drop'>L</span>e 10 juin 2026, Dakar accueillera le lancement officiel de Coastal Futures, le programme régional porté par l'Institut Africain de la Gouvernance, sous l'égide de la Journée mondiale de l'environnement. La cérémonie réunira une centaine de participants : représentants des ministères des cinq pays côtiers, CEDEAO, Commission de l'Union Africaine, corps diplomatique, partenaires techniques et financiers, médias et jeunes bénéficiaires.</p><p>Pensé pour repositionner la jeunesse comme actrice économique centrale de la transition verte, le programme se fixe pour objectif de former 4 000 jeunes entrepreneurs verts au Sénégal, au Ghana, en Guinée-Conakry, au Liberia et en Sierra Leone. Le lancement ouvre la feuille de route d'avril 2026 à mars 2027.</p><div class='keyfacts'><div class='kf-h'><i class='ti ti-info-circle'></i>L'essentiel de l'événement</div><div class='kf-grid'><div class='kf-item'><div class='n tnum'>10 juin</div><div class='l'>Cérémonie de lancement à Dakar, Sénégal</div></div><div class='kf-item'><div class='n tnum'>5</div><div class='l'>Pays côtiers représentés</div></div><div class='kf-item'><div class='n tnum'>4 000</div><div class='l'>Jeunes entrepreneurs à former, en objectif</div></div></div></div><h2>Des accords signés avec les organisations d'exécution</h2><p>Temps fort de la journée, l'Institut Africain de la Gouvernance signera des accords de partenariat avec les organisations d'exécution locales, dont le Climate Linguère Club au Sénégal et Craving 4 Development en Sierra Leone. Ces hubs jeunesse animeront l'accompagnement de terrain dans chacun des cinq pays.</p><div class='pullquote'><blockquote>Les jeunes d'Afrique de l'Ouest ne sont pas les victimes du changement climatique : ils en sont les bâtisseurs de solutions. Coastal Futures leur en donne les moyens.</blockquote><cite>Institut Africain de la Gouvernance, note de cadrage du programme</cite></div><p>La plateforme d'impact sera présentée le jour même. À mesure que les projets seront labellisés, ils y figureront avec leurs indicateurs, offrant aux partenaires un reporting rigoureux, validé et sourcé. Pour les jeunes entrepreneurs, le lancement ouvre aussi l'accès au réseau de mentors et aux <a class='inline' href='appels-candidatures.html'>appels à candidatures</a> de la première cohorte.</p>",en:"<p><span class='drop'>O</span>n 10 June 2026, Dakar will host the official launch of Coastal Futures, the regional programme led by the Africa Governance Institute, under the banner of World Environment Day. The ceremony will bring together around one hundred participants: representatives of the five coastal countries ministries, ECOWAS, the African Union Commission, the diplomatic corps, technical and financial partners, media and young beneficiaries.</p><p>Designed to reposition youth as central economic actors of the green transition, the programme sets an objective of training 4,000 young green entrepreneurs in Senegal, Ghana, Guinea, Liberia and Sierra Leone. The launch opens the roadmap running from April 2026 to March 2027.</p><div class='keyfacts'><div class='kf-h'><i class='ti ti-info-circle'></i>Event at a glance</div><div class='kf-grid'><div class='kf-item'><div class='n tnum'>10 June</div><div class='l'>Launch ceremony in Dakar, Senegal</div></div><div class='kf-item'><div class='n tnum'>5</div><div class='l'>Coastal countries represented</div></div><div class='kf-item'><div class='n tnum'>4,000</div><div class='l'>Young entrepreneurs to train, as a target</div></div></div></div><h2>Agreements signed with execution partners</h2><p>A highlight of the day, the Africa Governance Institute will sign partnership agreements with local execution organisations, including the Climate Linguère Club in Senegal and Craving 4 Development in Sierra Leone. These youth hubs will run on-the-ground support in each of the five countries.</p><div class='pullquote'><blockquote>The youth of West Africa are not the victims of climate change: they are the builders of its solutions. Coastal Futures gives them the means.</blockquote><cite>Africa Governance Institute, programme framing note</cite></div><p>The impact platform will be presented on the day. As projects are certified, they will appear there with their indicators, giving partners rigorous, validated and sourced reporting. For young entrepreneurs, the launch also opens access to the mentor network and the <a class='inline' href='appels-candidatures.html'>calls for applications</a> of the first cohort.</p>"}},

      {id:'mangroves-monrovia', pub:'published', date:'2026-05-28', author:'James Tuah',
       role:{fr:'Hub jeunesse, Monrovia',en:'Youth hub, Monrovia'}, readMin:4,
       cat:{fr:'Impact',en:'Impact'}, catCode:'impact', country:'Liberia', paysCode:'liberia',
       img:'assets/media/07-library/scene-mangrove-restoration.webp', heroImg:'assets/media/02-mangroves/mangrove-restoration-hero.webp',
       heroCaption:{fr:"Le long du littoral de Mesurado, les premiers semis de palétuviers prennent racine.",en:'Along the Mesurado coast, the first mangrove seedlings take root.'},
       tags:[{fr:'Mangroves',en:'Mangroves'},{fr:'Liberia',en:'Liberia'},{fr:'Littoral',en:'Coastline'},{fr:'Hub jeunesse',en:'Youth hub'}],
       title:{fr:'Au Liberia, le hub jeunesse prépare la restauration des mangroves',en:'In Liberia, the youth hub prepares mangrove restoration'},
       excerpt:{fr:"À Monrovia, le hub jeunesse et ses partenaires préparent les premiers chantiers de restauration des mangroves le long du littoral de Mesurado.",en:'In Monrovia, the youth hub and its partners are preparing the first mangrove restoration sites along the Mesurado coast.'},
       body:{fr:"<p><span class='drop'>À</span> Monrovia, le hub jeunesse du programme prépare ses premiers chantiers de restauration de mangroves le long du littoral de Mesurado. Les équipes cartographient les zones dégradées, identifient les pépinières et forment les jeunes volontaires aux techniques de plantation.</p><p>Les mangroves protègent le trait de côte de l'érosion et de la montée du niveau marin, qui pourrait atteindre soixante centimètres d'ici 2100. Elles abritent aussi les nurseries de poissons dont dépendent les communautés de pêche.</p><div class='pullquote'><blockquote>Restaurer la mangrove, c'est protéger nos maisons et nos moyens de subsistance en même temps.</blockquote><cite>Hub jeunesse de Monrovia</cite></div><p>Les surfaces restaurées seront suivies sur la plateforme d'impact à mesure que les parcelles seront labellisées. Le projet vise à mobiliser les jeunes des quartiers côtiers et à créer des revenus durables autour de la protection du littoral.</p>",en:"<p><span class='drop'>I</span>n Monrovia, the programme youth hub is preparing its first mangrove restoration sites along the Mesurado coast. Teams are mapping degraded areas, identifying nurseries and training young volunteers in planting techniques.</p><p>Mangroves protect the coastline from erosion and rising sea levels, which could reach sixty centimetres by 2100. They also shelter the fish nurseries that coastal fishing communities depend on.</p><div class='pullquote'><blockquote>Restoring mangroves means protecting our homes and our livelihoods at the same time.</blockquote><cite>Monrovia youth hub</cite></div><p>Restored areas will be tracked on the impact platform as plots are certified. The project aims to mobilise young people from coastal neighbourhoods and to create lasting income around coastal protection.</p>"}},

      {id:'accra-dechets', pub:'published', date:'2026-05-21', author:'Fatou Sarr',
       role:{fr:'Hub jeunesse, Accra',en:'Youth hub, Accra'}, readMin:4,
       cat:{fr:'Économie circulaire',en:'Circular economy'}, catCode:'circulaire', country:'Ghana', paysCode:'ghana',
       img:'assets/media/07-library/scene-recycling-sorting.webp', heroImg:'assets/media/04-projects/recycling-waste-collection-accra.webp',
       heroCaption:{fr:"À Accra, les jeunes collecteurs trient les plastiques récupérés sur le littoral.",en:'In Accra, young collectors sort plastics recovered from the coast.'},
       tags:[{fr:'Économie circulaire',en:'Circular economy'},{fr:'Ghana',en:'Ghana'},{fr:'Déchets',en:'Waste'},{fr:'Emploi des jeunes',en:'Youth jobs'}],
       title:{fr:"Ghana : le hub jeunesse mobilise les coopératives de l'économie circulaire",en:'Ghana: the youth hub mobilises circular-economy cooperatives'},
       excerpt:{fr:"À Accra, le hub jeunesse structure les coopératives de collecte pour transformer les plastiques du littoral et créer des emplois pour les jeunes.",en:'In Accra, the youth hub is organising collection cooperatives to transform coastal plastics and create jobs for young people.'},
       body:{fr:"<p><span class='drop'>À</span> Accra, le hub jeunesse du programme structure les coopératives de collecte qui récupèrent les plastiques le long du littoral. L'objectif : organiser une filière où la valorisation des déchets devient une source de revenus pour les jeunes des quartiers côtiers.</p><p>Les coopératives apprennent à trier, nettoyer et préparer les matières pour les transformer en matériaux de construction. Le hub les accompagne vers la labellisation, qui ouvrira l'accès au réseau de mentors et aux financements.</p><div class='pullquote'><blockquote>Chaque tonne de plastique détournée de la plage, c'est un emploi et une plage plus propre.</blockquote><cite>Coopérative de collecte, Accra</cite></div><p>Les volumes valorisés seront suivis sur la plateforme d'impact à mesure que les projets seront labellisés. La démarche s'inscrit dans l'économie circulaire côtière, l'un des quatre piliers du programme.</p>",en:"<p><span class='drop'>I</span>n Accra, the programme youth hub is organising the collection cooperatives that recover plastics along the coast. The goal: to build a value chain where waste recovery becomes a source of income for young people in coastal neighbourhoods.</p><p>The cooperatives learn to sort, clean and prepare materials to turn them into building products. The hub guides them towards certification, which will open access to the mentor network and to funding.</p><div class='pullquote'><blockquote>Every tonne of plastic kept off the beach is a job and a cleaner shore.</blockquote><cite>Collection cooperative, Accra</cite></div><p>Recovered volumes will be tracked on the impact platform as projects are certified. The approach is part of the coastal circular economy, one of the programme four pillars.</p>"}},

      {id:'dakar-solar', pub:'published', date:'2026-05-14', author:'Équipe programme',
       role:{fr:'Équipe du programme',en:'Programme team'}, readMin:4,
       cat:{fr:'Énergie renouvelable',en:'Renewable energy'}, catCode:'energie', country:'Sénégal', paysCode:'senegal',
       img:'assets/media/07-library/scene-solar-minigrid.webp', heroImg:'assets/media/03-solar/solar-minigrid-hero.webp',
       heroCaption:{fr:"Sur la Petite Côte, les premiers mini-réseaux solaires portés par les jeunes prennent forme.",en:'On the Petite Côte, the first youth-led solar mini-grids take shape.'},
       tags:[{fr:'Énergie',en:'Energy'},{fr:'Sénégal',en:'Senegal'},{fr:'Zone pilote',en:'Pilot zone'},{fr:'Partenaire',en:'Partner'}],
       title:{fr:"Sénégal : Climate Linguère Club, partenaire d'exécution de la zone pilote",en:'Senegal: Climate Linguère Club, execution partner for the pilot zone'},
       excerpt:{fr:"Dans la zone pilote, Climate Linguère Club prépare l'accompagnement des premières entreprises solaires portées par les jeunes de la Petite Côte.",en:'In the pilot zone, Climate Linguère Club is preparing to support the first solar ventures led by young people on the Petite Côte.'},
       body:{fr:"<p><span class='drop'>S</span>ur la Petite Côte, le Climate Linguère Club devient le partenaire d'exécution de la zone pilote du programme. L'organisation accompagnera les premières entreprises solaires portées par des jeunes, depuis le diagnostic des besoins jusqu'à la préparation des dossiers.</p><p>L'accès à une énergie propre et fiable conditionne l'activité économique du littoral, des ateliers de transformation aux chambres froides des communautés de pêche. Les mini-réseaux solaires installés et entretenus localement créent aussi des emplois techniques.</p><div class='pullquote'><blockquote>Former des techniciens issus des communautés, c'est ancrer la transition dans le territoire.</blockquote><cite>Climate Linguère Club, Sénégal</cite></div><p>Les foyers raccordés seront suivis sur la plateforme d'impact à mesure que les entreprises seront labellisées. La zone pilote sert de modèle avant l'extension à l'ensemble du littoral.</p>",en:"<p><span class='drop'>O</span>n the Petite Côte, the Climate Linguère Club becomes the execution partner for the programme pilot zone. The organisation will support the first youth-led solar ventures, from assessing needs to preparing applications.</p><p>Access to clean, reliable energy underpins coastal economic activity, from processing workshops to the cold rooms of fishing communities. Solar mini-grids installed and maintained locally also create technical jobs.</p><div class='pullquote'><blockquote>Training technicians from within the communities anchors the transition in the territory.</blockquote><cite>Climate Linguère Club, Senegal</cite></div><p>Connected homes will be tracked on the impact platform as ventures are certified. The pilot zone serves as a model before extending across the coastline.</p>"}},

      {id:'87-projets-incubation', pub:'published', date:'2026-05-06', author:'Équipe programme',
       role:{fr:'Équipe du programme',en:'Programme team'}, readMin:3,
       cat:{fr:'Hub jeunesse',en:'Youth hub'}, catCode:'hub', country:'Régional', paysCode:'all',
       img:'assets/media/09-extras/extra-training-leadership.webp', heroImg:'assets/media/01-events/workshop-in-room.webp',
       heroCaption:{fr:"Atelier d'accompagnement : les porteurs de projets préparent leur candidature.",en:'Support workshop: project leaders prepare their applications.'},
       tags:[{fr:'Cohorte 1',en:'Cohort 1'},{fr:'Inscriptions',en:'Registration'},{fr:'Mentorat',en:'Mentorship'},{fr:'Régional',en:'Regional'}],
       title:{fr:'Cohorte 1 : les inscriptions sont ouvertes dans les cinq pays',en:'Cohort 1: registration is open across the five countries'},
       excerpt:{fr:"À travers les cinq pays, les jeunes porteurs de solutions vertes peuvent rejoindre la première cohorte et son réseau de mentors.",en:'Across the five countries, young green-solution leaders can join the first cohort and its network of mentors.'},
       body:{fr:"<p><span class='drop'>L</span>es inscriptions à la première cohorte de Coastal Futures sont ouvertes dans les cinq pays côtiers. Les jeunes de 18 à 35 ans porteurs d'une solution verte en phase de démarrage peuvent candidater pour rejoindre le programme et son réseau de mentors.</p><p>L'accompagnement prévoit douze semaines d'incubation, l'accès aux appels à candidatures et un soutien complet vers la labellisation. Le programme vise à former 4 000 jeunes entrepreneurs verts sur l'ensemble de la feuille de route.</p><div class='pullquote'><blockquote>La cohorte 1 ouvre la porte : nous voulons que chaque idée trouve un mentor et un chemin.</blockquote><cite>Équipe du programme</cite></div><p>Les candidatures se déposent depuis l'espace dédié. Les projets retenus apparaîtront sur la carte d'impact à mesure de leur avancement, des premières étapes jusqu'à la labellisation.</p>",en:"<p><span class='drop'>R</span>egistration for the first Coastal Futures cohort is open across the five coastal countries. Young people aged 18 to 35 leading an early-stage green solution can apply to join the programme and its mentor network.</p><p>Support includes twelve weeks of incubation, access to calls for applications and full help towards certification. The programme aims to train 4,000 young green entrepreneurs over the whole roadmap.</p><div class='pullquote'><blockquote>Cohort 1 opens the door: we want every idea to find a mentor and a path.</blockquote><cite>Programme team</cite></div><p>Applications are submitted from the dedicated space. Selected projects will appear on the impact map as they progress, from the first steps through to certification.</p>"}},

      {id:'conakry-peche', pub:'published', date:'2026-04-29', author:'Sékou Camara',
       role:{fr:'Hub jeunesse, Conakry',en:'Youth hub, Conakry'}, readMin:4,
       cat:{fr:'Hub jeunesse',en:'Youth hub'}, catCode:'hub', country:'Guinée-Conakry', paysCode:'guinee',
       img:'assets/media/07-library/scene-fishing-boats.webp', heroImg:'assets/media/05-stories/story-guinea-fishing.webp',
       heroCaption:{fr:"Sur la côte guinéenne, les pêcheurs s'organisent autour de pratiques plus durables.",en:'On the Guinean coast, fishers organise around more sustainable practices.'},
       tags:[{fr:'Économie bleue',en:'Blue economy'},{fr:'Guinée',en:'Guinea'},{fr:'Pêche',en:'Fishing'},{fr:'Hub jeunesse',en:'Youth hub'}],
       title:{fr:'Guinée : le hub jeunesse mobilise les communautés de pêche',en:'Guinea: the youth hub mobilises fishing communities'},
       excerpt:{fr:"Le hub guinéen accompagne les pêcheurs vers des pratiques résilientes et structure les premières entreprises bleues de la côte.",en:'The Guinean hub guides fishers towards resilient practices and structures the first blue businesses on the coast.'},
       body:{fr:"<p><span class='drop'>À</span> Conakry, le hub jeunesse du programme fédère les communautés de pêche autour de pratiques plus résilientes et durables. Surpêche, dégradation des nurseries et concurrence des flottes industrielles fragilisent une activité dont dépendent des milliers de familles.</p><p>Le hub accompagne la création des premières entreprises bleues de la côte guinéenne : conservation, transformation et commercialisation de produits de la mer à plus forte valeur ajoutée.</p><div class='pullquote'><blockquote>La mer nourrit nos familles depuis des générations : à nous de la préserver pour les suivantes.</blockquote><cite>Communauté de pêche, Conakry</cite></div><p>Les jeunes porteurs de projets bénéficient du réseau de mentors et des appels à candidatures du programme. Leur progression sera visible sur la carte d'impact commune.</p>",en:"<p><span class='drop'>I</span>n Conakry, the programme youth hub brings fishing communities together around more resilient and sustainable practices. Overfishing, degraded nurseries and competition from industrial fleets weaken an activity that thousands of families depend on.</p><p>The hub supports the creation of the first blue businesses on the Guinean coast: preserving, processing and marketing higher-value seafood products.</p><div class='pullquote'><blockquote>The sea has fed our families for generations: it is up to us to protect it for the next ones.</blockquote><cite>Fishing community, Conakry</cite></div><p>Young project leaders benefit from the mentor network and the programme calls for applications. Their progress will be visible on the shared impact map.</p>"}},

      {id:'freetown-agri', pub:'published', date:'2026-04-22', author:'Ibrahim Koroma',
       role:{fr:'Craving 4 Development, Freetown',en:'Craving 4 Development, Freetown'}, readMin:4,
       cat:{fr:'Impact',en:'Impact'}, catCode:'impact', country:'Sierra Leone', paysCode:'sierraleone',
       img:'assets/media/07-library/scene-resilient-farming.webp', heroImg:'assets/media/07-library/scene-resilient-farming.webp',
       heroCaption:{fr:"Autour de Freetown, des parcelles pilotes testent des cultures adaptées au climat.",en:'Around Freetown, pilot plots test climate-adapted crops.'},
       tags:[{fr:'Agriculture',en:'Agriculture'},{fr:'Sierra Leone',en:'Sierra Leone'},{fr:'Résilience',en:'Resilience'},{fr:'Partenaire',en:'Partner'}],
       title:{fr:"Sierra Leone : Craving 4 Development lance ses parcelles d'agriculture résiliente",en:'Sierra Leone: Craving 4 Development launches its resilient-farming plots'},
       excerpt:{fr:"Autour de Freetown, les jeunes agriculteurs testent des cultures adaptées au climat pour sécuriser les revenus et l'alimentation locale.",en:'Around Freetown, young farmers are testing climate-adapted crops to secure income and local food.'},
       body:{fr:"<p><span class='drop'>A</span>utour de Freetown, Craving 4 Development, partenaire d'exécution du programme en Sierra Leone, installe ses premières parcelles pilotes d'agriculture résiliente au climat. Les jeunes agriculteurs y testent des cultures adaptées à la salinité croissante et aux pluies irrégulières.</p><p>L'enjeu est double : sécuriser les revenus des exploitations et renforcer l'alimentation locale face aux aléas climatiques. Les parcelles servent aussi de terrain d'apprentissage et de démonstration pour les communautés voisines.</p><div class='pullquote'><blockquote>On ne subit pas le climat : on apprend à cultiver avec lui.</blockquote><cite>Craving 4 Development, Freetown</cite></div><p>Les jeunes porteurs sont accompagnés vers la labellisation et le réseau de mentors. Les résultats des parcelles alimenteront les indicateurs suivis sur la plateforme d'impact.</p>",en:"<p><span class='drop'>A</span>round Freetown, Craving 4 Development, the programme execution partner in Sierra Leone, is setting up its first pilot plots of climate-resilient agriculture. Young farmers test crops adapted to rising salinity and irregular rainfall.</p><p>The stakes are twofold: securing farm income and strengthening local food supply against climate shocks. The plots also serve as a learning and demonstration ground for neighbouring communities.</p><div class='pullquote'><blockquote>We do not endure the climate: we learn to farm with it.</blockquote><cite>Craving 4 Development, Freetown</cite></div><p>Young leaders are supported towards certification and the mentor network. Plot results will feed the indicators tracked on the impact platform.</p>"}},

      {id:'ouverture-hubs', pub:'published', date:'2026-04-15', author:'Saïfi Dawalbet Hamit',
       role:{fr:'Coordination du programme',en:'Programme coordination'}, readMin:3,
       cat:{fr:'Événement',en:'Event'}, catCode:'evenement', country:'Régional', paysCode:'all',
       img:'assets/media/09-extras/extra-event-audience-wide.webp', heroImg:'assets/media/01-events/launch-ceremony-wide.webp',
       heroCaption:{fr:"Rencontre régionale : chaque pays active son hub jeunesse et rejoint la cartographie commune.",en:'Regional gathering: each country activates its youth hub and joins the shared map.'},
       tags:[{fr:'Hubs',en:'Hubs'},{fr:'Plateforme',en:'Platform'},{fr:'Régional',en:'Regional'},{fr:'Lancement',en:'Launch'}],
       title:{fr:'Ouverture des cinq hubs et mise en ligne de la plateforme',en:'Five hubs open and the platform goes live'},
       excerpt:{fr:"Le programme entre dans sa phase opérationnelle : chaque pays active son hub jeunesse et rejoint la cartographie d'impact commune.",en:'The programme enters its operational phase: each country activates its youth hub and joins the shared impact map.'},
       body:{fr:"<p><span class='drop'>A</span>vec l'ouverture des cinq hubs jeunesse, Coastal Futures entre dans sa phase opérationnelle. Au Sénégal, au Ghana, en Guinée-Conakry, au Liberia et en Sierra Leone, chaque hub devient le point d'ancrage local de l'accompagnement des jeunes entrepreneurs.</p><p>La plateforme d'impact est mise en ligne le même jour. Elle réunit la cartographie des projets, l'annuaire des entrepreneurs et des mentors, et un reporting destiné aux partenaires techniques et financiers, qui se remplira à mesure de la collecte.</p><div class='pullquote'><blockquote>Cinq pays, une même plateforme : chaque indicateur régional est la somme des cinq pays.</blockquote><cite>Coordination du programme</cite></div><p>Cette étape prépare le lancement officiel de Dakar et l'ouverture des premières cohortes. La feuille de route court jusqu'en mars 2027.</p>",en:"<p><span class='drop'>W</span>ith the opening of the five youth hubs, Coastal Futures enters its operational phase. In Senegal, Ghana, Guinea, Liberia and Sierra Leone, each hub becomes the local anchor for supporting young entrepreneurs.</p><p>The impact platform goes live the same day. It brings together the project map, the directory of entrepreneurs and mentors, and reporting for technical and financial partners, which will fill in as data is collected.</p><div class='pullquote'><blockquote>Five countries, one platform: every regional indicator is the sum of the five countries.</blockquote><cite>Programme coordination</cite></div><p>This step paves the way for the official Dakar launch and the opening of the first cohorts. The roadmap runs through March 2027.</p>"}}
    ],
    events:[
      {id:'lancement-dakar-ev', pub:'published', featured:true, date:'2026-06-10', author:'Saïfi Dawalbet Hamit',
       format:{fr:'Présentiel',en:'In person'}, fmtCode:'presentiel', country:'Sénégal',
       place:{fr:'Institut Africain de la Gouvernance, Dakar',en:'Africa Governance Institute, Dakar'}, capacity:200, img:'assets/photos/Hero.jpg',
       title:{fr:'Lancement officiel de Coastal Futures',en:'Official launch of Coastal Futures'},
       excerpt:{fr:"Cérémonie d'ouverture de la première phase du programme et présentation publique de la plateforme d'impact, en présence des cinq pays côtiers.",en:'Opening ceremony of the programme and public presentation of the impact platform, with the five coastal countries.'}},
      {id:'webinaire-labellisation', pub:'published', date:'2026-06-24', author:'Fanta Camara',
       format:{fr:'Virtuel',en:'Virtual'}, fmtCode:'online', country:'Régional', place:{fr:'En ligne',en:'Online'}, capacity:0, img:'assets/photos/Young-Entrepreneur.jpg',
       title:{fr:'Webinaire : monter un dossier de labellisation',en:'Webinar: building a certification application'},
       excerpt:{fr:'Les étapes clés pour préparer une candidature à la labellisation, animé par le comité.',en:'The key steps to prepare a certification application, led by the committee.'}},
      {id:'atelier-mentors', pub:'published', date:'2026-07-08', author:'Équipe programme',
       format:{fr:'Présentiel',en:'In person'}, fmtCode:'presentiel', country:'Ghana', place:{fr:'Accra Green Hub, Accra',en:'Accra Green Hub, Accra'}, capacity:60, img:'assets/photos/Recycling.jpg',
       title:{fr:'Atelier mentors et entrepreneurs',en:'Mentors and entrepreneurs workshop'},
       excerpt:{fr:'Une journée de mise en relation entre mentors et porteurs de projets du hub.',en:'A day connecting mentors and project leaders from the hub.'}},
      {id:'mangroves-terrain', pub:'published', date:'2026-07-22', author:'James Tuah',
       format:{fr:'Présentiel',en:'In person'}, fmtCode:'presentiel', country:'Liberia', place:{fr:'Monrovia Eco Hub, Monrovia',en:'Monrovia Eco Hub, Monrovia'}, capacity:40, img:'assets/photos/Mangrove.jpg',
       title:{fr:'Restauration de mangroves : journée terrain',en:'Mangrove restoration: field day'},
       excerpt:{fr:'Une journée sur le terrain autour des chantiers de restauration du littoral.',en:'A day in the field around the coastal restoration sites.'}},
      {id:'cloture-cohorte-1', pub:'published', date:'2026-09-15', author:'Sékou Camara',
       format:{fr:'Hybride',en:'Hybrid'}, fmtCode:'hybrid', country:'Guinée-Conakry', place:{fr:'Conakry Youth Hub, Conakry',en:'Conakry Youth Hub, Conakry'}, capacity:120, img:'assets/photos/Fishing.jpg',
       title:{fr:'Clôture de la cohorte 1 et présentation des projets',en:'Cohort 1 closing and project showcase'},
       excerpt:{fr:"Présentation des projets de la première cohorte et bilan de l'incubation.",en:'Presentation of the first cohort projects and incubation review.'}},
      {id:'forum-finance-verte', pub:'published', date:'2026-10-06', author:'Saïfi Dawalbet Hamit',
       format:{fr:'Présentiel',en:'In person'}, fmtCode:'presentiel', country:'Sierra Leone', place:{fr:'Freetown Climate Hub, Freetown',en:'Freetown Climate Hub, Freetown'}, capacity:150, img:'assets/photos/Agriculture.jpg',
       title:{fr:'Forum finance verte et impact investing',en:'Green finance and impact investing forum'},
       excerpt:{fr:'Rencontres entre entrepreneurs, investisseurs et partenaires techniques et financiers.',en:'Encounters between entrepreneurs, investors and technical and financial partners.'}}
    ],
    /* People directories. NB: unlike calls/news/events (which carry {fr,en}),
       these mirror the legacy directory shape — proper nouns stay plain, while
       sector/status/expertise are CODES or FR label strings translated by each
       page's cf-i18n tree-walker. Back-end devs: a record maps 1:1 to a row in
       /entrepreneurs or /mentors; promote the FR label strings to {fr,en} when you
       own the data. Stable slug id on every person; detail pages route by ?id=. */
    entrepreneurs:[
      {id:'aminata-diallo', pub:'published', n:'Aminata Diallo', s:'Dakar Solar Solutions', sec:'energie', pays:'Sénégal', st:'Candidature soumise', av:'DS',
       desc:{fr:"Mini-réseaux solaires pour les villages de pêcheurs de la Petite Côte, là où le réseau national n'arrive pas : une énergie propre, fiable et locale.",en:'Solar mini-grids for the fishing villages of the Petite Côte, where the national grid does not reach : clean, reliable, local energy.'}},
      {id:'mohamed-bangura', pub:'published', n:'Mohamed Bangura', s:'Compost côtier', sec:'recyclage', pays:'Sierra Leone', st:'Candidature soumise', av:'CC',
       desc:{fr:"Collecte et valorisation des déchets organiques du littoral de Freetown en compost pour les maraîchers urbains.",en:"Collecting and turning Freetown's coastal organic waste into compost for urban market gardeners."}},
      {id:'kofi-mensah', pub:'published', n:'Kofi Mensah', s:'ReCycle Accra', sec:'recyclage', pays:'Ghana', st:'Inscrit', av:'RA',
       desc:{fr:"Filière de collecte des plastiques côtiers d'Accra, transformés en matériaux de construction par des coopératives de jeunes.",en:"A collection chain for Accra's coastal plastics, turned into building materials by youth cooperatives."}},
      {id:'james-tuah', pub:'published', n:'James Tuah', s:'Mangrove Restore Initiative', sec:'mangroves', pays:'Liberia', st:'Candidature soumise', av:'MR',
       desc:{fr:"Restauration des mangroves de la côte de Mesurado avec les communautés riveraines, pour protéger le littoral et la pêche.",en:'Restoring the mangroves of the Mesurado coast with riverside communities, to protect the shoreline and fisheries.'}},
      {id:'mariama-balde', pub:'published', n:'Mariama Baldé', s:'Pêche bleue Conakry', sec:'entreprise', pays:'Guinée-Conakry', st:'Inscrit', av:'PB',
       desc:{fr:"Chaîne du froid solaire pour les femmes transformatrices de poisson de Conakry, réduisant les pertes après capture.",en:"A solar cold chain for Conakry's women fish processors, cutting post-catch losses."}},
      {id:'fatou-sarr', pub:'published', n:'Fatou Sarr', s:'Téranga Agro', sec:'agriculture', pays:'Sénégal', st:'Candidature soumise', av:'TA',
       desc:{fr:"Agriculture maraîchère climato-résiliente sur la Petite Côte, avec irrigation économe et semences adaptées au sel.",en:'Climate-resilient market gardening on the Petite Côte, with water-saving irrigation and salt-tolerant seeds.'}},
      {id:'ibrahim-koroma', pub:'published', n:'Ibrahim Koroma', s:'AgriRésilience Freetown', sec:'agriculture', pays:'Sierra Leone', st:'Inscrit', av:'AF',
       desc:{fr:"Parcelles pilotes d'agriculture résiliente autour de Freetown, formant de jeunes agriculteurs aux pratiques agroécologiques.",en:'Pilot plots of resilient farming around Freetown, training young farmers in agroecological practices.'}},
      {id:'ama-owusu', pub:'published', n:'Ama Owusu', s:'Plastic to Build', sec:'recyclage', pays:'Ghana', st:'Candidature soumise', av:'PB',
       desc:{fr:"Transformation des déchets plastiques côtiers en briques et mobilier urbain pour les communautés d'Accra.",en:"Turning coastal plastic waste into bricks and street furniture for Accra's communities."}},
      {id:'sekou-camara', pub:'published', n:'Sékou Camara', s:'Solaire Conakry', sec:'energie', pays:'Guinée-Conakry', st:'Inscrit', av:'SC',
       desc:{fr:"Kits solaires domestiques en location-vente pour les quartiers non raccordés de Conakry.",en:"Home solar kits on lease-to-own for Conakry's off-grid neighbourhoods."}},
      {id:'grace-johnson', pub:'published', n:'Grace Johnson', s:'Monrovia Eco Roots', sec:'mangroves', pays:'Liberia', st:'Candidature soumise', av:'ME',
       desc:{fr:"Pépinières communautaires de palétuviers et sensibilisation à la protection du littoral à Monrovia.",en:'Community mangrove nurseries and coastal-protection outreach in Monrovia.'}},
      {id:'awa-ndoye', pub:'published', n:'Awa Ndoye', s:'Sahel Clean Energy', sec:'energie', pays:'Sénégal', st:'Inscrit', av:'SE',
       desc:{fr:"Solutions d'accès à l'énergie propre pour les zones rurales du nord du Sénégal, portées par de jeunes techniciennes.",en:'Clean-energy access solutions for rural northern Senegal, led by young women technicians.'}},
      {id:'joseph-kamara', pub:'published', n:'Joseph Kamara', s:'Blue Coast SL', sec:'entreprise', pays:'Sierra Leone', st:'Candidature soumise', av:'BC',
       desc:{fr:"Économie bleue durable à Freetown : tourisme côtier responsable et valorisation des ressources marines.",en:'Sustainable blue economy in Freetown : responsible coastal tourism and marine-resource value.'}}
    ],
    mentors:[
      {id:'dr-kwame-asante', pub:'published', n:'Dr Kwame Asante', org:'Green Economy Institute, Accra', pays:'Ghana', av:'KA', dispo:true, cat:['finance'], exp:['Finance verte','Impact investing']},
      {id:'aisha-bangura', pub:'published', n:'Aïsha Bangura', org:'Climate Adaptation Lab, Freetown', pays:'Sierra Leone', av:'AB', dispo:true, cat:['agriculture'], exp:['Agriculture','Résilience climatique']},
      {id:'mariama-balde', pub:'published', n:'Mariama Baldé', org:'Blue Economy Network, Conakry', pays:'Guinée-Conakry', av:'MB', dispo:false, cat:['bleue'], exp:['Pêche durable','Mangroves']},
      {id:'dr-sophie-mendy', pub:'published', n:'Dr Sophie Mendy', org:'Énergie & Développement, Dakar', pays:'Sénégal', av:'SM', dispo:true, cat:['energie','finance'], exp:['Énergie renouvelable','Financement de projet']},
      {id:'john-weah', pub:'published', n:'John Weah', org:'Coastal Resilience Liberia, Monrovia', pays:'Liberia', av:'JW', dispo:true, cat:['bleue'], exp:['Restauration côtière','Mangroves']},
      {id:'akosua-boateng', pub:'published', n:'Akosua Boateng', org:'Circular Ghana, Accra', pays:'Ghana', av:'AK', dispo:false, cat:['circulaire'], exp:['Économie circulaire','Gestion des déchets']},
      {id:'ousmane-fall', pub:'published', n:'Ousmane Fall', org:'Impact Capital West Africa, Dakar', pays:'Sénégal', av:'OF', dispo:true, cat:['finance'], exp:['Finance verte','Levée de fonds']},
      {id:'fatima-sesay', pub:'published', n:'Fatima Sesay', org:'AgriTech Sierra Leone, Freetown', pays:'Sierra Leone', av:'FS', dispo:true, cat:['agriculture'], exp:['Agriculture','Technologie agricole']}
    ],

    /* ===== back-office collections (admin writes, members + public read) ===== */
    /* Applications : written by candidature.html / completer-dossier.html on submit,
       read + decided in admin-candidatures, reflected in mes-candidatures / suivi-candidature.
       Canonical statuses : submitted | review | incomplete | accepted | rejected.
       (Labelling stays a PROJECT status, never an application status.) Launch reality :
       cohort 1 registration is open, so a handful are in review, none accepted yet. */
    applications:[
      {id:'app-aminata-diallo', status:'review', appelId:'cohorte-2', submittedAt:'2026-06-05', assignee:'Saïfi Dawalbet Hamit',
       candidat:{nom:'Aminata Diallo', email:'aminata.diallo@example.sn', genre:'Femme', pays:'Sénégal', ville:'Dakar'},
       projet:{nom:'Dakar Solar Solutions', stade:'Amorçage', secteur:'energie', description:"Mini-réseaux solaires pour les ateliers de transformation et les chambres froides des communautés de pêche de la Petite Côte."},
       motivation:"Je veux donner aux communautés de pêche un accès fiable à l'énergie propre pour conserver leurs produits et créer des emplois techniques locaux. Le programme m'apporterait le réseau de mentors et l'accès aux financements qui manquent aujourd'hui pour passer du pilote au déploiement.",
       besoins:"Mentorat en finance verte, accès aux appels à candidatures, mise en relation avec des fournisseurs d'équipement.",
       pieces:[{name:'presentation-dakar-solar.pdf',type:'pdf',size:1840000},{name:'piece-identite.jpg',type:'jpg',size:420000}],
       complements:[],
       history:[{at:'2026-06-05', by:'Aminata Diallo', action:'submitted', note:''},{at:'2026-06-06', by:'Saïfi Dawalbet Hamit', action:'review', note:"Dossier complet, en cours d'évaluation par le comité."}]},
      {id:'app-mohamed-bangura', status:'submitted', appelId:'cohorte-2', submittedAt:'2026-06-06', assignee:'',
       candidat:{nom:'Mohamed Bangura', email:'mohamed.bangura@example.sl', genre:'Homme', pays:'Sierra Leone', ville:'Freetown'},
       projet:{nom:'Compost côtier', stade:'Idéation', secteur:'recyclage', description:"Collecte et compostage des déchets organiques des marchés côtiers de Freetown pour produire un amendement agricole local."},
       motivation:"Les déchets organiques s'accumulent sur le littoral alors qu'ils pourraient nourrir les sols agricoles. Je souhaite structurer une filière de compostage portée par les jeunes des quartiers côtiers, avec un modèle économique viable et un impact environnemental mesurable.",
       besoins:"Accompagnement pour structurer le modèle économique et identifier les premiers débouchés agricoles.",
       pieces:[{name:'note-projet-compost.pdf',type:'pdf',size:920000},{name:'cni-mb.png',type:'png',size:380000}],
       complements:[],
       history:[{at:'2026-06-06', by:'Mohamed Bangura', action:'submitted', note:''}]},
      {id:'app-fatou-sarr', status:'incomplete', appelId:'cohorte-2', submittedAt:'2026-06-04', assignee:'Aminata Sow',
       candidat:{nom:'Fatou Sarr', email:'fatou.sarr@example.sn', genre:'Femme', pays:'Sénégal', ville:'Saint-Louis'},
       projet:{nom:'Téranga Agro', stade:'Amorçage', secteur:'agriculture', description:"Parcelles maraîchères climato-résilientes et circuits courts pour les marchés de Saint-Louis."},
       motivation:"Face à la salinisation des terres du delta, je teste des cultures adaptées et des circuits courts pour sécuriser les revenus des jeunes agricultrices. Je cherche un accompagnement technique et un accès au réseau de mentors agricoles du programme.",
       besoins:"Appui agronomique sur les variétés résistantes à la salinité, mise en relation avec un mentor agriculture.",
       pieces:[{name:'presentation-teranga.pdf',type:'pdf',size:1240000}],
       complements:[],
       history:[{at:'2026-06-04', by:'Fatou Sarr', action:'submitted', note:''},{at:'2026-06-05', by:'Aminata Sow', action:'incomplete', note:"Pièce d'identité manquante : merci de compléter le dossier."}]},
      {id:'app-james-tuah', status:'submitted', appelId:'mangroves', submittedAt:'2026-06-07', assignee:'',
       candidat:{nom:'James Tuah', email:'james.tuah@example.lr', genre:'Homme', pays:'Liberia', ville:'Monrovia'},
       projet:{nom:'Mangrove Restore Initiative', stade:'Idéation', secteur:'mangroves', description:"Restauration des mangroves dégradées du littoral de Mesurado avec les jeunes volontaires des quartiers côtiers."},
       motivation:"Les mangroves protègent nos maisons de l'érosion et abritent les nurseries de poissons dont vivent nos familles. Je veux mobiliser les jeunes de Monrovia autour de leur restauration et en faire une source de revenus durables.",
       besoins:"Financement de semis, formation aux techniques de plantation, suivi des surfaces restaurées.",
       pieces:[{name:'projet-mangrove.pdf',type:'pdf',size:1050000},{name:'piece-identite-jt.jpg',type:'jpg',size:410000}],
       complements:[],
       history:[{at:'2026-06-07', by:'James Tuah', action:'submitted', note:''}]}
    ],

    /* Moderation queue : items reported across the platform. {kind, refId} points
       back to the real object in its own collection so the drawer can render it. */
    moderation_queue:[
      {id:'mod-1', kind:'profile', refId:'joseph-kamara', reason:{fr:'Coordonnées professionnelles à vérifier',en:'Professional details to verify'}, reportedBy:'Kofi Mensah', at:'2026-06-07T09:12:00', resolved:false},
      {id:'mod-3', kind:'profile', refId:'dr-sophie-mendy', reason:{fr:'Profil mentor à valider avant publication',en:'Mentor profile to validate before publication'}, reportedBy:'Système', at:'2026-06-07T11:30:00', resolved:false},
      {id:'mod-4', kind:'news', refId:'accra-dechets', reason:{fr:'Commentaire signalé sous cet article',en:'Reported comment under this article'}, reportedBy:'2 utilisateurs', at:'2026-06-06T14:05:00', resolved:false},
      {id:'mod-2', kind:'message', refId:'', reason:{fr:'Message signalé : sollicitation hors programme',en:'Reported message: off-programme solicitation'}, reportedBy:'Dr Kwame Asante', at:'2026-06-06T16:40:00', resolved:false}
    ],

    /* Messaging : threads + messages shared by members and the admin console.
       cf-messages.js reads these on top of its seeds (same override pattern as news). */
    threads:[
      {id:'th-aminata-diallo', subject:{fr:'Étapes après acceptation',en:'Steps after acceptance'}, with:'Aminata Diallo', withEmail:'aminata.diallo@example.sn', closed:false,
       participants:[{id:'team',role:'team',name:'Équipe Coastal Futures',verified:true},{id:'aminata-diallo',role:'entrepreneur',name:'Aminata Diallo'}]},
      {id:'th-mohamed-bangura', subject:{fr:'Pièces du dossier',en:'Application documents'}, with:'Mohamed Bangura', withEmail:'mohamed.bangura@example.sl', closed:false,
       participants:[{id:'team',role:'team',name:'Équipe Coastal Futures',verified:true},{id:'mohamed-bangura',role:'entrepreneur',name:'Mohamed Bangura'}]}
    ],
    messages:[
      {id:'m-a1', threadId:'th-aminata-diallo', from:{name:'Aminata Diallo',role:'entrepreneur',verified:false}, at:'2026-06-07T08:10:00', body:"Bonjour, quelles sont les prochaines étapes une fois ma candidature acceptée ?", read:false},
      {id:'m-m1', threadId:'th-mohamed-bangura', from:{name:'Mohamed Bangura',role:'entrepreneur',verified:false}, at:'2026-06-06T15:30:00', body:"Bonjour, pourriez-vous confirmer que mon dossier est complet ? Merci.", read:false}
    ],

    /* Media library : real CRUD target for admin-mediatheque + the editor image picker. */
    media:[
      {id:'m-launch-stage', name:'launch-stage-panel.webp', kind:'photo', collection:'evenements', pays:['Sénégal'], size:184000, addedBy:'Saïfi Dawalbet Hamit', addedAt:'2026-06-02', src:'assets/media/01-events/launch-stage-panel.webp', alt:{fr:"Répétition de la table ronde des jeunes innovateurs avant le lancement à Dakar.",en:'Rehearsal of the young innovators panel before the Dakar launch.'}},
      {id:'m-mangrove-hero', name:'mangrove-restoration-hero.webp', kind:'photo', collection:'mangroves', pays:['Liberia'], size:212000, addedBy:'James Tuah', addedAt:'2026-05-28', src:'assets/media/02-mangroves/mangrove-restoration-hero.webp', alt:{fr:"Premiers semis de palétuviers le long du littoral de Mesurado.",en:'First mangrove seedlings along the Mesurado coast.'}},
      {id:'m-solar-hero', name:'solar-minigrid-hero.webp', kind:'photo', collection:'energie', pays:['Sénégal'], size:198000, addedBy:'Équipe programme', addedAt:'2026-05-14', src:'assets/media/03-solar/solar-minigrid-hero.webp', alt:{fr:"Mini-réseau solaire porté par les jeunes sur la Petite Côte.",en:'Youth-led solar mini-grid on the Petite Côte.'}},
      {id:'m-recycling-accra', name:'recycling-waste-collection-accra.webp', kind:'photo', collection:'circulaire', pays:['Ghana'], size:176000, addedBy:'Fatou Sarr', addedAt:'2026-05-21', src:'assets/media/04-projects/recycling-waste-collection-accra.webp', alt:{fr:"Jeunes collecteurs triant les plastiques récupérés sur le littoral d'Accra.",en:'Young collectors sorting plastics recovered from the Accra coast.'}}
    ],

    /* Member accounts (entrepreneurs + mentors). status read by member-space guards. */
    users:[
      {id:'aminata-diallo', name:'Aminata Diallo', email:'aminata.diallo@example.sn', role:'entrepreneur', pays:'Sénégal', status:'active', joinedAt:'2026-06-03'},
      {id:'mohamed-bangura', name:'Mohamed Bangura', email:'mohamed.bangura@example.sl', role:'entrepreneur', pays:'Sierra Leone', status:'active', joinedAt:'2026-06-06'},
      {id:'kofi-mensah-ent', name:'Kofi Mensah', email:'kofi.mensah@example.gh', role:'entrepreneur', pays:'Ghana', status:'active', joinedAt:'2026-06-04'},
      {id:'dr-kwame-asante', name:'Dr Kwame Asante', email:'kwame.asante@example.gh', role:'mentor', pays:'Ghana', status:'active', joinedAt:'2026-06-02'},
      {id:'dr-sophie-mendy', name:'Dr Sophie Mendy', email:'sophie.mendy@example.sn', role:'mentor', pays:'Sénégal', status:'active', joinedAt:'2026-06-02'},
      {id:'joseph-kamara', name:'Joseph Kamara', email:'joseph.kamara@example.sl', role:'entrepreneur', pays:'Sierra Leone', status:'active', joinedAt:'2026-06-05'}
    ],

    /* Admin account lifecycle : single-use invitations (invitation-admin.html). */
    admin_invites:[],

    /* Admin notifications : pushed by event producers, read by the topbar bell. */
    admin_notifs:[
      {id:'n-app-mb', at:'2026-06-06T08:30:00', kind:'application', target:{role:'super'}, title:{fr:'Nouvelle candidature : Compost côtier (Mohamed Bangura)',en:'New application: Compost côtier (Mohamed Bangura)'}, href:'admin-candidatures.html', read:false},
      {id:'n-app-jt', at:'2026-06-07T10:05:00', kind:'application', target:{role:'super'}, title:{fr:'Nouvelle candidature : Mangrove Restore Initiative (James Tuah)',en:'New application: Mangrove Restore Initiative (James Tuah)'}, href:'admin-candidatures.html', read:false},
      {id:'n-mod-1', at:'2026-06-07T09:12:00', kind:'moderation', target:{role:'moderator'}, title:{fr:'Profil signalé à vérifier',en:'Reported profile to review'}, href:'admin-moderation.html', read:false}
    ],

    /* Append-only audit trail : every state-changing action writes here (cf-audit.js). */
    audit_log:[],

    /* ===== Newsletter (audit livraison 14, partie A) =====
       subscribers : written by the public newsletter form (index footer) on submit.
       Double opt-in : a new record is 'pending' until the confirmation link is
       opened (newsletter.html?confirm=token), then 'confirmed'. One-click
       unsubscribe flips it to 'unsubscribed' (newsletter.html?unsub=token).
       Back-end devs : the confirmation + send e-mails are executed server-side
       (transactional e-mail); the mock only records state + simulates the message.
       campaigns : composed + scheduled/sent from admin-newsletter.html. */
    subscribers:[
      {id:'sub-seed-1', email:'awa.diop@example.sn', lang:'fr', status:'confirmed', consent:true, token:'tok-seed-1', createdAt:'2026-06-03', confirmedAt:'2026-06-03'},
      {id:'sub-seed-2', email:'k.mensah@example.gh', lang:'en', status:'confirmed', consent:true, token:'tok-seed-2', createdAt:'2026-06-05', confirmedAt:'2026-06-06'},
      {id:'sub-seed-3', email:'fatou.bah@example.gn', lang:'fr', status:'pending', consent:true, token:'tok-seed-3', createdAt:'2026-06-08'}
    ],
    campaigns:[
      {id:'camp-seed-1', status:'sent', createdAt:'2026-06-02', sentAt:'2026-06-02', recipients:2,
       subject:{fr:'Coastal Futures se lance le 10 juin à Dakar',en:'Coastal Futures launches on 10 June in Dakar'},
       body:{fr:"La cérémonie de lancement réunira les cinq pays côtiers, la CEDEAO et la Commission de l'Union Africaine sous l'égide de la Journée mondiale de l'environnement. Les inscriptions de la cohorte 1 sont ouvertes.",en:'The launch ceremony will gather the five coastal countries, ECOWAS and the African Union Commission under World Environment Day. Cohort 1 registration is open.'}}
    ],

    /* Settings singleton : edited in admin-parametres, read where relevant. */
    settings:[{ id:'settings',
      tagline:{fr:"Un programme de l'Institut Africain de la Gouvernance.",en:'A programme of the Africa Governance Institute.'},
      email:'contact@africagovernanceinstitute.org',
      reviewSlaDays:14,
      cookies:{ aud:false, perso:false,
        bannerFr:"Nous utilisons des cookies strictement nécessaires au fonctionnement du site. Les mesures d'audience et de personnalisation ne sont activées qu'avec votre accord.",
        bannerEn:'We use cookies that are strictly necessary for the site to work. Audience measurement and personalisation are enabled only with your consent.' },
      notif:{ sender:'Coastal Futures Network', replyTo:'contact@africagovernanceinstitute.org', autoReply:true }
    }],

    /* ===== Page CMS (audit v11) =====
       The site is no longer a hard-coded shell : its editorial content is data.
       Each entry is a PAGE. A page owns an ordered list of typed BLOCKS, every
       text field carries {fr,en} so a translation is never lost. cf-pages.js
       hydrates any element marked data-block="pageId.blockId[.field]"; admin-
       editeur-page.html edits a page block by block (bilingual, merge, history),
       and admin-site.html lists every page with an edit entry.
         kind  : 'shared' (content reused on many pages) | 'page' (one URL)
         managed : true once the page is wired to the CMS (editable here) ;
                   false = still hard-coded, listed in the overview, to migrate.
         blocks[].type : banner | section | hero | stats | faq | cta | legal
       A shared block is edited ONCE and propagates everywhere it is referenced
       (the transparency banner is the first : one source, every annuaire in sync). */
    pages:[
      { id:'shared', kind:'shared', pub:'published', managed:true,
        title:{fr:'Contenus partagés',en:'Shared content'},
        note:{fr:"Blocs réutilisés sur plusieurs pages. Édités une fois, à jour partout.",en:'Blocks reused across several pages. Edited once, up to date everywhere.'},
        blocks:[
          { bid:'prelaunch', type:'banner',
            label:{fr:'Bandeau de transparence',en:'Transparency banner'},
            used:{fr:'Annuaire entrepreneurs, annuaire mentors',en:'Entrepreneurs directory, mentors directory'},
            fields:{
              icon:'ti-info-circle',
              bodyFr:"Le programme vient de se lancer (10 juin 2026). Ces inscriptions ouvrent la cohorte 1 : le tableau de bord des partenaires affiche les résultats consolidés, à zéro tant que la collecte n'a pas commencé.",
              bodyEn:'The programme has just launched (10 June 2026). These registrations open cohort 1 : the partner dashboard shows the consolidated results, at zero until data collection begins.',
              linkLabelFr:'Définitions des indicateurs', linkLabelEn:'Indicator definitions',
              linkHref:'methodologie-indicateurs.html'
            } }
        ], history:[] },

      /* Public pages registered for the site overview. Those already wired to the
         CMS carry managed:true + their blocks; the rest are listed honestly as
         "to migrate" so the admin sees the whole site, not only what is editable. */
      { id:'index', kind:'page', pub:'published', managed:false, path:'index.html',
        title:{fr:'Accueil',en:'Home'}, blocks:[], history:[] },
      { id:'a-propos', kind:'page', pub:'published', managed:false, path:'a-propos.html',
        title:{fr:'À propos',en:'About'}, blocks:[], history:[] },
      { id:'ecosysteme', kind:'page', pub:'published', managed:false, path:'ecosysteme.html',
        title:{fr:'Écosystème',en:'Ecosystem'}, blocks:[], history:[] },
      { id:'carte-impact', kind:'page', pub:'published', managed:false, path:'carte-impact.html',
        title:{fr:"Carte d'impact",en:'Impact map'}, blocks:[], history:[] },
      { id:'methodologie-indicateurs', kind:'page', pub:'published', managed:false, path:'methodologie-indicateurs.html',
        title:{fr:'Méthodologie des indicateurs',en:'Indicator methodology'}, blocks:[], history:[] },
      { id:'contact', kind:'page', pub:'published', managed:false, path:'contact.html',
        title:{fr:'Contact',en:'Contact'}, blocks:[], history:[] },
      { id:'mentions-legales', kind:'page', pub:'published', managed:false, path:'mentions-legales.html',
        title:{fr:'Mentions légales',en:'Legal notice'}, blocks:[], history:[] },
      { id:'confidentialite', kind:'page', pub:'published', managed:false, path:'confidentialite.html',
        title:{fr:'Confidentialité',en:'Privacy'}, blocks:[], history:[] },
      { id:'cgu', kind:'page', pub:'published', managed:false, path:'cgu.html',
        title:{fr:"Conditions d'utilisation",en:'Terms of use'}, blocks:[], history:[] },
      { id:'declaration-accessibilite', kind:'page', pub:'published', managed:false, path:'declaration-accessibilite.html',
        title:{fr:"Déclaration d'accessibilité",en:'Accessibility statement'}, blocks:[], history:[] }
    ]
  };

  function deep(o){ return JSON.parse(JSON.stringify(o)); }
  function key(name){ return PREFIX+name; }
  function load(name){
    try{ var s=localStorage.getItem(key(name)); if(s){ var a=JSON.parse(s); if(Array.isArray(a)) return a; } }catch(e){}
    return SEED[name]?deep(SEED[name]):[];
  }
  var errCb=null;
  function save(name,arr){ try{ localStorage.setItem(key(name),JSON.stringify(arr)); return true; }catch(e){ try{ if(errCb) errCb((e&&e.name==='QuotaExceededError')?'quota':'write',name,e); }catch(_){} return false; } }

  window.CFCol={
    SEED:SEED,
    /* register a persistence-failure handler (quota / write). Screens show a toast. */
    onError:function(cb){ errCb=cb; },
    /* full list (admin view) */
    all:function(name){ return load(name); },
    /* public-facing list : only published items */
    published:function(name){ return load(name).filter(function(x){ return (x.pub||'published')==='published'; }); },
    get:function(name,id){ var a=load(name); for(var i=0;i<a.length;i++){ if(a[i].id===id) return a[i]; } return null; },
    /* count helper for badges / counters */
    count:function(name,pred){ var a=load(name); return pred?a.filter(pred).length:a.length; },
    /* NON-DESTRUCTIVE upsert : shallow-merge over the existing record so an editor
       that omits a field never wipes it (audit #20). New records are prepended. */
    upsert:function(name,obj){ var a=load(name); var f=false,out=obj; for(var i=0;i<a.length;i++){ if(a[i].id===obj.id){ out=a[i]=Object.assign({},a[i],obj); f=true; break; } } if(!f) a.unshift(obj); save(name,a); return out; },
    /* partial patch by id (status changes, decisions, assignment) */
    patch:function(name,id,partial){ var a=load(name); for(var i=0;i<a.length;i++){ if(a[i].id===id){ a[i]=Object.assign({},a[i],partial); save(name,a); return a[i]; } } return null; },
    /* append a record without merge (audit_log, messages, notifs are append-only) */
    push:function(name,obj){ var a=load(name); a.unshift(obj); save(name,a); return obj; },
    /* singleton collections (settings) : one object, stored as a 1-element array */
    single:function(name){ var a=load(name); return a[0]||(SEED[name]?deep(SEED[name])[0]:null); },
    saveSingle:function(name,obj){ return save(name,[obj]); },
    remove:function(name,id){ var a=load(name).filter(function(x){ return x.id!==id; }); save(name,a); return a; },
    set:function(name,arr){ save(name,arr); return arr; },
    reset:function(name){ try{ localStorage.removeItem(key(name)); }catch(e){} return load(name); },
    resetAll:function(){ Object.keys(SEED).forEach(function(n){ try{ localStorage.removeItem(key(n)); }catch(e){} }); },
    /* true once the admin has saved this collection (so public pages can leave the
       static seed markup untouched until then, exactly like cf-site.js) */
    overridden:function(name){ try{ return localStorage.getItem(key(name))!=null; }catch(e){ return false; } },
    /* pick the right language out of a {fr,en} field (or a plain string) */
    t:function(field,lang){ if(field==null) return ''; if(typeof field==='string') return field; return (lang==='en'&&field.en)?field.en:(field.fr||field.en||''); },
    lang:function(){ return document.documentElement.lang==='en'?'en':'fr'; },
    /* slug helper for ids */
    slug:function(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||('item-'+Date.now()); }
  };
})();
