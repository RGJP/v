/* Kirtan Songbook — every chant lives here.
   To add one, copy a block and edit it. Fields:
     title   shown as-is; a trailing "(...)" becomes the subtitle
     audio   file in this folder (optional)
     chords  plain text, kept exactly as typed (monospace)
     lyrics  one string per line
     meaning optional translation / explanation
     note    optional remark shown above the chords
     image   optional chart image */
window.SONGS = [
{
  title: "Jai Shiva Shankara",
  audio: "jaishivashankara.mp3",
  chords: `Dm   Bb   C    Dm`,
  lyrics: [
    "Om Namo, Om Namo, Namah Shivaya",
    "Om Namo, Om Namo, Namo Namo",
    "Jai Shiva Shankara, Namami Shankara",
    "Jai Shiva Shankara, Namo Namo",
    "Hara Hara Mahadeva, Jai Shiva Shambho",
    "Hara Hara Mahadeva, Jai Shiva Shambho",
  ],
},
{
  title: "Hari Om Shivay",
  audio: "omshivay.mp3",
  chords: `C    G    F    C
C    C    G    C`,
  lyrics: [
    "Om Shivay Hari Om Shivay",
    "Om Shivay Hari Om Shivay",
    "Om Shivay Hari Om Shivay",
    "Hari Om Shivay Hari Om Shivay",
  ],
},
{
  title: "Parameshwara",
  audio: "shankarakaruna.mp3",
  chords: `Am   G    F    Am
Am   C    G    Am`,
  lyrics: [
    "Shankara, Karunakara, Jagadeeshwara, Parameshwara",
    "Shankara, Karunakara, Jagadeeshwara, Parameshwara",
  ],
},
{
  title: "Om Namah Shivaya",
  audio: "omnamahshivayakd.mp3",
  chords: `Bm   G    A    Bm
D    A    G    Bm`,
  lyrics: [
    "Om Namah Shivaya, Om Namah Shivaya",
    "Shivaya Namaha, Shivaya Namah Om",
    "Shambho Shankara Namah Shivaya",
    "Girijaa Shankara Namah Shivaya",
    "Arunachala Shiva Namah Shivaya",
    "Om Namah Shivaya, Om Namah Shivaya",
    "Namah Shivaya Om",
    "Arunachala Shiva",
    "Om Namah Shivaya, Om Namah Shivaya",
  ],
},
{
  title: "Shivoham",
  audio: "sachara.mp3",
  chords: `Dm   C    Bb   C    Dm`,
  lyrics: [
    "Sachara Chara Para Purna, Shivoham Shivoham",
    "Nityananda Svarupa, Shivoham Shivoham",
    "Anandoham, Anandoham",
    "Anandoham, Anandoham",
    "Om Namah Shivay",
  ],
},
{
  title: "Om Namah Shivaya II",
  audio: "namahshivayakd.mp3",
  chords: `Bm   A
D    A    G    D    A`,
  lyrics: [
    "Om Namah Shivaya",
    "Om Namah Shivaya",
  ],
},
{
  title: "Om Namah Shivaya III",
  audio: "omnamahshivayamooji.mp3",
  chords: `A    A    D    E
A    D    E`,
  lyrics: [
    "Om Namah Shivaya, Om Namah Shivaya, Om Namah Shivaya",
    "Shiva Om Namah",
  ],
},
{
  title: "Shiva Shambho",
  audio: "classicshiva.mp3",
  chords: `Classic version is just : Dm   C (or Dm   F   C)
but there is an interesting variation using Bb which gives it more colour: 
Dm   C
Bb   F    Gm   Dm
and finally a reggae style rythm can be played with good results.`,
  lyrics: [
    "Jai Jai Shiva Shambho, Jai Shiva Shambho",
    "Mahadeva Shambho, Mahadeva Shambho",
    "Shiva Shiva Shiva Shambho, Shiva Shiva Shiva Shambho",
    "Mahadeva Shambho, Mahadeva Shambho",
  ],
},
{
  title: "Shiva Shambho II",
  audio: "shivashambhodn.mp3",
  chords: `D    Em
D    Em   G    D
Em   G    D`,
  lyrics: [
    "Shiva Shiva Shiva Shambho, Mahadeva Shambho",
    "Mahadeva Shambho, Mahadeva Shambho",
    "Bom Bom Hara Hara Mahadeva",
    "Bom Bom Bolo Bolo Namah Shivaya",
    "Namah Shivaya, Namah Shivaya",
  ],
},
{
  title: "Amritam",
  audio: "amritam.mp3",
  chords: `A    D    F#m    
Bm    E    A
Bm    E    C#m    D`,
  lyrics: [
    "Tryambakam Yajamahe Sugandhim Pushti-vardanam",
    "Urvarukam-iva Bandhanan Mrityor Mukshiya Ma Mritate",
    "Om Namah Shivaya",
  ],
},
{
  title: "Jai Ganesha",
  audio: "jaiganeshadn.mp3",
  chords: `C#m   A    B    C#m
F#m   B    C#m
A    B    C#m`,
  lyrics: [
    "Jai Ganesha, Jai Ganesha, Jai Ganesha Pahimam",
    "Sri Ganesha, Sri Ganesha, Sri Ganesha Rakshamam",
    "Gam Ganapataye Namo Namah",
    "Gam Ganapataye Namo Namah",
  ],
},
{
  title: "Ganapati Om",
  audio: "ganapatiom.mp3",
  chords: `*Played here with Capo 2 (in D/Bm) or as you prefer.
F    G    Am   F
Am   F    C    G or original progression is : Am   Dm   F    G`,
  lyrics: [
    "Om Ganesha, Om Ganapati, Om",
    "Ganapati Om, Ganapati Om, Ganapati Om, Ganapati Om",
  ],
},
{
  title: "Sharanam Ganesha",
  audio: "omhariom.mp3",
  chords: `*Played here with Capo 1 or as you prefer.
C    Am   Bb   F    C
Am     C
Bb     Am`,
  lyrics: [
    "Om Hari Om, Om Hari Om",
    "Sharanam Ganesha, Sharanam Ganesha",
    "Sharanam Ganesha, Sharanam Ganesha",
    "Om Gam Ganapataye Namah",
    "Om Gam Ganapataye Namah",
    "Ganesha",
    "Vakktratunda...Mahaakaaya",
    "Surya-Koti....Sama-Prabha",
    "Nir-Vighnam..Kurume Deva",
    "Sarva- Kaaryeshu...Sarvadaa",
  ],
},
{
  title: "Radhe Shyam",
  audio: "radheshyam.mp3",
  chords: `F#m    A     E     F#m
D    A    E    F#m`,
  lyrics: [
    "Radhe Radhe Shyam Bolo",
    "Radhe Radhe Shyam",
    "Radhe Radhe, Jai Sri Radhe",
    "Radhe Radhe, Jai Sri Radhe",
  ],
},
{
  title: "Radhe Shyam II",
  audio: "sriradhe.mp3",
  chords: `*Played here with Capo 1 or as you prefer.
Em  D  Em
G  D  Em`,
  lyrics: [
    "Sri Radhe Radhe Radhe Shyam, Govinda Radhe",
    "Govinda Radhe Radhe Shyam, Gopala Radhe Radhe Shyam",
  ],
},
{
  title: "Jai Radha Madhav",
  audio: "radhamadhava.mp3",
  chords: `Dm   F    C    Dm
D  C  F  C  Dm`,
  lyrics: [
    "Jai Radha Madhav, Jai Kunj Bihari",
    "Jai Gopi Jana Vallabha, jai giridhar hari",
    "Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare",
    "Hare Rama, Hare Rama, Rama Rama, Hare Hare",
  ],
},
{
  title: "Govinda Jai Jai",
  audio: "govindajaya.mp3",
  chords: `C    F    C    G
C    F    G`,
  lyrics: [
    "Govinda Jai Jai, Gopala Jai Jai",
    "Radha Ramana Hari Govinda Jai Jai",
    "Govinda Jai Jai, Gopala Jai Jai",
    "Radha Ramana Hari Om",
  ],
},
{
  title: "Hare Krishna",
  audio: "harekrishnakd.mp3",
  chords: `Am   C    F    C    G
Am     F    C    G`,
  lyrics: [
    "Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare",
    "Hare Rama, Hare Rama, Rama Rama, Hare Hare",
  ],
},
{
  title: "Hare Krishna II",
  audio: "harekrishnakd2.mp3",
  chords: `C    Am   F    G
C    G    F    C    G
C    F    G    C    F   G    C    F   G    Am    Am   F    G    C`,
  lyrics: [
    "Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare",
    "Hare Rama, Hare Rama, Rama Rama, Hare Hare",
  ],
},
{
  title: "Sri Krishna Govinda",
  audio: "srikrishnagovinda.mp3",
  chords: `C    G    F    C    G
F    C    F    Am    F    G`,
  lyrics: [
    "Sri Krishna Govinda Hare Murare,",
    "Hey Naatha Narayana Vasudeva",
    "Hey Naatha Narayana Vasudeva",
    "Hey Naatha Narayana Vasudeva",
    "Govinda Hare, Gopala Hare",
    "Hey Prabhu Deena Dayaala Hare",
  ],
},
{
  title: "Om Namo Bhagavate Vasudevaya",
  audio: "vasudevaya.mp3",
  chords: `F#m    D    E    F#m`,
  lyrics: [
    "Om Namo Bhagavate Vasudevaya,",
    "Om Namo Bhagavate Vasudevaya,",
    "Vasudevaya, Vasudevaya, Vasudevaya Om",
  ],
},
{
  title: "Om Namo Bhagavate Vasudevaya II",
  audio: "omnamoooo.mp3",
  chords: `A    E    A    E    D    A    E    B    E`,
  lyrics: [
    "Om Namo Bhagavate Vasudevaya",
  ],
},
{
  title: "Satya Narayana",
  audio: "narayanahariom.mp3",
  chords: `C    G    Am    F    C    G
C    Am    F    C    G`,
  lyrics: [
    "Narayana Hari Om, Satya Narayana Hari Om",
    "Govinda Krishna Hari Om, Gopala Krishna Hari Om",
  ],
},
{
  title: "Om Namo Narayana",
  audio: "hariomnamo.mp3",
  chords: `Dm    A    A    Bb    A`,
  lyrics: [
    "Hari Om Namo Narayana, Om Namo Narayana",
    "Hari Om Namo Narayana, Hari Om Namo Narayana",
  ],
},
{
  title: "Sita Ram",
  audio: "sitarammooji.mp3",
  chords: `Am    C    G    F
F    Am   C    G`,
  lyrics: [
    "Sita Ram Jai Jai Ram",
  ],
},
{
  title: "Sita Ram II",
  audio: "sitaramkd.mp3",
  chords: `A    D    A    E    A
E    D    E    A`,
  lyrics: [
    "Sita Ram, Sita Ram, Sita Ram Jai, Sita Ram",
  ],
},
{
  title: "Sri Ram II",
  audio: "omsriram.mp3",
  chords: `Capo 3 (Gm) 
Em    Am    D    G
Am    G
Am    C    G`,
  lyrics: [
    "Om Sri Ram Jai Ram Jai Jai Ram - Hari Om",
  ],
},
{
  title: "Sri Ram III",
  audio: "sitaramooji2.mp3",
  chords: `Bm    G    D    A`,
  lyrics: [
    "Om Sri Ram Jai Ram Jai Jai Ram",
    "Sita Ram",
  ],
},
{
  title: "Bhajelo-ji hanuman",
  audio: "bhajelojikd.mp3",
  chords: `C    G    F    F
F    G    Am/Em    F`,
  lyrics: [
    "Bhajelo ji hanuman, Bhajelo ji hanuman",
    "Sri Ram Jai Ram Jai Jai Ram",
    "Sri Ram Jai Ram Jai Jai Ram",
    "Sita Ram, Sita Ram",
    "Sita Ram, Sita Ram",
    "Hare Rama Rama Ram Sharanam Bhava Rama Ram",
  ],
},
{
  title: "Sri Ram (Heart as wide as the world)",
  audio: "heartaswide.mp3",
  chords: `F#m   C#m    F#m   C#m      A    E    B
F#m   C#m    F#m   C#m      A    E    B
D    A    E    F#m   D    A    E
D    A    E    F#m    A    E    B
Gamme : Fa# mineur`,
  lyrics: [
    "Holding me in your arms’ vast embrace",
    "Only love shining in endless space",
    "All I need is to be with you",
    "All my prayers have been heard",
    "All I want is to rest inside",
    "Your heart as wide as the world",
    "I looked away",
    "Your beauty too much to bear",
    "Where could I run?",
    "Your eyes,",
    "I found them everywhere",
    "All I want is to sing to you",
    "The song that no one has heard",
    "All my life has lead me to",
    "A heart as wide as the world",
    "Sri Ram Jai Ram Jai Jai Ram",
  ],
},
{
  title: "Ong Namo Gurudev Namo",
  audio: "gurudevnamo.mp3",
  chords: `Capo 3 :
A   F#m   Dmaj7 A
A    D    A    E`,
  lyrics: [
    "Ong Namo Gurudev Namo",
    "Gurudev Gurudev Namo, Gurudev Gurudev Namo",
  ],
  meaning: "The Adi Mantra Ong is \"Infinite Creative energy in manifestation and activity\". (\"Om\" or Aum is God absolute and unmanifested), Namo is \"reverent greetings' implying humility, Guru means \"teacher or wisdom\", Dev means \"Divine or of God\" and Namo reaffirms humility and reverence. In all it means, \"I call upon Divine Wisdom\".",
},
{
  title: "Adi Shakti",
  audio: "adishakti.mp3",
  chords: `A - G - Bm - C#m - D
E - Bm - F#m - E - Abm - A - E - Bm - F#m - E - E7`,
  lyrics: [
    "Adi Shakti, Adi Shakti, Adi Shakti, Namo Namo",
    "Sarab Shakti, Sarab Shakti, Sarab Shakti, Namo Namo",
    "Prithum Bhagawati, Prithum Bhagawati,",
    "Prithum Bhagawati, Namo Namo",
    "Kundalini Mata Shakti, Mata Shakti, Namo Namo",
  ],
  meaning: "The First Shakti Mantra tunes into the frequency of the Divine Mother, and to primal protective, generating energy. Chanting it eliminates fears and fulfils desires. Adi Shakti means the \"Primal Power,\" Sarab Shakti means \"All Power\", and Prithum Bhagawati means \"which creates through God.\"",
},
{
  title: "Har Har Ram Das Guru",
  audio: "ramdas.mp3",
  chords: `Am - D - Am
Em - Am
Am - D - Am
Am   D  Am
Am   Em   Am
Am   D  Am
...
F - G - Am
F   G   Am
F   Dm    E`,
  lyrics: [
    "Har Har Ram Das Guru Hai",
    "Ram Das Guru Hai, Har Har Ram Das Guru Hai",
    "Ram Das Guru Hai",
  ],
},
{
  title: "Om Namah Shivaya (Lila)",
  audio: "onslila.mp3",
  chords: `A - D
A - E - D`,
  lyrics: [
    "Om Namah Shivaya",
  ],
},
{
  title: "Soham Shivoham (Suryachandra)",
  audio: "soham.mp3",
  chords: `Bm - A - G - A - Bm
Em - Bm - Em - Bm - A`,
  lyrics: [
    "Soham Shivoham, Soham Shivoham",
    "Shivoham, Shivoham, Shivoham, Shivoham",
    "Namah Shivay",
  ],
},
{
  title: "Hare Krishna (lila)",
  audio: "harekrishnalila.mp3",
  chords: `D- A - Bm - G`,
  lyrics: [
    "Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare",
    "Hare Rama, Hare Rama, Rama Rama, Hare Hare",
  ],
},
{
  title: "Om Namo Bhagavate (Ambika)",
  audio: "ambika.mp3",
  chords: `Capo 1 : A C#m D E
F#m  A  D`,
  lyrics: [
    "Om Namo Bhagavate Vasudevaya",
  ],
},
{
  title: "Namo Narayani (maitraya)",
  audio: "namonarayani.mp3",
  chords: `Bm - G - A
D- Em - F#m -G`,
  lyrics: [
    "Namo Narayani Jai Ma",
    "Jai Ma, Jai Ma, Jai Ma, Jai Ma",
    "Om Aim Hreem Kleem (3x) Chamundaye Viche Namaha",
  ],
},
{
  title: "Ong Namo Gurudev Namo (Mirabai)",
  audio: "ongnamomira.mp3",
  chords: `Dm - Bb - C , Dm - C - Bb - Gm - F -Dm`,
  lyrics: [
    "Ong Namo Gurudev Namo",
    "Gurudev Namo, Gurudeva",
  ],
},
{
  title: "Radhe Shyam (kirtan soul revival)",
  audio: "radheksr.mp3",
  chords: `Capo 2
F#m  E  A  D  A E
F#m  E  A  D  E
D  A  Bm  AD  A  Bm E`,
  lyrics: [
    "Radhe Radhe Shyam, Govinda",
    "Radhe Radhe Shyam, Gopala",
  ],
},
{
  title: "Hare Krishna (kirtan soul revival)",
  audio: "harekrishnaksr.mp3",
  chords: `C - Am - G - C || F - G || C - Am - G - F ||`,
  lyrics: [
    "Hare Krishna Hare Krishna, Krishna Krishna Hare Hare",
    "Hare Rama Hare Rama, Rama Rama Hare Hare",
    "Hare Krishna......Hare Rama | Hare Krishna......Hare Rama",
    "Radhe, Radhe Govinda, Radhe Govinda, Radhe Gopala",
  ],
},
{
  title: "Jai Shiva Shankara (satyaa pari)",
  audio: "jaishivasp.mp3",
  chords: `Bm - A - E - D - A Bm || Bm - A - E - Bm`,
  lyrics: [
    "Jai Shiva Shankara, Jai Shiva Shankara",
    "Jai Shiva Shankarâ Hari Om",
    "He Shiva Shankara, Parameshwara",
    "He Shiva Shankara™ Hari Om -- Om Namah Shivaya",
  ],
},
{
  title: "Hari Hari Om Namo (satyaa pari)",
  audio: "harihariomnamo.mp3",
  chords: `C1 : Bm-F#m-A-G-A-Bm`,
  lyrics: [
    "Hari Hari Om Namo, Hari Hari Om Namo",
    "Hari Hari Om Namo, Hari Hari Hari",
  ],
},
{
  title: "Hare Krishna (satyaa pari)",
  audio: "harekrishnasp.mp3",
  chords: `Dm - C - Dm - C - F - C - Dm - Gamme : Rï¿½ mineur`,
  lyrics: [
    "Hare Krishna Hare Krishna, Krishna Krishna Hare Hare",
    "Hare Rama Hare Rama, Rama Rama Hare Hare",
  ],
},
{
  title: "Gopala Govinda Rama (Mantra Room)",
  audio: "mohana.mp3",
  chords: `Em - Bm - C - G`,
  lyrics: [
    "Gopala Govinda Rama Madana Mohana",
  ],
},
{
  title: "Jaya Bhagavan (Kevin james caroll)",
  audio: "mayweall.mp3",
  chords: `C - F || F - Dm - C, F - Am - G`,
  lyrics: [
    "May we all awaken to the One, as the moon reflects the sun",
    "May we all awaken to the One, beyond the veils",
    "Jaya Bhagavan",
  ],
},
{
  title: "Ganesha Sharanam (KSR)",
  audio: "ganeshasharanam.mp3",
  chords: `E Abm C#m A || E Abm C#m B || B A E`,
  lyrics: [
    "Ganesha Sharanam, Sharanam Ganesha",
    "Gam Gam Ganapati Sharanam",
    "Ganesha Sharanam.... Jai Ganesha",
  ],
},
{
  title: "Jaya Bhagavan Shivaya",
  audio: "mooji.mp3",
  chords: `Am - F - C - G`,
  lyrics: [
    "Jaya Bhagavan Shivaya, Jaya Bhagavan Sri Mooji ji",
    "Jaya Bhagavan Shivaya, Jaya Bhagavan",
    "Om Namo Shivaya Gurudev Namo",
    "Sri Mooji Baba Ki Jai",
  ],
},
{
  title: "Jaya Shiva Shankara",
  audio: "bombomharihari.mp3",
  chords: `C2 : Bm - A || G - A - Bm`,
  lyrics: [
    "Jaya Shiva Shankara Bom Bom Hari Hari",
    "Hari Hari Hari Hari Bom Bom Hari Hari",
    "Jai Shiva Shankara, Jai Shiva Shankara,",
    "Jai Shiva Shankara Om",
  ],
},
{
  title: "Parameshwari Jaya Durga",
  audio: "parameshwari.mp3",
  chords: `C - G - F - G - C`,
  lyrics: [
    "Parameshwari Jaya Durga",
    "Jagadeeshwari Jaya Amba",
    "Jai Jai Ma, Jai Jai Ma",
    "Jai Jai Ma, Jai Jai Ma",
    "Jaya Durga Jaya Durga Mahamaya Jagadamba",
    "Jaya Durga Jaya Durga Mahamaya Jagadamba",
  ],
},
{
  title: "Ganesha Puja (chandra lacombe)",
  audio: "ganeshapuja.mp3",
  chords: `Dm - Am - Bb - C - Dm || Dm - C - F- F - C`,
  lyrics: [
    "Om parvati pataye",
    "Hara hara hara mahadeva",
    "Gajana-nam buta",
    "2x",
    "Ganadi sevatam",
    "Kapitha jambu",
    "Palacharu bhakshanam",
    "2x",
    "Umasota shoka",
    "Vinasha karakam",
    "Namami vigneshuara",
    "Pada pankajam",
    "2x",
    "Om gam ganapathaye namah",
  ],
},
{
  title: "Gate Gate",
  audio: "gate.mp3",
  chords: `Dm - C - F - Dm || F- C- Am - Dm Instru : Bb - F - C Dm`,
  lyrics: [
    "Gate Gate Paragate Parasamgate Bodhi Soha",
  ],
},
{
  title: "Hara Hara Bole",
  audio: "harabole.mp3",
  chords: `Dm -C -Am - Gm - F - Am - Dm
Dm -Gm Dm`,
  lyrics: [
    "Om Namah Shivaya Om Namah Shivaya Hara Hara Bole Namah Shivaya",
    "Rameshwaray Shiva Rameshwaray Hara Hara Bole Namah Shivaya",
    "Ganga Dhara Shiva Ganga Dhara Hara Hara Bole Namah Shivaya",
    "Jatadhara Shiva Jatadhara Hara Hara Bole Namah Shivaya",
    "Someshwara Shiva Someshwara Hara Hara Bole Namah Shivaya",
    "Vishweshvara Shiva Vishweshvara Hara Hara Bole Namah Shivaya",
    "Lingeshvara Shiva Lingeshvara Hara Hara Bole Namah Shivaya",
    "Parameshwaraya Shiva Parameshwaraya Hara Hara Bole Namah Shivaya",
  ],
},
{
  title: "Sarva Mangala tina malia",
  audio: "sarva.mp3",
  chords: `Dm - Gm - Gm - C - A - Dm
Dm- Gm - Dm - C - Dm - Gm - A - Dm
Dm - Bb - C || Dm - Gm - A`,
  lyrics: [
    "Sar-va Man-gala Mangalye",
    "Shi-ve Sarvar-tha Sadhike",
    "Sharanye --Tryambake Gau--ri",
    "Narayani --Namostute",
    "Om Namah Shivaya! (Hari) Om Namah Shiva! -- Shivaya Shivaya Shivaya!",
  ],
},
{
  title: "Ang Sung Wahe Guru",
  audio: "makelove.mp3",
  chords: `C1 ou 2 : E/Abm - A || E - A`,
  lyrics: [
    "Even After All this time The Sun never says to the Earth,\"You owe me.\"",
    "Look What happens With a love like that, It lights the whole sky.",
    "Make your Love, like the sun",
    "Shine down on everyone",
    "-Ang Sung Wahe Guru-",
    "Shine On Benevolant Sun",
    "Shine down upon the Broken and make it One (We™re all One)",
  ],
},
{
  title: "Shiva! (Edo & Jo)",
  audio: "shiva!.mp3",
  chords: `C1 : C - F - G`,
  lyrics: [
    "Shiva! Om Namah Shivaya",
    "Namah Namah Namah Namah Namah, Namah Shivaya",
    "(Shiva Shambho Shankara, Jagadeeshwara // Parameshwara",
  ],
},
{
  title: "Govinda Jaya Jaya (Lakshmi ananda)",
  audio: "govindalak.mp3",
  chords: `C2 : Am - G`,
  lyrics: [
    "Gonvinda Jaya Jaya, Gopala Jaya Jaya",
    "Radha Ramana Hari Govinda Jaya Jaya",
    "Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare",
    "Hare Rama Hare Rama, Rama Rama, Hare Hare",
  ],
},
{
  title: "Om Namo Narayani Om (Edo &Jo)",
  audio: "omnamo.mp3",
  chords: `G - C || G - Em - C - G || G- C`,
  lyrics: [
    "Om Namo Narayani Om",
    "Narayani, Narayani, Narayani (Om)",
    "Devi Mangalam - Devi Sharanam",
    "Devi Mangalam - Devi Sharanam",
    "Narayani, Om",
  ],
},
{
  title: "Jagatambe (chant for amma)",
  audio: "amma.mp3",
  chords: `Dm--F--C--F--Dm || Dm--C--F--C--Dm`,
  lyrics: [
    "Jai Ma, Jagatambe, Jagatambe Jai Jai Ma (2x)",
    "Jai Jai Ma Jagatambe Ma (4x rapide)",
  ],
},
{
  title: "Sat Narayan - Sirgun Kaur",
  audio: "satnarayan.mp3",
  chords: `C--G--Am--G || F--G--Am--G - ou Bb (A avec Capo)`,
  lyrics: [
    "Sat Narayan Wahe Guru Hari Narayan Sat Nam",
    "Hare Ram Hare Ram Hare Krishna (Krishna Krishna Om)",
    "Hare Ram Hare Ram Hare Krishna",
    "Hare Rama Hare Rama Dhutam",
    "Hare Rama Hare Rama Dhutam",
  ],
},
{
  title: "Purnamadah (keshavacharya das)",
  audio: "purna1.mp3",
  chords: `Bm D A Bm | Bm D D A | A A Bm`,
  lyrics: [
    "Om Purnamadah Purnamidam",
    "Purnat Purna Mudachyate",
    "Purnasya Purnamadaya",
    "Purnameva Vashishyate",
    "Anandoham Shivoham",
  ],
},
{
  title: "Om Mata Om Kali",
  audio: "ommata.mp3",
  chords: `Bm A Bm | Bm A Em Bm A G A Bm | Em Bm`,
  lyrics: [
    "Om Mata Om Kali Durga Devi Namo Namaha",
    "Shakti Kundalini Jagadambe Mata Shakti Kundalini Jagadambe Mata",
    "He Ma Durga He Ma Durgaya",
    "Kali Durge Namah Shivaya Kali Durge Namah Shivaya",
  ],
},
{
  title: "Hanuman Bolo",
  audio: "hanumanbolo.mp3",
  chords: `C1 : E-B-C#m-A`,
  lyrics: [
    "Rama Bolo, Rama Bolo, Bolo Bolo Ram",
    "Sita Bolo, Sita Bolo, Bolo Sita Ram",
    "Hanuman Bolo Hanuman Bolo Bolo Hanuman!",
    "Jai Jai Hanuman, Jai Jai Hanuman, Jai Jai Hanuman!",
  ],
},
{
  title: "Tara Mantra",
  audio: "tare.mp3",
  chords: `C2 Am
Om Tare Tuttare Ture Soha
Em
Om Tare Tuttare Ture Soha
Am Em Dm
Om Tare Tuttare Ture Soha
F Em Am
Om Tare Tuttare Ture Soha`,
  lyrics: [
    "Om Tare Tuttare Ture Soha",
  ],
},
{
  title: "Asato Ma (Karen St-Laurent)",
  audio: "asatoka.mp3",
  chords: `C3  Am, C ,G Am C G | F C G`,
  lyrics: [
    "Om Asatoma Sat Gamaya",
    "Tamaso Ma Jyotir Gamaya",
    "Mrityor Ma Amritam Gamaya",
  ],
},
{
  title: "Tara Mantra Mixo",
  audio: "taramixo.mp3",
  chords: `D C G /Em  D
Om Tare Tuttare Ture Swaha
Am C Em/G D
Om Tare Tuttare Ture Swaha`,
  lyrics: [
    "Om Tare Tuttare Ture Swaha",
  ],
},
{
  title: "Medicine Buddha",
  audio: "medicine1.mp3",
  chords: `C G Am
Teyatha Om Bekanze Bekanze Maha Bekanze
Dm F G
Radza Samudgate Soha`,
  lyrics: [
    "Om Mani Peme Hum",
    "Om Mani Peme Hum",
  ],
},
{
  title: "Sat Narayana - (Guru Ganesha & Snatam Kaur)",
  audio: "satnara.mp3",
  chords: `C3 A   G   Em   A
G   Bm   A`,
  lyrics: [
    "Sat Narayana Wahe Guru Hari Narayana Sat Nam",
    "Hare Ram Hare Ram Hare Krishna (Krishna Krishna Om)",
    "Hare Ram Hare Ram Hare Krishna",
    "Hare Rama Hare Rama Dhutam",
    "Hare Rama Hare Rama Dhutam",
    "Wahe Guru",
  ],
},
{
  title: "Ma Durga (Shantala - Live)",
  audio: "omdum.mp3",
  chords: `C2 Am G Am
Am G C G
Am G Dm Am`,
  lyrics: [
    "Om Dum Durgayei Namaha x4",
    "Om Mata Om Kali Om Durga",
    "He Durga Ma Durga",
  ],
},
{
  title: "Govinda Narayana (Kristin Luna Ray)",
  audio: "govindana.mp3",
  chords: `C2: Am - G
Am G Am
Govinda Narayana, Gopala Narayana
Am G Am
Govinda Gopala Narayana
Govinda Gopala Narayana
C G Em Am
Hari Govinda Gopala Narayana`,
  lyrics: [
    "Govinda Narayana, Gopala Narayana",
    "Govinda Gopala Narayana",
    "Govinda Gopala Narayana",
    "Hari Govinda Gopala Narayana",
  ],
},
{
  title: "Shiva Parvati (Jaya Lakshmi , Ananda)",
  audio: "umaparvati.mp3",
  chords: `E A
Om Namah Shivaya Om Namah Shivaya
E A
Uma Parvati Namo Namah
Bsus2 - Asus2 - E`,
  lyrics: [
    "Om Namah Shivaya Om Namah Shivaya",
    "Uma Parvati Namo Namah",
  ],
},
{
  title: "Omkaraya (Karen St-Laurent)",
  audio: "omkaraya.mp3",
  chords: `Capo 2 (F#): E
Om, Omkaraya Om, Omkaraya
A E A E
Om Shanti Om - Om Shanti Om`,
  lyrics: [
    "Om, Omkaraya Om, Omkaraya",
    "Om Shanti Om - Om Shanti Om",
  ],
},
{
  title: "Jay Ambe (Karen-St-Laurent)",
  audio: "jayambe.mp3",
  chords: `Capo 1 : D A Bm G D A Bm G`,
  lyrics: [
    "Jay Ambe, Jagatambe Mata Bhavani Jay Ambe",
    "D....",
    "Sri Ma, Jai Ma",
    "Sri Ma, Jai Ambe",
  ],
},
{
  title: "Om Mani Pedme Hung (Samanvaya Kirtan)",
  audio: "mani.mp3",
  chords: `Mixolydian capo 2,3 D Am C Em D`,
  lyrics: [
    "Om Mani Pedme Hung",
    "Om Mani....Pedme Hung",
  ],
},
{
  title: "Para Gate (Istvan Sky)",
  audio: "gategate.mp3",
  chords: `Capo 2 (D)
C G Am
Gate Gate Gate Para Gate
F Dm G
Parasamgate Bodhi Soha`,
  lyrics: [
    "Gate Gate Gate Para Gate",
    "Parasamgate Bodhi Soha",
  ],
},
{
  title: "Wendeyaho (Sudha)",
  audio: "wendeyaho.mp3",
  chords: `D G D Bm G
We n' de ya ho, We n' de ya ho,
We n' de ya, We n' de ya Ho ho ho
D - D - Bm  Bm
We n' de ya ho, We n' de ya`,
  lyrics: [
    "We n' de ya ho, We n' de ya ho,",
    "We n' de ya, We n' de ya Ho ho ho",
    "We n' de ya ho, We n' de ya",
  ],
},
{
  title: "Ad Guray Nameh",
  audio: "ad.mp3",
  chords: `C1: C- G  Dm  F`,
  lyrics: [
    "Aad Guray Nameh",
    "Jugaad Guray Nameh",
    "Sat Guray Nameh",
    "Siri Guroo Dayvay Nameh",
  ],
},
{
  title: "Govinda Damodara Madhaveti (Like a River - Jahnavi Harrison)",
  audio: "govindadamo.mp3",
  chords: `C  G   Am F  C/E G`,
  lyrics: [
    "govinda damodara madhaveti",
    "he krsna he yadhava he sakheti",
  ],
},
{
  title: "Om Namo Bhagavate Vasudevaya",
  audio: "bhag.mp3",
  chords: `Am C G D`,
  lyrics: [
    "Om Namo Bhagavate Vasudevaya",
    "Vasudevaya",
  ],
},
{
  title: "Gonvinda Jaya Jaya (Karen)",
  audio: "govkar.mp3",
  chords: `C4 Am   F  G`,
  lyrics: [
    "Govinda Jaya Jaya Gopala Jaya Jaya",
    "Radha Ramana Hari Govinda Jaya Jaya",
    "Hari Om Hari Om Hari Om (tat sat)",
  ],
},
{
  title: "He Krishna Govinda",
  audio: "hekrishna.mp3",
  chords: `C3 A  D   E || D   F#m D E`,
  lyrics: [
    "He Krishna Govinda",
    "Mukunda Hare, Gopala Hare",
  ],
},
{
  title: "He Maha Lakshmi David Newman",
  audio: "hemaha.mp3",
  chords: `D G ... G D
G   D   A  Bm  G  D  A   D
He Maha Lakshmi
He Saraswati
He Mata Kali
Jagadambe Jay Jay Ma
Jagadambe Jay Jay Ma
He Ma Durga, He Ma Durga
He Ma Durga Jagadambe Jay Jay Ma
Jay Jay Ma Ma Ma, Jay Jay Ma Ma Ma`,
  lyrics: [
    "He Maha Lakshmi",
    "He Saraswati",
    "He Mata Kali",
    "Jagadambe Jay Jay Ma",
    "Jagadambe Jay Jay Ma",
    "He Ma Durga, He Ma Durga",
    "He Ma Durga Jagadambe Jay Jay Ma",
    "Jay Jay Ma Ma Ma, Jay Jay Ma Ma Ma",
  ],
},
{
  title: "Om namo bhagavate (teardrop massive attack)",
  audio: "teardrop.mp3",
  chords: `A - G - D II : F - G   A`,
  lyrics: [
    "Om Namo Bhagavate, Vasudevaya",
    "Om, Hari Om",
    "Hari Om, Hari Om , Hari Om",
  ],
},
{
  title: "Asato Ma",
  audio: "asatodev.mp3",
  chords: `D  Bb- D- Bb  D- Bb- D- Bb- C | F Gm Am Bb`,
  lyrics: [
    "Asato Ma Sat Gamaya",
    "Tamaso Ma Jyotir Gamaya",
    "Mrityor Ma Amritam Gamaya",
    "Mrityor Ma Amritam Gamaya",
    "Om Shanti Om Shanti Om Shanti Om",
  ],
},
{
  title: "Ide Were Were Nita Ochun",
  audio: "idewere.mp3",
  chords: `Capo 3 : Em - D -Em
Em - D -Em -C -D-G-C-D-B`,
  lyrics: [
    "Ide were were nita ochun",
    "Ide were were",
    "Ide were were nita ochun",
    "Ide were were nita ya",
    "Ocha kiniba nita ochun",
    "Cheke cheke cheke",
    "Nita ya",
    "Ide were were",
  ],
},
{
  title: "Jaya Ganesha (sundaram mantras for silence)",
  audio: "jgs.mp3",
  chords: `Am - G - Em`,
  lyrics: [
    "Jaaaaa---ya…Ganesha",
    "Namah Om, Namah Om",
    "Om Gam Ganapataye Namaaaah Om",
    "Om Gam Ganapataye Namaaaah Om",
  ],
},
{
  title: "Hare Ram",
  audio: "hrkd.mp3",
  chords: `C1: A - E - F#m- D`,
  lyrics: [
    "Sri Ram Jai Ram Jai Jai Ram",
    "Sri Ram Jai Ram Jai Jai Ram",
    "Hare Rama Rama Ram",
    "Sharanam Bhava Rama Ram",
    "Hare Rama Rama Ram",
    "Raghunandana Rama Ram",
    "Sita Rama, Sita Ram, Sita Ram Jaya Sita Ram",
  ],
},
{
  title: "Durge Jai Jai Ma",
  audio: "durge.mp3",
  chords: `Bm A D A Bm -- Bm E A E Bm -- D A Bm`,
  lyrics: [
    "Durge Durge Durge Jai Jai Ma",
    "Jagatambe Jai Jai Ma",
  ],
},
{
  title: "Sita Ram (Tina Malia)",
  audio: "sitaramtina.mp3",
  chords: `C3 : Am C G Am -- C...G...Am -- C G Em Am`,
  lyrics: [
    "Sita Sita Ram, Sita Ram Kahiye",
    "Jahi Vidhi Rakhe Ram, Tahi Vidhi Rahiye",
    "Sita Ram, Pyare",
  ],
},
{
  title: "Namostute (alex)",
  audio: "namostu.mp3",
  chords: `A F#m E -- A F#m -D -E`,
  lyrics: [
    "Namostute Namostute, Jay Sri Mata Namostute",
    "Namostute Namostute, Jay Jagatambe Namostute",
    "Namostute Namostute, Jay Balaprada Namostute",
    "Namostute Namostute, Jay Satya Devi Namostute",
    "Namostute Namostute, Jay Parvati Namostute",
  ],
},
{
  title: "Chamundaye - A dorian",
  audio: "chamundaye.mp3",
  chords: `Am F/C G Am -- D Am 4x F G Am -- Am G Am F G Am--- - Am C G`,
  lyrics: [
    "Chamundaye, Kali Ma...Kali Ma, Kali Ma, Kali Ma",
    "Kali..MA Kali MA!",
    "Namah Shivaya",
    "Kali Kali Maaaa Kali Kali Ma",
    "Om Chamundaye Viche Namaha¦",
  ],
},
{
  title: "Puranamada",
  audio: "purna2.mp3",
  chords: `C2: Am G Am G F G F G`,
  lyrics: [
    "Purnamadah Purnamidam",
    "Purnat Purnamudachyate",
    "Prunasya Purnamadaya",
    "Purnameva Vashishyate",
  ],
},
{
  title: "By your grace (Omkara)",
  audio: "byg.mp3",
  chords: `Capo 2 : Am F C G`,
  lyrics: [
    "By your grace, I am",
    "I come to life in you, I come to life in you",
    "Shiva Shiva Mahadeva Shiva Shiva Mahadeva",
    "Mahadeeeevaaaaaaaaaaa¦.Mahadeeeeevaaaaaaa",
    "Guru Kripa Kevalam¦.Guru Kripa Kevalam...",
    "Ommm Satguru Sri...Moojibabaya Namaha",
  ],
},
{
  title: "Ad Guray Nameh (mirabai)",
  audio: "admira.mp3",
  chords: `C1 C Am F G`,
  lyrics: [
    "Aad Guray Nameh, Jugad Guray Nameh,",
    "Sat Guray Nameh, Siri Guru Devay Nameh",
  ],
},
{
  title: "Ra ma da sa sa say so hung (ajeet kaur)",
  audio: "rmds.mp3",
  chords: `C4 Am F G`,
  lyrics: [
    "Ra Ma Da Sa Sa Say So Hung",
  ],
},
{
  title: "om ah ra pa ca na dhih",
  audio: "omara.mp3",
  chords: `D Bm Em A`,
  lyrics: [
    "Om Ah Ra Pa Ca Na Dhih",
  ],
},
{
  title: "Hare Krishna (compilation)",
  audio: "harecomp.mp3",
  chords: `C4 Am   Em   F   C   G
 Am   Em   F   G`,
  lyrics: [
    "Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare",
    "Hare Rama, Hare Rama, Rama Rama, Hare Hare",
  ],
},
{
  title: "Shiva Shankara Mahadeva Om",
  audio: "bombom.mp3",
  chords: `C2 Am G Am
Am G C G
Am G Am
--
C G Am`,
  lyrics: [
    "Shiva Shankara Mahadeva Om",
    "Shiva Shankara Mahadeva Om",
    "Mahadeva Shivay Mahadeva Shivay",
    "Shiva Shankara Mahadeva Om",
    "Bom Bom Bolo Bolo Bom Bom Bom",
  ],
},
{
  title: "Hare Rama Rama Ram",
  audio: "hareramcomp.mp3",
  chords: `F#m D A E
F#m D E`,
  lyrics: [
    "Hare Rama Rama Ram, Sita Rama Rama Ram",
  ],
},
{
  title: "Om Sri Ram Jai Jai Ram",
  audio: "osrcomp.mp3",
  chords: `E B A
C#m B Abm A
C#m B A`,
  lyrics: [
    "Om Sri Ram Jai Jai Ram",
  ],
},
{
  title: "Guru Ram Das meditation",
  audio: "grdmed.mp3",
  chords: `F#m A D A E
D E D A E`,
  lyrics: [
    "Guru Guru Wahe Guru",
    "Guru Ram Das Guru",
  ],
},
{
  title: "He mahalakshmi",
  audio: "lak.mp3",
  chords: `G   C   G   C   G   D
C   D   G   C   C   D   G
G  D  Em  C  G  D  G`,
  lyrics: [
    "He mahalakshmi Durgayei Namaha",
    "He mahalakshmi Durga",
    "He Ma He Ma Durga",
    "He Ma Jai Jai Ma Durga",
    "He Ma Jai Jai Ma",
    "Jai Jai Ma Jai Jai Ma",
    "Jai Jai Ma Durga",
    "Jai Jai Ma Jai Jai Ma",
  ],
},
{
  title: "He Bhagavan (Gurumayi)",
  audio: "hebha.mp3",
  chords: `C G Am / Dm G Em Am/ G D Am C G Am`,
  lyrics: [
    "He Bhagavan He Bhagavan",
    "Jaya Guru Muktananda Tuma Ho Mahan",
    "Sharan Aye Ham Tumhare Raksha Karo Bhagavan",
  ],
},
{
  title: "Kali Durge Namo Namah",
  audio: "kalidurge.mp3",
  chords: `C F C F C G C
C F C
F C G C`,
  lyrics: [
    "Kali Durge Namo Namah",
  ],
},
{
  title: "Narayana",
  audio: "nara.mp3",
  chords: `C C C G
G F G`,
  lyrics: [
    "Narayana Narayana Jaya Govinda Hare",
    "Narayana Narayana Jaya Gopala Hare",
  ],
},
{
  title: "Jai Ma Jai Kali Ma (Sacred earth call of the Divine)",
  audio: "jaimajai.mp3",
  chords: `Capo 1 C G C
Am G Am G Am G C`,
  lyrics: [
    "Jai ma jai Kali ma",
    "Jai Jai Kali ma",
    "Jai ma Jai Kali Devi",
    "Jai ma Jai Kali Devi",
    "Jai maaaaa Kali ma",
  ],
},
{
  title: "Hari Om",
  audio: "hariom.m4a",
  chords: `Capo 1
Em G C D
Em G Am C G`,
  lyrics: [
    "Hari Om Hari Om Hari Om Hari Om",
    "Hari Om Hari Om Hari Om Tat Sat Hari Om",
  ],
},
{
  title: "Om Anandamayi",
  audio: "anandamayi.m4a",
  chords: `Capo 1
G C G D`,
  lyrics: [
    "Om anandamayi chaitanyamayi satyamayi parameshwari",
  ],
},
{
  title: "Om Gam Ganapataye Namaha insp. Sam Garrett",
  audio: "omgam.m4a",
  chords: `Capo 3
Am F C Dm Am Dm G
C G Am / C G Am F/ C G F`,
  lyrics: [
    "Om Gam Ganapataye Namaha",
    "Ganesha Sharanam",
    "Ganesha Sharanam",
  ],
},
{
  title: "Hari Om (mooji kirtan)",
  audio: "hariommooji.m4a",
  chords: `Capo 2 Am F C G`,
  lyrics: [
    "Hari Om Hari Om Hari Om Namah Shivaya",
  ],
},
{
  title: "Om Gangadaraya Namah",
  audio: "omganga.m4a",
  chords: `Capo 2 A E A
F#m E D F#m E Bm D`,
  lyrics: [
    "Om Gangadaraya Namah",
  ],
},
{
  title: "One With you (Stephen deruby)",
  audio: "onewithyou.m4a",
  chords: `Dm C`,
  lyrics: [
    "Om Namah Shivaya Om Namah Shivaya",
    "I open my heart, feel the love go through",
    "I'm One with everything, I am One with You",
  ],
},
{
  title: "Om Namah Shivaya (Omkara)",
  audio: "Onsomkara.mp3",
  chords: `Capo 1
Am F G Em F Dm Dm G`,
  lyrics: [
    "Om Namah Shivaya Om Namah Shivaya",
  ],
},
{
  title: "Hara Hara Shankara (Steve Ross)",
  audio: "Harash.mp3",
  chords: `Am G
F G Am`,
  lyrics: [
    "Hara Hara Shankara Hara Hara Shankara Parabrahma Parameshwara Parabrahma Parameshwara",
  ],
},
{
  title: "Hara Hara Hara Mahadev (Jai uttal)",
  audio: "hhhmahadev.mp3",
  chords: `C Dm
F Dm C
F Dm G`,
  lyrics: [
    "Hara Hara Hara Mahadev...",
    "Jaya Shivaya Parameshwara Arunachala Shiva Om",
    "Jaya Shivaya Parameshwara Arunachala",
  ],
},
{
  title: "Bolo Bolo Sadashiva Bolo Om Namah Shivaya (Steve Ross)",
  audio: "Bolossb.m4a",
  chords: `Capo 1 Am G`,
  lyrics: [
    "Bolo Bolo Sadashiva Bolo Om Namah Shivaya",
  ],
},
{
  title: "Arunachala  Shiva",
  audio: "ArunaSR.mp3",
  chords: `Capo 2
A E D E
A E F#mD`,
  lyrics: [
    "Arunachala Shiva Arunachala",
    "Shiva Om Namah Shivaya Om",
  ],
},
{
  title: "Gayatri Sam Bb",
  audio: "GayatriSam.m4a",
  chords: `Capo 1
A - E - Bm - D
F#m - E - A - D
F#m - E - D`,
  lyrics: [
    "Om Bhur Bhuva Swaha Tat Savitur Varenyam",
    "Bhargo Devasya Dhimahi Diyoyonah prachodayat",
    "Om Arkaya Namaha Arkaya",
    "Om Arkaya Namaha",
  ],
},
{
  title: "Ganesha Om Sam Bm",
  audio: "OmGaneshaSam.m4a",
  chords: `Capo 2
Am - Dm - F - C - Am
Dm -Am
Dm - Am
F - G - Am`,
  lyrics: [
    "Om Gam Ganapataye Namaha",
    "Om Gam Ganapataye Namaha",
    "Ganesha Sharanam Ganesha Sharanam",
    "Om Ganesha Om Ganapati",
    "Om Ganesha - Om Gam Ganapati",
  ],
},
{
  title: "Om Asatoma Sat Gamaya (Deva Premal)",
  audio: "asatomamixo.m4a",
  chords: `Capo 3 (C Mixolydian) or original Capo 4 (Db Mixolydian)
A - Em`,
  lyrics: [
    "Om Asatoma Sat Gamaya Tamaso ma Jyotir Gamaya",
    "Mritoyr ma amritam gamaya",
  ],
},
{
  title: "Om Gam Ganapataye (Karen)",
  audio: "omgamkaren.m4a",
  chords: `D - G   C - G - D (D mixolydian)`,
  lyrics: [
    "Om Gam Ganapataye Namaha",
    "Ganesha",
    "Om Sri Ganesha",
  ],
},
{
  title: "He Ma Durga (melody by gurrumul)",
  audio: "jayadevamata.m4a",
  chords: `D - Em - G - A`,
  lyrics: [
    "Jaya Devamata Jaya Bhavani",
    "Sarvamantramayi Parameshwari",
    "He Ma Durga",
    "Jaya Balaprada Jaya Sundari",
    "Sarvamantramayi Parameshwari",
  ],
},
{
  title: "Madana Mohana Murari - Haribol",
  audio: "madanamixo.m4a",
  chords: `Capo 1
A D A
G D A`,
  lyrics: [
    "Madana Mohana Murari - Haribol",
  ],
},
{
  title: "Om Gam Ganapataye Namo Namaha (trad)",
  audio: "vinayak.m4a",
  chords: `Capo 2
A
Om Gam Ganapataye Namo Namaha
E
Sri Siddhi Vinayak Namo Namah
Ashtavinayak Namo Namaha
D      E     A
Ganapati Bappa Moraya
-------------
A
Om Gam Ganapataye Namo Namaha
D              A
Sri Siddhi Vinayak Namo Namah
E
Ashtavinayak Namo Namaha
D      E       A
Ganapati Bappa Moraya`,
  lyrics: [
    "Om Gam Ganapataye Namo Namaha",
    "Sri Siddhi Vinayak Namo Namah",
    "Ashtavinayak Namo Namaha",
    "Ganapati Bappa Moraya",
  ],
},
];
