// Rule-based health guide for mothers and ASHAs (FR-26). Answers are fixed,
// reviewed text (MoHFW / NHM guidance), never generated, so the bot cannot give
// unsafe advice. Runs fully on the device, so it works offline too.

export const LANGUAGES = { en: 'English', hi: 'हिन्दी' };

const INTENTS = [
  {
    id: 'danger',
    emergency: true,
    keywords: [
      'bleed', 'blood', 'fits', 'convulsion', 'seizure', 'unconscious', 'faint', 'blurred', 'headache', 'swelling',
      'swollen', 'severe pain', 'pain', 'water broke', 'water leaking', 'leaking water', 'baby not moving',
      'baby moving less', 'less movement', 'fever', 'breathless', 'breathing', 'emergency',
      'khoon', 'behosh', 'chakkar', 'dard', 'sujan', 'soojan', 'bukhar', 'saans', 'daura', 'paani gir',
      'खून', 'रक्तस्राव', 'दौरा', 'दौरे', 'बेहोश', 'चक्कर', 'धुंधला', 'सिरदर्द', 'सूजन', 'दर्द', 'पानी जा', 'पानी गिर',
      'बुखार', 'सांस', 'साँस', 'हिल नहीं', 'कम हिल',
    ],
    answer: {
      en: 'These can be danger signs in pregnancy. Do not wait. Call 108 (free ambulance) or go to the nearest hospital now, and tell your ASHA.\n\nDanger signs: bleeding from the vagina, fits, fainting, severe headache or blurred vision, swelling of the face or hands, severe stomach pain, high fever, difficulty breathing, water leaking, or the baby moving less than usual.',
      hi: 'ये गर्भावस्था में खतरे के लक्षण हो सकते हैं। इंतज़ार न करें। अभी 108 (मुफ़्त एम्बुलेंस) पर कॉल करें या नज़दीकी अस्पताल जाएं, और अपनी आशा दीदी को बताएं।\n\nखतरे के लक्षण: योनि से खून आना, दौरे पड़ना, बेहोशी, तेज़ सिरदर्द या धुंधला दिखना, चेहरे या हाथों में सूजन, पेट में तेज़ दर्द, तेज़ बुखार, सांस लेने में तकलीफ़, पानी जाना, या बच्चे का सामान्य से कम हिलना।',
    },
  },
  {
    id: 'checkups',
    keywords: ['checkup', 'check-up', 'check up', 'antenatal', 'anc', 'visit', 'scan', 'ultrasound', 'test', 'mcp card',
      'jaanch', 'janch', 'जांच', 'जाँच', 'चेकअप', 'अल्ट्रासाउंड'],
    answer: {
      en: 'Get at least 4 antenatal check-ups at your Sub-Centre or PHC. Have the first as soon as you know you are pregnant, ideally in the first 12 weeks. At each check-up your BP, weight, Hb and urine are tested and the baby\'s growth is checked. Always carry your MCP (Mother and Child Protection) card.',
      hi: 'कम से कम 4 बार प्रसव-पूर्व जांच (ANC) अपने उपकेंद्र या PHC पर कराएं। पहली जांच गर्भ का पता चलते ही, हो सके तो पहले 12 हफ़्तों में कराएं। हर जांच में BP, वज़न, खून (Hb) और पेशाब की जांच होती है और बच्चे की बढ़त देखी जाती है। अपना MCP कार्ड (जच्चा-बच्चा सुरक्षा कार्ड) हमेशा साथ रखें।',
    },
  },
  {
    id: 'iron',
    keywords: ['iron', 'ifa', 'tablet', 'anaemia', 'anemia', 'haemoglobin', 'hemoglobin', 'hb', 'calcium', 'folic',
      'weak', 'tired', 'khoon ki kami', 'goli', 'kamzori', 'kamjori', 'thakan',
      'आयरन', 'गोली', 'खून की कमी', 'एनीमिया', 'कमज़ोरी', 'कमजोरी', 'थकान', 'कैल्शियम'],
    answer: {
      en: 'Take one iron and folic acid (IFA) tablet every day from the fourth month of pregnancy, for at least 180 days, and continue after delivery as advised. Take it with water or lemon water, not with tea or milk. Black stools are normal. Also take the calcium tablets your ANM gives you, at a different time from iron. Low Hb (anaemia) makes you weak and tired and is risky at delivery, so get your Hb checked.',
      hi: 'गर्भ के चौथे महीने से रोज़ एक आयरन-फोलिक एसिड (IFA) की गोली लें, कम से कम 180 दिन तक, और प्रसव के बाद भी सलाह अनुसार जारी रखें। गोली पानी या नींबू पानी के साथ लें, चाय या दूध के साथ नहीं। काला मल आना सामान्य है। ANM दीदी की दी हुई कैल्शियम की गोलियां भी लें, पर आयरन से अलग समय पर। खून की कमी (एनीमिया) से कमज़ोरी और थकान होती है और प्रसव में खतरा बढ़ता है, इसलिए Hb की जांच कराती रहें।',
    },
  },
  {
    id: 'diet',
    keywords: ['food', 'eat', 'diet', 'nutrition', 'vegetable', 'milk', 'fruit', 'hungry', 'meal', 'vomit', 'nausea',
      'khana', 'khaana', 'bhojan', 'doodh', 'sabzi', 'ulti',
      'खाना', 'भोजन', 'आहार', 'दूध', 'सब्ज़ी', 'सब्जी', 'फल', 'उल्टी', 'जी मिचला'],
    answer: {
      en: 'Eat one extra meal a day during pregnancy. Include green leafy vegetables, dal, milk or curd, eggs or meat if you eat them, seasonal fruit, and jaggery or groundnuts. Use iodised salt and drink plenty of clean water. If you feel sick, eat small meals often.',
      hi: 'गर्भावस्था में रोज़ एक बार अतिरिक्त भोजन करें। हरी पत्तेदार सब्ज़ियां, दाल, दूध या दही, अगर खाती हों तो अंडा या मांस, मौसमी फल, और गुड़ या मूंगफली शामिल करें। आयोडीन वाला नमक इस्तेमाल करें और साफ़ पानी खूब पिएं। जी मिचलाए तो थोड़ा-थोड़ा कई बार खाएं।',
    },
  },
  {
    id: 'vaccine',
    keywords: ['vaccine', 'vaccination', 'td', 'tetanus', 'injection', 'tika', 'teeka', 'टीका', 'टीके', 'टीकाकरण', 'इंजेक्शन'],
    answer: {
      en: 'You need two doses of the Td (tetanus-diphtheria) injection in pregnancy, about 4 weeks apart, given at your check-ups. If you had both doses in a pregnancy in the last 3 years, one booster dose may be enough. It is free at government health centres.',
      hi: 'गर्भावस्था में Td (टिटनेस-डिप्थीरिया) के दो टीके लगते हैं, लगभग 4 हफ़्ते के अंतर पर, जांच के समय। अगर पिछले 3 साल में किसी गर्भावस्था में दोनों टीके लगे थे, तो एक बूस्टर टीका काफ़ी हो सकता है। सरकारी स्वास्थ्य केंद्र पर यह मुफ़्त है।',
    },
  },
  {
    id: 'rest',
    keywords: ['rest', 'sleep', 'work', 'exercise', 'walk', 'lift', 'aaram', 'araam', 'neend', 'kaam',
      'आराम', 'नींद', 'काम', 'सोना', 'टहल'],
    answer: {
      en: 'Rest for about 2 hours during the day and sleep 8 hours at night, lying on your left side. Avoid lifting heavy loads and very hard work. Light walking and normal housework are fine unless your doctor says otherwise.',
      hi: 'दिन में लगभग 2 घंटे आराम करें और रात में 8 घंटे सोएं, बाईं करवट लेकर। भारी वज़न उठाने और बहुत मेहनत वाले काम से बचें। हल्का टहलना और घर का सामान्य काम ठीक है, जब तक डॉक्टर मना न करें।',
    },
  },
  {
    id: 'delivery',
    keywords: ['delivery', 'deliver', 'hospital', 'jsy', 'jssk', 'scheme', 'money', 'free', 'ambulance', 'birth plan',
      'labour', 'labor', 'prasav', 'aspatal', 'yojana', 'paisa',
      'प्रसव', 'डिलीवरी', 'अस्पताल', 'योजना', 'पैसा', 'पैसे', 'एम्बुलेंस', 'मुफ़्त', 'मुफ्त'],
    answer: {
      en: 'Plan to deliver in a hospital. Under JSSK, delivery (including C-section), medicines, tests, food and transport are free at government hospitals, and Janani Suraksha Yojana (JSY) gives cash assistance. Call 102 or 108 for a free ambulance. Plan ahead: choose the hospital, arrange transport and some money, identify a blood donor, and keep your MCP card ready.',
      hi: 'प्रसव अस्पताल में कराने की योजना बनाएं। जननी शिशु सुरक्षा कार्यक्रम (JSSK) के तहत सरकारी अस्पताल में प्रसव (ऑपरेशन सहित), दवाइयां, जांच, भोजन और आना-जाना मुफ़्त है, और जननी सुरक्षा योजना (JSY) में आर्थिक सहायता मिलती है। मुफ़्त एम्बुलेंस के लिए 102 या 108 पर कॉल करें। पहले से तैयारी रखें: अस्पताल तय करें, गाड़ी और कुछ पैसों का इंतज़ाम करें, खून देने वाले को पहचान लें, और MCP कार्ड तैयार रखें।',
    },
  },
  {
    id: 'breastfeeding',
    keywords: ['breastfeed', 'breast feed', 'breast milk', 'colostrum', 'newborn', 'feeding', 'stanpan',
      'स्तनपान', 'माँ का दूध', 'मां का दूध', 'खीस', 'नवजात'],
    answer: {
      en: 'Start breastfeeding within one hour of birth. The first yellow milk (colostrum) protects your baby, so do not throw it away. Give only breast milk for the first 6 months: no water, honey or ghutti.',
      hi: 'जन्म के एक घंटे के अंदर स्तनपान शुरू करें। पहला पीला गाढ़ा दूध (खीस) बच्चे की रक्षा करता है, इसे फेंकें नहीं। पहले 6 महीने सिर्फ़ माँ का दूध दें: पानी, शहद या घुट्टी भी नहीं।',
    },
  },
  {
    id: 'tobacco',
    keywords: ['smoke', 'smoking', 'tobacco', 'alcohol', 'gutka', 'gutkha', 'bidi', 'beedi', 'sharab', 'tambaku',
      'तंबाकू', 'तम्बाकू', 'शराब', 'गुटखा', 'बीड़ी', 'सिगरेट'],
    answer: {
      en: 'Do not smoke, chew tobacco or gutka, or drink alcohol during pregnancy. They can slow your baby\'s growth and cause early birth. Avoid other people\'s smoke too, and take medicines only on a doctor\'s advice.',
      hi: 'गर्भावस्था में बीड़ी-सिगरेट, तंबाकू, गुटखा या शराब का सेवन न करें। इससे बच्चे की बढ़त रुक सकती है और समय से पहले प्रसव हो सकता है। दूसरों के धुएं से भी बचें, और कोई भी दवा सिर्फ़ डॉक्टर की सलाह से लें।',
    },
  },
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'नमस्ते', 'नमस्कार'],
    answer: {
      en: 'Namaste! I am the MaatriCare health guide. Ask me about pregnancy care: danger signs, check-ups, iron tablets, food, vaccines or delivery.',
      hi: 'नमस्ते! मैं मातृकेयर स्वास्थ्य सहायक हूँ। गर्भावस्था की देखभाल के बारे में पूछें: खतरे के लक्षण, जांच, आयरन की गोली, भोजन, टीके या प्रसव।',
    },
  },
  {
    id: 'thanks',
    keywords: ['thank', 'thanks', 'dhanyavad', 'dhanyawad', 'shukriya', 'धन्यवाद', 'शुक्रिया'],
    answer: {
      en: 'You\'re welcome. Take care of yourself and your baby. For any danger sign, call 108 straight away.',
      hi: 'आपका स्वागत है। अपना और अपने बच्चे का ध्यान रखें। कोई भी खतरे का लक्षण दिखे तो तुरंत 108 पर कॉल करें।',
    },
  },
];

