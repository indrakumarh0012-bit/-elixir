export interface MedicalTextbook {
  id: string;
  title: string;
  author: string;
  specialty: string;
  level: "UG Standard" | "PG / Superspecialty" | "Clinical Manual";
  description: string;
  keyTopics: string[];
}

export const medicalBooksDB: MedicalTextbook[] = [
  // —— General Medicine ——
  {
    id: "harrison-im",
    title: "Harrison's Principles of Internal Medicine",
    author: "Jameson, Fauci, Kasper, Hauser, Longo, Loscalzo",
    specialty: "General Medicine",
    level: "PG / Superspecialty",
    description:
      "Flagship internal medicine reference covering pathophysiology, diagnosis, and management across adult medicine specialties.",
    keyTopics: [
      "Approach to the patient",
      "Infectious diseases",
      "Cardiology essentials",
      "Endocrinology & metabolism",
    ],
  },
  {
    id: "davidson-medicine",
    title: "Davidson's Principles and Practice of Medicine",
    author: "Ralston, Penman, Strachan, Hobson",
    specialty: "General Medicine",
    level: "UG Standard",
    description:
      "Core undergraduate and early postgraduate medicine text with clear clinical presentations and evidence-based management.",
    keyTopics: [
      "Clinical examination",
      "Respiratory medicine",
      "Gastroenterology",
      "Acute medicine",
    ],
  },
  {
    id: "kumar-clark",
    title: "Kumar & Clark's Clinical Medicine",
    author: "Kumar, Clark, Feather",
    specialty: "General Medicine",
    level: "UG Standard",
    description:
      "Practical clinical medicine reference linking symptoms, investigations, and treatment for ward and clinic use.",
    keyTopics: [
      "Differential diagnosis",
      "Investigations",
      "Therapeutics",
      "Emergency presentations",
    ],
  },
  {
    id: "macleod-exam",
    title: "Macleod's Clinical Examination",
    author: "Innes, Dover, Fairhurst",
    specialty: "General Medicine",
    level: "Clinical Manual",
    description:
      "Step-by-step guide to history-taking and physical examination skills across body systems.",
    keyTopics: [
      "History taking",
      "Systemic examination",
      "OSCE skills",
      "Clinical signs",
    ],
  },
  {
    id: "alagappan",
    title: "Alagappan's Manual of Practical Medicine",
    author: "Alagappan",
    specialty: "General Medicine",
    level: "Clinical Manual",
    description:
      "Concise bedside-oriented manual popular in Indian medical colleges for ward rounds and exams.",
    keyTopics: [
      "Case presentation",
      "Common ward cases",
      "Investigations",
      "Drug dosages",
    ],
  },
  {
    id: "boloors-exam",
    title: "Archith Boloor's Exam Preparatory Manual for Undergraduates",
    author: "Archith Boloor",
    specialty: "General Medicine",
    level: "UG Standard",
    description:
      "Exam-focused medicine manual covering high-yield topics for Indian MBBS university exams.",
    keyTopics: [
      "Long & short cases",
      "Viva topics",
      "High-yield facts",
      "Exam patterns",
    ],
  },
  {
    id: "manipal-medicine",
    title: "Manipal Manual of Medicine",
    author: "Manipal University Press / Contributors",
    specialty: "General Medicine",
    level: "UG Standard",
    description:
      "Structured undergraduate medicine manual emphasizing clinical approach and exam readiness.",
    keyTopics: [
      "Clinical approach",
      "System-wise medicine",
      "Practical tips",
      "Exam revision",
    ],
  },

  // —— Surgery ——
  {
    id: "bailey-love",
    title: "Bailey & Love's Short Practice of Surgery",
    author: "Williams, O'Connell, McCaskie",
    specialty: "Surgery",
    level: "UG Standard",
    description:
      "Classic general surgery textbook covering principles, common surgical diseases, and operative fundamentals.",
    keyTopics: [
      "Surgical principles",
      "GI surgery",
      "Trauma basics",
      "Operative care",
    ],
  },
  {
    id: "srb-surgery",
    title: "SRB's Manual of Surgery",
    author: "Sriram Bhat M",
    specialty: "Surgery",
    level: "UG Standard",
    description:
      "Indian undergraduate surgery manual with clinical cases, instruments, and exam-oriented content.",
    keyTopics: [
      "Clinical surgery cases",
      "Instruments",
      "Operative surgery",
      "Viva preparation",
    ],
  },
  {
    id: "s-das-clinical",
    title: "S Das - A Manual on Clinical Surgery",
    author: "S Das",
    specialty: "Surgery",
    level: "Clinical Manual",
    description:
      "Bedside clinical surgery manual for examination of surgical cases and clinical signs.",
    keyTopics: [
      "Clinical examination",
      "Swellings & ulcers",
      "Hernia & abdomen",
      "Long case approach",
    ],
  },
  {
    id: "manipal-surgery",
    title: "Manipal Manual of Surgery",
    author: "K. Rajgopal Shenoy / Contributors",
    specialty: "Surgery",
    level: "UG Standard",
    description:
      "Concise surgery manual tailored for Indian medical undergraduates and practical exams.",
    keyTopics: [
      "General surgery",
      "Clinical methods",
      "Common operations",
      "Exam notes",
    ],
  },
  {
    id: "sabiston",
    title: "Sabiston Textbook of Surgery",
    author: "Townsend, Beauchamp, Evers, Mattox",
    specialty: "Surgery",
    level: "PG / Superspecialty",
    description:
      "Comprehensive surgical reference spanning basic science, operative techniques, and specialty surgery.",
    keyTopics: [
      "Surgical basic science",
      "Oncologic surgery",
      "Trauma & critical care",
      "Specialty surgery",
    ],
  },

  // —— Pediatrics ——
  {
    id: "nelson-peds",
    title: "Nelson Textbook of Pediatrics",
    author: "Kliegman, St. Geme, Blum, Shah, Tasker, Wilson",
    specialty: "Pediatrics",
    level: "PG / Superspecialty",
    description:
      "Authoritative pediatrics reference covering growth, development, disease, and pediatric therapeutics.",
    keyTopics: [
      "Growth & development",
      "Infectious diseases",
      "Neonatology overview",
      "Pediatric emergencies",
    ],
  },
  {
    id: "harriet-lane",
    title: "The Harriet Lane Handbook",
    author: "Johns Hopkins Hospital / Editors",
    specialty: "Pediatrics",
    level: "Clinical Manual",
    description:
      "Pocket clinical handbook for pediatric dosing, diagnostics, and ward decision support.",
    keyTopics: [
      "Pediatric dosing",
      "Formulary",
      "Lab values",
      "Acute care algorithms",
    ],
  },
  {
    id: "cloherty-neonatal",
    title: "Cloherty and Stark's Manual of Neonatal Care",
    author: "Eichenwald, Hansen, Martin, Stark",
    specialty: "Pediatrics",
    level: "Clinical Manual",
    description:
      "Practical neonatal intensive care manual for common NICU problems and protocols.",
    keyTopics: [
      "Neonatal resuscitation",
      "Respiratory distress",
      "Jaundice",
      "NICU pharmacology",
    ],
  },
  {
    id: "op-ghai",
    title: "OP Ghai Essential Pediatrics",
    author: "Paul, Bagga / Editors",
    specialty: "Pediatrics",
    level: "UG Standard",
    description:
      "Standard Indian undergraduate pediatrics textbook for common childhood illnesses and immunization.",
    keyTopics: [
      "Immunization",
      "Nutrition",
      "Common infections",
      "Growth charts",
    ],
  },
  {
    id: "iap-stg",
    title: "IAP Standard Treatment Guidelines (STG)",
    author: "Indian Academy of Pediatrics",
    specialty: "Pediatrics",
    level: "Clinical Manual",
    description:
      "India-focused standard treatment guidelines for common pediatric conditions in OPD and wards.",
    keyTopics: [
      "OPD protocols",
      "Antibiotic stewardship",
      "Fever algorithms",
      "Community pediatrics",
    ],
  },

  // —— Obstetrics & Gynecology ——
  {
    id: "williams-obs",
    title: "Williams Obstetrics",
    author: "Cunningham, Leveno, Dashe, Hoffman, et al.",
    specialty: "Obstetrics & Gynecology",
    level: "PG / Superspecialty",
    description:
      "Definitive obstetrics textbook on pregnancy physiology, maternal-fetal medicine, and intrapartum care.",
    keyTopics: [
      "Antepartum care",
      "Labor & delivery",
      "Hypertensive disorders",
      "Fetal monitoring",
    ],
  },
  {
    id: "williams-gyn",
    title: "Williams Gynecology",
    author: "Hoffman, Schorge, Halvorson, et al.",
    specialty: "Obstetrics & Gynecology",
    level: "PG / Superspecialty",
    description:
      "Comprehensive gynecology reference covering benign disease, oncology, and operative gynecology.",
    keyTopics: [
      "Menstrual disorders",
      "Gynecologic oncology",
      "Pelvic surgery",
      "Reproductive endocrinology",
    ],
  },
  {
    id: "dc-dutta",
    title: "DC Dutta's Textbook of Obstetrics",
    author: "Hiralal Konar / DC Dutta",
    specialty: "Obstetrics & Gynecology",
    level: "UG Standard",
    description:
      "Widely used Indian obstetrics textbook for undergraduates covering antenatal to postnatal care.",
    keyTopics: [
      "Normal pregnancy",
      "Obstetric complications",
      "Operative obstetrics",
      "Puerperium",
    ],
  },
  {
    id: "shaws-gyn",
    title: "Shaw's Textbook of Gynecology",
    author: "Padubidri, Daftary / Editors",
    specialty: "Obstetrics & Gynecology",
    level: "UG Standard",
    description:
      "Classic undergraduate gynecology text for Indian curricula with clinical and operative focus.",
    keyTopics: [
      "Benign gynecology",
      "Infections",
      "Infertility basics",
      "Gynecologic examination",
    ],
  },
  {
    id: "lakshmi-seshadri",
    title: "Lakshmi Seshadri - Essentials of Gynecology",
    author: "Lakshmi Seshadri",
    specialty: "Obstetrics & Gynecology",
    level: "UG Standard",
    description:
      "Concise gynecology essentials text for rapid revision and clinical clarity.",
    keyTopics: [
      "Core gynecology",
      "Exam-oriented notes",
      "Common procedures",
      "Case discussions",
    ],
  },
  {
    id: "berek-novak",
    title: "Berek & Novak's Gynecology",
    author: "Berek / Editors",
    specialty: "Obstetrics & Gynecology",
    level: "PG / Superspecialty",
    description:
      "In-depth gynecology reference spanning ambulatory care, surgery, and reproductive medicine.",
    keyTopics: [
      "Ambulatory gynecology",
      "Minimally invasive surgery",
      "Oncology",
      "Urogynecology",
    ],
  },

  // —— Dermatology ——
  {
    id: "iadvl-derm",
    title: "IADVL Textbook of Dermatology",
    author: "Indian Association of Dermatologists, Venereologists and Leprologists",
    specialty: "Dermatology",
    level: "PG / Superspecialty",
    description:
      "India-centric dermatology textbook covering infectious, inflammatory, and tropical skin disease.",
    keyTopics: [
      "Tropical dermatology",
      "Leprosy",
      "STIs",
      "Cosmetic dermatology basics",
    ],
  },
  {
    id: "fitzpatrick",
    title: "Fitzpatrick's Dermatology in General Medicine",
    author: "Kang, Amagai, Bruckner, et al.",
    specialty: "Dermatology",
    level: "PG / Superspecialty",
    description:
      "Major international dermatology reference linking cutaneous disease with systemic medicine.",
    keyTopics: [
      "Inflammatory dermatoses",
      "Bullous disorders",
      "Dermatopathology",
      "Systemic disease & skin",
    ],
  },
  {
    id: "rooks",
    title: "Rook's Textbook of Dermatology",
    author: "Griffiths, Barker, Bleiker, Chalmers, Creamer",
    specialty: "Dermatology",
    level: "PG / Superspecialty",
    description:
      "Encyclopedic dermatology text with detailed disease descriptions and management pathways.",
    keyTopics: [
      "Eczema & psoriasis",
      "Hair & nail disorders",
      "Pediatric dermatology",
      "Therapeutics",
    ],
  },
  {
    id: "neena-khanna",
    title: "Neena Khanna - Illustrated Synopsis of Dermatology",
    author: "Neena Khanna",
    specialty: "Dermatology",
    level: "UG Standard",
    description:
      "Illustrated, exam-friendly dermatology synopsis widely used by Indian undergraduates.",
    keyTopics: [
      "Common skin diseases",
      "Clinical photos",
      "Short notes",
      "Differential diagnosis",
    ],
  },
  {
    id: "andrews-skin",
    title: "Andrews' Diseases of the Skin",
    author: "James, Elston, Treat, Rosenbach, Neuhaus",
    specialty: "Dermatology",
    level: "PG / Superspecialty",
    description:
      "Clinical dermatology classic emphasizing diagnosis, morphology, and practical treatment.",
    keyTopics: [
      "Morphologic diagnosis",
      "Infectious dermatoses",
      "Cutaneous oncology",
      "Therapy pearls",
    ],
  },

  // —— Ophthalmology ——
  {
    id: "kanski",
    title: "Kanski's Clinical Ophthalmology",
    author: "Bowling / Kanski",
    specialty: "Ophthalmology",
    level: "PG / Superspecialty",
    description:
      "Image-rich clinical ophthalmology text for diagnosis and management of eye disease.",
    keyTopics: [
      "Anterior segment",
      "Retina & vitreous",
      "Glaucoma",
      "Neuro-ophthalmology",
    ],
  },
  {
    id: "khurana-ophtho",
    title: "AK Khurana - Comprehensive Ophthalmology",
    author: "AK Khurana",
    specialty: "Ophthalmology",
    level: "UG Standard",
    description:
      "Standard Indian undergraduate ophthalmology textbook for theory and clinical exams.",
    keyTopics: [
      "Refractive errors",
      "Cataract",
      "Conjunctivitis",
      "Community ophthalmology",
    ],
  },
  {
    id: "parsons-eye",
    title: "Parsons' Diseases of the Eye",
    author: "Sihota, Tandon / Editors",
    specialty: "Ophthalmology",
    level: "UG Standard",
    description:
      "Long-standing ophthalmology textbook covering ocular anatomy, disease, and surgery basics.",
    keyTopics: [
      "Ocular anatomy",
      "Uveitis",
      "Cornea",
      "Surgical principles",
    ],
  },
  {
    id: "yanoff-duker",
    title: "Yanoff & Duker - Ophthalmology",
    author: "Yanoff, Duker",
    specialty: "Ophthalmology",
    level: "PG / Superspecialty",
    description:
      "Comprehensive ophthalmology reference for residents and specialists with imaging correlation.",
    keyTopics: [
      "Imaging in ophthalmology",
      "Retinal surgery",
      "Orbit & plastics",
      "Pediatric ophthalmology",
    ],
  },
  {
    id: "wills-eye",
    title: "The Wills Eye Manual",
    author: "Wills Eye Hospital / Editors",
    specialty: "Ophthalmology",
    level: "Clinical Manual",
    description:
      "Pocket emergency and clinic manual for rapid ophthalmology diagnosis and treatment.",
    keyTopics: [
      "Ocular emergencies",
      "Red eye",
      "Trauma",
      "Quick differentials",
    ],
  },

  // —— ENT ——
  {
    id: "dhingra-ent",
    title: "Dhingra - Diseases of Ear, Nose and Throat",
    author: "PL Dhingra, Shruti Dhingra",
    specialty: "ENT",
    level: "UG Standard",
    description:
      "Standard Indian ENT undergraduate textbook covering ear, nose, throat, and head-neck basics.",
    keyTopics: [
      "Otology",
      "Rhinology",
      "Laryngology",
      "Head & neck basics",
    ],
  },
  {
    id: "scott-brown",
    title: "Scott-Brown's Otorhinolaryngology and Head and Neck Surgery",
    author: "Watkinson, Clarke / Editors",
    specialty: "ENT",
    level: "PG / Superspecialty",
    description:
      "Definitive multi-volume ENT and head & neck surgery reference for trainees and consultants.",
    keyTopics: [
      "Advanced otology",
      "Skull base",
      "Head & neck oncology",
      "Pediatric ENT",
    ],
  },
  {
    id: "logan-turner",
    title: "Logan Turner's Diseases of the Nose, Throat and Ear",
    author: "Editors / Classic ENT authors",
    specialty: "ENT",
    level: "UG Standard",
    description:
      "Classic ENT textbook focusing on clinical disease patterns of nose, throat, and ear.",
    keyTopics: [
      "Nasal diseases",
      "Throat infections",
      "Ear disease",
      "Clinical signs",
    ],
  },
  {
    id: "cummings-oto",
    title: "Cummings Otolaryngology",
    author: "Flint, Haughey, Lund, et al.",
    specialty: "ENT",
    level: "PG / Superspecialty",
    description:
      "Major US otolaryngology reference spanning medical and surgical ENT practice.",
    keyTopics: [
      "Sinus surgery",
      "Otologic surgery",
      "Airway management",
      "Facial plastics",
    ],
  },
  {
    id: "maqbool-ent",
    title: "Maqbool's Text Book of Ear, Nose and Throat Diseases",
    author: "Mohammad Maqbool, Suhail Maqbool",
    specialty: "ENT",
    level: "UG Standard",
    description:
      "Accessible ENT textbook for undergraduates with clinical and exam-oriented coverage.",
    keyTopics: [
      "ENT examination",
      "Common ENT infections",
      "Deafness",
      "Tonsils & adenoids",
    ],
  },

  // —— Psychiatry ——
  {
    id: "kaplan-sadock",
    title: "Kaplan & Sadock's Synopsis of Psychiatry",
    author: "Boland, Verduin, Ruiz / Kaplan & Sadock",
    specialty: "Psychiatry",
    level: "PG / Superspecialty",
    description:
      "Comprehensive psychiatry synopsis covering DSM disorders, psychotherapy, and biological treatments.",
    keyTopics: [
      "Mood disorders",
      "Psychosis",
      "Anxiety disorders",
      "Psychotherapies",
    ],
  },
  {
    id: "stahl-psycho",
    title: "Stahl's Essential Psychopharmacology",
    author: "Stephen M. Stahl",
    specialty: "Psychiatry",
    level: "PG / Superspecialty",
    description:
      "Visual, mechanism-based guide to psychotropic drugs and rational prescribing.",
    keyTopics: [
      "Antidepressants",
      "Antipsychotics",
      "Mood stabilizers",
      "Receptor pharmacology",
    ],
  },
  {
    id: "oxford-psych",
    title: "Oxford Textbook of Psychiatry",
    author: "Geddes, Andreasen, Goodwin / Editors",
    specialty: "Psychiatry",
    level: "PG / Superspecialty",
    description:
      "Authoritative psychiatry textbook spanning epidemiology, neuroscience, and clinical practice.",
    keyTopics: [
      "Evidence-based psychiatry",
      "Neuroscience",
      "Public mental health",
      "Complex cases",
    ],
  },
  {
    id: "niraj-ahuja",
    title: "Niraj Ahuja - A Short Textbook of Psychiatry",
    author: "Niraj Ahuja",
    specialty: "Psychiatry",
    level: "UG Standard",
    description:
      "Concise Indian undergraduate psychiatry text for rapid learning and exams.",
    keyTopics: [
      "Psychiatric history",
      "Common disorders",
      "MSE",
      "Exam short notes",
    ],
  },
  {
    id: "maudsley",
    title: "The Maudsley Prescribing Guidelines in Psychiatry",
    author: "Taylor, Barnes, Young",
    specialty: "Psychiatry",
    level: "Clinical Manual",
    description:
      "Practical prescribing handbook for psychiatric medications, switching, and special populations.",
    keyTopics: [
      "Dose titration",
      "Switching strategies",
      "Pregnancy & lactation",
      "Side-effect management",
    ],
  },

  // —— Orthopedics ——
  {
    id: "campbell-ortho",
    title: "Campbell's Operative Orthopaedics",
    author: "Azar, Beaty / Editors",
    specialty: "Orthopedics",
    level: "PG / Superspecialty",
    description:
      "Definitive operative orthopedics reference covering techniques across the musculoskeletal system.",
    keyTopics: [
      "Fracture fixation",
      "Joint arthroplasty",
      "Spine surgery",
      "Pediatric orthopedics",
    ],
  },
  {
    id: "apley-solomon",
    title: "Apley & Solomon's System of Orthopaedics and Trauma",
    author: "Blom, Warwick, Whitehouse / Editors",
    specialty: "Orthopedics",
    level: "UG Standard",
    description:
      "System-based orthopedics and trauma text bridging clinical assessment and management.",
    keyTopics: [
      "Trauma principles",
      "Bone & joint infection",
      "Arthritis",
      "Clinical orthopedics",
    ],
  },
  {
    id: "maheshwari-ortho",
    title: "Maheshwari - Essential Orthopaedics",
    author: "J. Maheshwari, Vikram A. Mhaskar",
    specialty: "Orthopedics",
    level: "UG Standard",
    description:
      "Popular Indian undergraduate orthopedics book for fractures, clinics, and exams.",
    keyTopics: [
      "Fracture management",
      "Plaster techniques",
      "Common deformities",
      "Ortho instruments",
    ],
  },
  {
    id: "rockwood-green",
    title: "Rockwood and Green's Fractures in Adults",
    author: "Tornetta, Ricci, Ostrum, McKee, Court-Brown",
    specialty: "Orthopedics",
    level: "PG / Superspecialty",
    description:
      "Authoritative fracture care reference for adult trauma and operative fixation strategies.",
    keyTopics: [
      "Fracture classification",
      "ORIF techniques",
      "Nonunion & malunion",
      "Polytrauma",
    ],
  },
  {
    id: "ebnezar-ortho",
    title: "John Ebnezar - Textbook of Orthopedics",
    author: "John Ebnezar",
    specialty: "Orthopedics",
    level: "UG Standard",
    description:
      "Illustrated orthopedics textbook widely used in Indian medical colleges for UG learning.",
    keyTopics: [
      "Clinical orthopedics",
      "Fractures & dislocations",
      "Rehab basics",
      "Exam cases",
    ],
  },

  // —— Cardiology ——
  {
    id: "braunwald",
    title: "Braunwald's Heart Disease: A Textbook of Cardiovascular Medicine",
    author: "Libby, Bonow, Mann, Tomaselli, Bhatt, Solomon",
    specialty: "Cardiology",
    level: "PG / Superspecialty",
    description:
      "Premier cardiovascular medicine textbook covering ischemic disease, heart failure, and valvular pathology.",
    keyTopics: [
      "Ischemic heart disease",
      "Heart failure",
      "Valvular disease",
      "Arrhythmias",
    ],
  },
  {
    id: "hurst-heart",
    title: "Hurst's The Heart",
    author: "Fuster, Harrington, Narula, Eapen / Editors",
    specialty: "Cardiology",
    level: "PG / Superspecialty",
    description:
      "Comprehensive cardiology text emphasizing pathophysiology, imaging, and clinical decision-making.",
    keyTopics: [
      "Cardiac imaging",
      "Preventive cardiology",
      "Interventional concepts",
      "Cardiomyopathies",
    ],
  },
  {
    id: "esc-cv",
    title: "The ESC Textbook of Cardiovascular Medicine",
    author: "Camm, Lüscher, Maurer, Serruys / ESC",
    specialty: "Cardiology",
    level: "PG / Superspecialty",
    description:
      "European Society of Cardiology textbook aligned with ESC guidelines and practice.",
    keyTopics: [
      "ESC guidelines",
      "Acute coronary syndromes",
      "Hypertension",
      "Cardiovascular prevention",
    ],
  },
  {
    id: "topol-cv",
    title: "Topol - Textbook of Cardiovascular Medicine",
    author: "Topol / Editors",
    specialty: "Cardiology",
    level: "PG / Superspecialty",
    description:
      "Modern cardiovascular medicine reference with strong interventional and evidence-based focus.",
    keyTopics: [
      "Interventional cardiology",
      "Evidence synthesis",
      "Device therapy",
      "Risk stratification",
    ],
  },
  {
    id: "marriott-ecg",
    title: "Marriott's Practical Electrocardiography",
    author: "Wagner, Strauss / Marriott tradition",
    specialty: "Cardiology",
    level: "Clinical Manual",
    description:
      "Practical ECG interpretation manual for bedside and emergency electrocardiography.",
    keyTopics: [
      "ECG basics",
      "Arrhythmia diagnosis",
      "Ischemia patterns",
      "Paced rhythms",
    ],
  },

  // —— Gastroenterology ——
  {
    id: "sleisenger",
    title: "Sleisenger and Fordtran's Gastrointestinal and Liver Disease",
    author: "Feldman, Friedman, Brandt",
    specialty: "Gastroenterology",
    level: "PG / Superspecialty",
    description:
      "Comprehensive GI and hepatology reference covering luminal, pancreatic, and liver disease.",
    keyTopics: [
      "IBD",
      "Liver failure",
      "Pancreatobiliary disease",
      "GI bleeding",
    ],
  },
  {
    id: "yamada-gi",
    title: "Yamada's Textbook of Gastroenterology",
    author: "Podolsky, Camilleri, Fitz, et al.",
    specialty: "Gastroenterology",
    level: "PG / Superspecialty",
    description:
      "In-depth gastroenterology textbook spanning basic science to advanced clinical practice.",
    keyTopics: [
      "Motility disorders",
      "Hepatology",
      "Nutrition",
      "GI oncology",
    ],
  },
  {
    id: "sherlock-liver",
    title: "Sherlock's Diseases of the Liver and Biliary System",
    author: "Dooley, Lok, Garcia-Tsao, Pinzani",
    specialty: "Gastroenterology",
    level: "PG / Superspecialty",
    description:
      "Classic hepatology text on liver pathophysiology, jaundice, cirrhosis, and biliary disease.",
    keyTopics: [
      "Cirrhosis",
      "Viral hepatitis",
      "Portal hypertension",
      "Biliary disease",
    ],
  },
  {
    id: "harrison-gi",
    title: "Harrison's Gastroenterology and Hepatology",
    author: "Longo, Fauci, et al. / Harrison series",
    specialty: "Gastroenterology",
    level: "PG / Superspecialty",
    description:
      "Harrison-derived GI and hepatology volume for focused internal medicine and specialty reading.",
    keyTopics: [
      "Approach to GI symptoms",
      "Malabsorption",
      "Hepatitis",
      "GI infections",
    ],
  },
  {
    id: "cotton-williams",
    title: "Cotton and Williams' Practical Gastrointestinal Endoscopy",
    author: "Cotton, Williams / Editors",
    specialty: "Gastroenterology",
    level: "Clinical Manual",
    description:
      "Hands-on endoscopy manual covering technique, indications, and complication management.",
    keyTopics: [
      "Upper GI endoscopy",
      "Colonoscopy",
      "ERCP basics",
      "Safety & complications",
    ],
  },
];

export const ALL_SPECIALTIES = "All Specialties";

export function getSpecialties(): string[] {
  const set = new Set(medicalBooksDB.map((b) => b.specialty));
  return [ALL_SPECIALTIES, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
}