const FALLBACK = {
  en: 'Sorry, I did not understand that. I can help with danger signs, check-ups, iron tablets, food, vaccines, rest, delivery and breastfeeding. For anything else, ask your ASHA or call the 104 health helpline.',
  hi: 'माफ़ कीजिए, मैं समझ नहीं पाई। मैं खतरे के लक्षण, जांच, आयरन की गोली, भोजन, टीके, आराम, प्रसव और स्तनपान के बारे में बता सकती हूँ। किसी और सवाल के लिए अपनी आशा दीदी से पूछें या 104 स्वास्थ्य हेल्पलाइन पर कॉल करें।',
};

export const GREETING = INTENTS.find((i) => i.id === 'greeting').answer;

export const SUGGESTIONS = [
  { intent: 'danger', en: 'Danger signs', hi: 'खतरे के लक्षण' },
  { intent: 'checkups', en: 'Check-ups', hi: 'जांच' },
  { intent: 'iron', en: 'Iron tablets', hi: 'आयरन की गोली' },
  { intent: 'diet', en: 'What to eat', hi: 'क्या खाएं' },
  { intent: 'vaccine', en: 'Vaccines', hi: 'टीके' },
  { intent: 'delivery', en: 'Free delivery services', hi: 'मुफ़्त प्रसव सेवाएं' },
];

// Every keyword, longest first, so a specific phrase ("खून की कमी", anaemia) claims
// its words before a shorter one inside it ("खून", bleeding) can.
const KEYWORDS = INTENTS.flatMap((intent) => intent.keywords.map((kw) => ({ kw, intent: intent.id })))
  .sort((a, b) => b.kw.length - a.kw.length);

const isLatin = (s) => /^[\x00-\x7f]+$/.test(s);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matchIntents(text) {
  let rest = ` ${text.toLowerCase().replace(/[?!.,;:।]/g, ' ')} `;
  const hits = new Map();
  for (const { kw, intent } of KEYWORDS) {
    // Latin keywords match at a word start ("bleed" → "bleeding"); 2–3 letter ones only
    // as whole words, so "hi" doesn't fire on "hindi". Devanagari matches anywhere.
    const re = isLatin(kw)
      ? new RegExp(`(?<=[^a-z])${escape(kw)}${kw.length <= 3 ? '(?=[^a-z])' : ''}`, 'g')
      : new RegExp(escape(kw), 'g');
    if (re.test(rest)) {
      hits.set(intent, (hits.get(intent) ?? 0) + 1);
      rest = rest.replace(re, ' ');
    }
  }
  return hits;
}

export const detectLanguage = (text) => (/[ऀ-ॿ]/.test(text) ? 'hi' : null);

/**
 * Answer a question, or a suggestion chip by intent id.
 * Any danger-sign word wins over everything else.
 */
export function reply(input, lang = 'en') {
  const byId = INTENTS.find((i) => i.id === input);
  if (byId) return { intent: byId.id, text: byId.answer[lang], emergency: !!byId.emergency };

  const hits = matchIntents(input);
  if (hits.has('danger')) {
    const danger = INTENTS[0];
    return { intent: 'danger', text: danger.answer[lang], emergency: true };
  }
  let best = null;
  for (const intent of INTENTS) {
    const n = hits.get(intent.id) ?? 0;
    if (n > (best?.n ?? 0)) best = { intent, n };
  }
  if (!best) return { intent: null, text: FALLBACK[lang], emergency: false };
  return { intent: best.intent.id, text: best.intent.answer[lang], emergency: false };
}
