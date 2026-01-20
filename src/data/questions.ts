export interface Question {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export interface TestData {
  title: string;
  description: string;
  questions: Question[];
}

// ========================================
// ADD YOUR QUESTIONS HERE
// ========================================
// To add questions, modify the testData object below
// Each question should have:
// - id: unique number
// - question: the question text
// - options: object with A, B, C, D properties
// - correctAnswer: one of 'A', 'B', 'C', 'D'

export const allTests: TestData[] = [
  { title: "Hindi Language Test", description: "Hindi chapter 12, 13, 14, 15",
    questions: [
      {
        id: 1,
        question: "निम्नलिखित पंक्तियों में कौन सा रस है? 'शोभित कर नवनीत लिए घुटूनी चलत रेनू तन मंडित मुख दधि लेप किए।'",
        options: {
          A: "वीर रस",
          B: "श्रृंगार रस",
          C: "वात्सल्य रस",
          D: "करुण रस"
        },
        correctAnswer: "C"
      },{
id: 2,
question: "रसोत्पत्ति में आश्रय की चेष्टाओं को क्या कहा जाता है?",
options: {
A: "अनुभाव",
B: "विभाव",
C: "अनुभूति",
D: "संचारी"
},
correctAnswer: "A"
},
{
id: 3,
question: "रस संप्रदाय के प्रवर्तक कौन हैं?",
options: {
A: "नंदकेश्वर",
B: "भरत मुनि",
C: "शास्त्री",
D: "कालिदास"
},
correctAnswer: "B"
},
{
id: 4,
question: "रस के कितने अंग होते हैं?",
options: {
A: "2",
B: "3",
C: "4",
D: "5"
},
correctAnswer: "C"
},
{
id: 5,
question: "माधुर्य गुण किस रस में प्रयोग होता है?",
options: {
A: "माधुर्य",
B: "वीरता",
C: "करुणा",
D: "अद्भुत"
},
correctAnswer: "A"
},
{
id: 6,
question: "जगड़ छंद में कितने लघु वर्ण होते हैं?",
options: {
A: "2",
B: "3",
C: "4",
D: "6"
},
correctAnswer: "B"
},
{
id: 7,
question: "जगड़ छंद में कितने गुरु वर्ण होते हैं?",
options: {
A: "11",
B: "12",
C: "14",
D: "15"
},
correctAnswer: "A"
},
{
id: 8,
question: "'मुदित महपति मंदिर आए सेवक सचिव सुमंत बुलाए' इन पंक्तियों में कौन सा अलंकार है?",
options: {
A: "श्लेष अलंकार",
B: "अनुप्रास अलंकार",
C: "उपमा अलंकार",
D: "यमक अलंकार"
},
correctAnswer: "B"
},
{
id: 9,
question: "'सपना सपना समझकर भूल ना जाना' इन पंक्तियों में कौन सा अलंकार है?",
options: {
A: "उपमा",
B: "प्रतीक",
C: "यमक",
D: "अनुप्रास"
},
correctAnswer: "C"
},
{
id: 10,
question: "'नील गगन सा शांत हृदय था सो रहा' इन पंक्तियों में कौन सा अलंकार है?",
options: {
A: "रूपक",
B: "उपमा",
C: "अतिशयोक्ति",
D: "श्लेष"
},
correctAnswer: "B"
},
{
id: 11,
question: "'फूल हसे और कलियां मुस्काएं' में कौन सा अलंकार है?",
options: {
A: "उपमा",
B: "मानवीकरण",
C: "अनुप्रास",
D: "यमक"
},
correctAnswer: "B"
},
{
id: 12,
question: "पदबंध में 'कछुआ धीरे-धीरे चलते हुए मंजिल तक पहुंच गया।' कौन सा पदबंध है?",
options: {
A: "समास",
B: "क्रिया विशेषण पद",
C: "संधि",
D: "तत्पुरुष"
},
correctAnswer: "B"
},
{
id: 13,
question: "संधि में 'अन्वेषण' शब्द का विच्छेद क्या है?",
options: {
A: "अनु + एषण",
B: "अन + वेषण",
C: "अनु + शोध",
D: "अन + शोध"
},
correctAnswer: "A"
},
{
id: 14,
question: "'पंचवटी' शब्द में कौन सा समास है?",
options: {
A: "द्विगु समास",
B: "तत्पुरुष समास",
C: "बहुव्रीहि समास",
D: "कर्मधारय समास"
},
correctAnswer: "A"
},
{
id: 15,
question: "'रोगग्रस्त' शब्द में कौन सा समास है?",
options: {
A: "तत्पुरुष समास",
B: "द्वंद्व समास",
C: "कर्मधारय समास",
D: "बहुव्रीहि समास"
},
correctAnswer: "A"
},
{
id: 16,
question: "'वीरबाला' में कौन सा समास है?",
options: {
A: "तत्पुरुष समास",
B: "द्वंद समास",
C: "कर्मधारय समास",
D: "बहुव्रीहि समास"
},
correctAnswer: "C"
},
{
id: 17,
question: "स्वर के साथ स्वर मिलने से जो विकार होता है उसे क्या कहते हैं?",
options: {
A: "स्वर संधि",
B: "व्यंजन संधि",
C: "विसर्ग संधि",
D: "गुण संधि"
},
correctAnswer: "A"
},
{
id: 18,
question: "'देव जो महान है' किस समास का उदाहरण है?",
options: {
A: "द्वंद्व समास",
B: "कर्मधारय समास",
C: "तत्पुरुष समास",
D: "बहुव्रीहि समास"
},
correctAnswer: "B"
},
{
id: 19,
question: "'नवरात्र' में कौन सा समास होता है?",
options: {
A: "बहुव्रीहि समास",
B: "तत्पुरुष समास",
C: "द्विगु समास",
D: "द्वंद्व समास"
},
correctAnswer: "C"
},
{
id: 20,
question: "प्रसिद्ध ग्रंथ 'नाट्यशास्त्र' के लेखक कौन हैं?",
options: {
A: "भरत मुनि",
B: "भामा",
C: "डंडी",
D: "उद्भट"
},
correctAnswer: "A"
},
{
id: 21,
question: "आनंदवर्धन ने कौन सी रचना की है?",
options: {
A: "ध्वन्यालोक",
B: "काव्य मीमांसा",
C: "काव्यालंकार",
D: "नाट्यशास्त्र"
},
correctAnswer: "A"
},
{
id: 22,
question: "वक्रोक्ति संप्रदाय के प्रवर्तक कौन हैं?",
options: {
A: "भामा",
B: "कुंतक",
C: "आनंदवर्धन",
D: "डंडी"
},
correctAnswer: "B"
},
{
id: 23,
question: "संस्कृत के भट्ट नायक की प्रमुख रचना क्या है?",
options: {
A: "हृदय दर्पण",
B: "रस गंगाधर",
C: "काव्य मीमांसा",
D: "वक्रोक्ति जीवितम"
},
correctAnswer: "A"
},
{
id: 24,
question: "'निरोग' में प्रयुक्त संधि कौन सी है?",
options: {
A: "विसर्ग संधि",
B: "गुण संधि",
C: "दीर्घ संधि",
D: "वृद्धि संधि"
},
correctAnswer: "A"
},
{
id: 25,
question: "किस शब्द में अव्ययीभाव समास नहीं माना जाता?",
options: {
A: "चतुरानन",
B: "चतुर्भुज",
C: "यथा",
D: "प्रति"
},
correctAnswer: "A"
},
{
id: 26,
question: "आप घर जाएंगे या पार्क जाएंगे। यह वाक्य किस प्रकार का है?",
options: {
A: "संयुक्त वाक्य",
B: "मिश्र वाक्य",
C: "सरल वाक्य",
D: "प्रश्नवाचक वाक्य"
},
correctAnswer: "B"
},
{
id: 27,
question: "'गड़े मुर्दे उखाड़ना' मुहावरे का अर्थ क्या है?",
options: {
A: "भूत से डरना",
B: "बात छुपाना",
C: "दबी हुई बात फिर से उभारना",
D: "मुर्दा दफनाना"
},
correctAnswer: "C"
},
{
id: 28,
question: "'सर्वोत्तम' शब्द का संधि विच्छेद क्या है?",
options: {
A: "सर् + उत्तम",
B: "सर्व + उत्तम",
C: "सर्व + उत्ताम",
D: "सर् + उत्ताम"
},
correctAnswer: "B"
},
{
id: 29,
question: "वज्रायुध में कौन-सा समास है?",
options: {
A: "बहुव्रीहि",
B: "द्वंद्व",
C: "द्विगु",
D: "अव्ययीभाव"
},
correctAnswer: "A"
},
{
id: 30,
question: "'अकाउंटेबिलिटी' का सही पारिभाषिक शब्द क्या है?",
options: {
A: "योग्यता",
B: "उत्तरदायित्व",
C: "लेखा शीर्ष",
D: "जवाबदेही"
},
correctAnswer: "B"
}]
  },
{ title: "सामाजिक अध्ययन-D.El.Ed बिहार परीक्षा",description: "Previous Year Objective Questions",
  questions: [
    {
      id: 1,
      question: "‘नीली क्रांति’ किससे संबंधित है?",
      options: {
        A: "सिंचाई",
        B: "मांस उत्पादन",
        C: "कृषि",
        D: "मछली पालन"
      },
      correctAnswer: "D"
    },
    {
      id: 2,
      question: "विश्व व्यापार संगठन (WTO) का मुख्यालय कहाँ है?",
      options: {
        A: "जिनेवा",
        B: "न्यूयॉर्क",
        C: "पेरिस",
        D: "वॉशिंगटन डी.सी."
      },
      correctAnswer: "A"
    },
    {
      id: 3,
      question: "ईसाई धर्म का पवित्र ग्रंथ कौन सा है?",
      options: {
        A: "रामायण",
        B: "गीता",
        C: "बाइबिल",
        D: "कुरान"
      },
      correctAnswer: "C"
    },
    {
      id: 4,
      question: "पुरी (ओडिशा) का सूर्य मंदिर किस शताब्दी में बना था?",
      options: {
        A: "11वीं",
        B: "13वीं",
        C: "15वीं",
        D: "17वीं"
      },
      correctAnswer: "B"
    },
    {
      id: 5,
      question: "यदि राष्ट्रपति व उपराष्ट्रपति दोनों पद रिक्त हों तो कार्यवाहक राष्ट्रपति कौन बनता है?",
      options: {
        A: "प्रधानमंत्री",
        B: "लोकसभा अध्यक्ष",
        C: "मुख्य न्यायाधीश",
        D: "राज्यसभा उपाध्यक्ष"
      },
      correctAnswer: "C"
    },
    {
      id: 6,
      question: "संविधान का भाग III किसका उल्लेख करता है?",
      options: {
        A: "राज्य नीति निदेशक तत्व",
        B: "मौलिक अधिकार",
        C: "प्रधानमंत्री की शक्तियाँ",
        D: "संघ सरकार"
      },
      correctAnswer: "B"
    },
    {
      id: 7,
      question: "बिहार का शोक किस नदी को कहा जाता है?",
      options: {
        A: "गंडक",
        B: "कोसी",
        C: "गंगा",
        D: "सरयू"
      },
      correctAnswer: "B"
    },
    {
      id: 8,
      question: "‘चिपको आंदोलन’ किससे संबंधित था?",
      options: {
        A: "वन संरक्षण",
        B: "जल संरक्षण",
        C: "महिला अधिकार",
        D: "औद्योगिकीकरण"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "भारत में पंचायती राज की शुरुआत सबसे पहले किस राज्य में हुई थी?",
      options: {
        A: "बिहार",
        B: "राजस्थान",
        C: "उत्तर प्रदेश",
        D: "मध्य प्रदेश"
      },
      correctAnswer: "B"
    },
    {
      id: 10,
      question: "बौद्ध धर्म के संस्थापक कौन हैं?",
      options: {
        A: "महावीर",
        B: "गौतम बुद्ध",
        C: "रामकृष्ण परमहंस",
        D: "अशोक"
      },
      correctAnswer: "B"
    },
    {
      id: 11,
      question: "कुंभ मेला विशेष रूप से किस नदी के किनारे आयोजित होता है?",
      options: {
        A: "गंगा",
        B: "यमुना",
        C: "गंडक",
        D: "कोसी"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "सार्क (SAARC) संगठन का मुख्यालय कहाँ है?",
      options: {
        A: "दिल्ली",
        B: "ढाका",
        C: "काठमांडू",
        D: "इस्लामाबाद"
      },
      correctAnswer: "C"
    },
    {
      id: 13,
      question: "दांडी यात्रा आरंभ करने वाले स्वतंत्रता सेनानी कौन थे?",
      options: {
        A: "सुभाष चंद्र बोस",
        B: "भगत सिंह",
        C: "महात्मा गांधी",
        D: "पंडित नेहरू"
      },
      correctAnswer: "C"
    },
    {
      id: 14,
      question: "भारत के वर्तमान चुनाव आयोग के सदस्य कितने होते हैं?",
      options: {
        A: "1",
        B: "2",
        C: "3",
        D: "4"
      },
      correctAnswer: "C"
    },
    {
      id: 15,
      question: "भारतीय संविधान सभा के स्थायी अध्यक्ष कौन थे?",
      options: {
        A: "डॉ राजेंद्र प्रसाद",
        B: "भीम राव अंबेडकर",
        C: "जवाहरलाल नेहरू",
        D: "सरदार पटेल"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "हड़प्पा सभ्यता किस नदी के किनारे स्थित थी?",
      options: {
        A: "गंगा",
        B: "सिंधु",
        C: "कावेरी",
        D: "यमुना"
      },
      correctAnswer: "B"
    },
    {
      id: 17,
      question: "भारत में 'हरित क्रांति' का श्रेय किसे दिया जाता है?",
      options: {
        A: "एम.एस. स्वामीनाथन",
        B: "नॉर्मन बोरलॉग",
        C: "हरगोविंद खुराना",
        D: "सुब्रमण्यम"
      },
      correctAnswer: "A"
    },
    {
      id: 18,
      question: "कोयंबटूर किसे कहा जाता है?",
      options: {
        A: "ईस्ट इंडिया का मैनचेस्टर",
        B: "साउथ इंडिया का मैनचेस्टर",
        C: "नॉर्थ इंडिया का मैनचेस्टर",
        D: "वेस्ट इंडिया का मैनचेस्टर"
      },
      correctAnswer: "B"
    },
    {
      id: 19,
      question: "रामचरितमानस के रचयिता कौन हैं?",
      options: {
        A: "कबीर",
        B: "महात्मा गांधी",
        C: "तुलसीदास",
        D: "रहीम"
      },
      correctAnswer: "C"
    },
    {
      id: 20,
      question: "भारत का सबसे बड़ा राज्य क्षेत्रफल की दृष्टि से कौन सा है?",
      options: {
        A: "उत्तर प्रदेश",
        B: "महाराष्ट्र",
        C: "मध्य प्रदेश",
        D: "राजस्थान"
      },
      correctAnswer: "D"
    }
  ]
},
{title: "Hindi-D.El.Ed Bihar परीक्षा",description: "Previous Year Objective Questions",
  questions: [
    {
      id: 1,
      question: "'दीपावली' का सही संधि-विच्छेद क्या है?",
      options: {
        A: "दीप + आवली",
        B: "दी + पावली",
        C: "दीप + आ + वली",
        D: "दी + प + आ + वली"
      },
      correctAnswer: "A"
    },
    {
      id: 2,
      question: "जब दो या दो से अधिक शब्द अपने अर्थ को बिना बदले एक नए शब्द में बदल जाते हैं, तो इसे क्या कहते हैं?",
      options: {
        A: "उपसर्ग",
        B: "प्रत्यय",
        C: "समास",
        D: "सन्धि"
      },
      correctAnswer: "C"
    },
    {
      id: 3,
      question: "जलधि में कौन सा समास है?",
      options: {
        A: "कर्मधारय",
        B: "अव्ययीभाव",
        C: "द्विगु",
        D: "तत्पुरुष"
      },
      correctAnswer: "D"
    },
    {
      id: 4,
      question: "शब्द 'कमजोरी' में कौन सा शब्द शक्ति है?",
      options: {
        A: "कमजोरी",
        B: "प्रमाणित करना",
        C: "कमजोर",
        D: "शक्ति"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "'पढ़ाई' शब्द में कौन सा तत्सम है?",
      options: {
        A: "कार्य",
        B: "शिक्षा",
        C: "पढ़ाई",
        D: "विद्या"
      },
      correctAnswer: "B"
    },
    {
      id: 6,
      question: "'वह घर जा रहे हैं।' वाक्य किस प्रकार का है?",
      options: {
        A: "सरल वाक्य",
        B: "मिश्र वाक्य",
        C: "संयुक्त वाक्य",
        D: "प्रश्नवाचक वाक्य"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "‘क्रिया विशेषण पदबंध’ क्या होता है?",
      options: {
        A: "संज्ञा पदबंध",
        B: "क्रिया विशेषण पदबंध",
        C: "विशेषण पदबंध",
        D: "क्रिया पदबंध"
      },
      correctAnswer: "B"
    },
    {
      id: 8,
      question: "'राकेश नहीं रोता है।' वाक्य का कौन सा रूप है?",
      options: {
        A: "कर्तृवाच्य",
        B: "भाववाच्य",
        C: "कर्मवाच्य",
        D: "सत्विकवाच्य"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "'अभिधा' का क्या अर्थ होता है?",
      options: {
        A: "शब्द का अर्थ",
        B: "शब्द का उच्चारण",
        C: "भावार्थ",
        D: "शब्द की शक्ति"
      },
      correctAnswer: "A"
    },
    {
      id: 10,
      question: "‘व्यंजना’ शब्द के अंतर्गत क्या आता है?",
      options: {
        A: "शाब्दिक अर्थ",
        B: "छुपा हुआ अर्थ",
        C: "सामान्य अर्थ",
        D: "विरोधाभास"
      },
      correctAnswer: "B"
    },
    {
      id: 11,
      question: "'रूपक अलंकार' का क्या अर्थ है?",
      options: {
        A: "प्रत्यक्ष अर्थ",
        B: "अप्रत्यक्ष अर्थ",
        C: "प्रतीकात्मक अर्थ",
        D: "विरोधाभास"
      },
      correctAnswer: "B"
    },
    {
      id: 12,
      question: "'अतिशयोक्ति' किस अलंकार का नाम है?",
      options: {
        A: "अधोमुखी अलंकार",
        B: "अधिग्रहण अलंकार",
        C: "बहुलता या अधिकता का बोध कराना",
        D: "बहुता का विरोध"
      },
      correctAnswer: "C"
    },
    {
      id: 13,
      question: "'संज्ञा पदबंध' का उदाहरण कौन सा है?",
      options: {
        A: "लाल रंग",
        B: "खेलता हुआ बच्चा",
        C: "सीता की बहन",
        D: "सुंदर फूल"
      },
      correctAnswer: "C"
    },
    {
      id: 14,
      question: "'व्याकरण में क्रिया किसे कहते हैं?'",
      options: {
        A: "शब्द जो कार्य दर्शाते हैं",
        B: "नाम के लिए शब्द",
        C: "विशेषण शब्द",
        D: "संज्ञा शब्द"
      },
      correctAnswer: "A"
    },
    {
      id: 15,
      question: "'वाक्य में कर्ता कौन होता है?'",
      options: {
        A: "जो क्रिया करता है",
        B: "जिस पर क्रिया होती है",
        C: "कर्म",
        D: "क्रिया"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "'संधि विच्छेद क्या होता है?'",
      options: {
        A: "दो शब्दों को मिलाना",
        B: "दो शब्दों को अलग करना",
        C: "दो वाक्यों को मिलाना",
        D: "दो वाक्यों को अलग करना"
      },
      correctAnswer: "B"
    },
    {
      id: 17,
      question: "'कर्मधारय समास' किसे कहते हैं?",
      options: {
        A: "दो शब्द जो समानार्थक हों",
        B: "दो शब्द जो एक दूसरे के विशेषण हों",
        C: "दो शब्द जो क्रिया-संबंधित हों",
        D: "दो शब्द जो विलोम अर्थ दर्शाएं"
      },
      correctAnswer: "B"
    },
    {
      id: 18,
      question: "'द्वंद्व समास' में क्या विशेषता होती है?",
      options: {
        A: "दो समान वर्ग के शब्द मिलते हैं",
        B: "दो विरोधी अर्थ के शब्द जुड़ते हैं",
        C: "दो विशेषण शब्द",
        D: "दो क्रिया शब्द"
      },
      correctAnswer: "B"
    },
    {
      id: 19,
      question: "'पदार्थ के गुणों का वर्णन किस प्रकार के शब्दों से होता है?'",
      options: {
        A: "संज्ञा",
        B: "विशेषण",
        C: "क्रिया",
        D: "अव्यय"
      },
      correctAnswer: "B"
    },
    {
      id: 20,
      question: "'विराम चिन्हों में कौन सा चिन्ह प्रश्नवाचक वाक्य के अंत में आता है?'",
      options: {
        A: "पूर्ण विराम",
        B: "कोमा",
        C: "प्रश्न चिन्ह",
        D: "दोबरा बिंदी"
      },
      correctAnswer: "C"
    },
    {
      id: 21,
      question: "'मौखिक संचार में कौन-सा माध्यम मुख्य होता है?'",
      options: {
        A: "संदेश",
        B: "शब्द",
        C: "संकेत",
        D: "लिपि"
      },
      correctAnswer: "B"
    },
    {
      id: 22,
      question: "'शब्द के प्रकारों में कौन सा शब्द सबसे छोटा होता है?'",
      options: {
        A: "संज्ञा",
        B: "विशेषण",
        C: "अव्यय",
        D: "पर्यायवाची"
      },
      correctAnswer: "C"
    },
    {
      id: 23,
      question: "'समास लगाते समय किस नियम का पालन करना जरूरी होता है?'",
      options: {
        A: "दो शब्दों का मिलन",
        B: "शब्दों के अर्थ का अनुकूल होना",
        C: "वाक्य में सही स्थान",
        D: "शब्दों की संधि"
      },
      correctAnswer: "B"
    },
    {
      id: 24,
      question: "'काव्य में मुख्य भेद कितने होते हैं?'",
      options: {
        A: "3",
        B: "5",
        C: "6",
        D: "7"
      },
      correctAnswer: "C"
    },
    {
      id: 25,
      question: "'अलंकार किसे कहते हैं?'",
      options: {
        A: "शब्दों की सजावट",
        B: "छंद",
        C: "रूपक",
        D: "काव्य में सुंदरता"
      },
      correctAnswer: "D"
    }
  ]
},
{title: "General English - D.El.Ed Bihar परीक्षा",description: "Previous Year Objective Questions",
  questions: [
    {
      id: 1,
      question: "Direct Speech को Indirect Speech में बदलिए: Direct - ‘Why didn’t you attend the meeting?’ she asked.",
      options: {
        A: "didn’t",
        B: "hadn’t",
        C: "don’t",
        D: "haven’t"
      },
      correctAnswer: "B"
    },
    {
      id: 2,
      question: "Direct Speech को Indirect Speech में बदलिए: Direct – ‘I will help you with your homework,’ she said to him.",
      options: {
        A: "promised / would",
        B: "advised / will",
        C: "asked / would",
        D: "told / could"
      },
      correctAnswer: "A"
    },
    {
      id: 3,
      question: "Choose the correct sentence.",
      options: {
        A: "I bought apples, oranges and bananas.",
        B: "I bought apples, oranges, and bananas.",
        C: "I bought apples oranges and bananas.",
        D: "I bought apples oranges and bananas."
      },
      correctAnswer: "B"
    },
    {
      id: 4,
      question: "Identify the plural form of ‘brother-in-law’",
      options: {
        A: "brothers-in-law",
        B: "brother-in-laws",
        C: "brothers-in-law’s",
        D: "brothers-in-law’s"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "Choose the correct sentence.",
      options: {
        A: "The manager said, 'We need to finish the report by Monday.'",
        B: "The manager said, 'We need finish the report by Monday.'",
        C: "The manager said, 'We need to finishing the report by Monday.'",
        D: "The manager said, 'We need to finished the report by Monday.'"
      },
      correctAnswer: "A"
    },
    {
      id: 6,
      question: "Choose the correct synonym for 'happy'.",
      options: {
        A: "sad",
        B: "joyful",
        C: "angry",
        D: "tired"
      },
      correctAnswer: "B"
    },
    {
      id: 7,
      question: "Fill in the blank: She _____ to the market yesterday.",
      options: {
        A: "go",
        B: "went",
        C: "gone",
        D: "going"
      },
      correctAnswer: "B"
    },
    {
      id: 8,
      question: "What is the opposite of 'always'?",
      options: {
        A: "never",
        B: "sometimes",
        C: "often",
        D: "seldom"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "Identify the correct question tag: You are coming, _____?",
      options: {
        A: "isn’t it",
        B: "aren’t you",
        C: "don’t you",
        D: "doesn’t he"
      },
      correctAnswer: "B"
    },
    {
      id: 10,
      question: "Choose the correct preposition: She is fond _____ music.",
      options: {
        A: "of",
        B: "for",
        C: "to",
        D: "by"
      },
      correctAnswer: "A"
    },
    {
      id: 11,
      question: "Select the correct form of verb: They _____ playing cricket now.",
      options: {
        A: "is",
        B: "are",
        C: "am",
        D: "was"
      },
      correctAnswer: "B"
    },
    {
      id: 12,
      question: "Choose the correct plural form of 'child'.",
      options: {
        A: "childs",
        B: "childes",
        C: "children",
        D: "childrens"
      },
      correctAnswer: "C"
    },
    {
      id: 13,
      question: "Which word is an adjective in the sentence: She has a beautiful dress.",
      options: {
        A: "She",
        B: "has",
        C: "beautiful",
        D: "dress"
      },
      correctAnswer: "C"
    },
    {
      id: 14,
      question: "Select the correct sentence.",
      options: {
        A: "He don’t like ice cream.",
        B: "He doesn’t likes ice cream.",
        C: "He don’t likes ice cream.",
        D: "He doesn’t like ice cream."
      },
      correctAnswer: "D"
    },
    {
      id: 15,
      question: "Fill in the blank: I have _____ apple in my bag.",
      options: {
        A: "an",
        B: "a",
        C: "the",
        D: "some"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "Choose the correct synonym of 'fast'.",
      options: {
        A: "slow",
        B: "quick",
        C: "weak",
        D: "lazy"
      },
      correctAnswer: "B"
    },
    {
      id: 17,
      question: "Rewrite in passive voice: She writes a letter.",
      options: {
        A: "A letter is written by her.",
        B: "A letter was written by her.",
        C: "A letter wrote by her.",
        D: "She was written a letter."
      },
      correctAnswer: "A"
    },
    {
      id: 18,
      question: "Find the error: She can sings very well.",
      options: {
        A: "She",
        B: "can",
        C: "sings",
        D: "very well"
      },
      correctAnswer: "C"
    },
    {
      id: 19,
      question: "Identify the correct order of words: He / to school / goes / every day.",
      options: {
        A: "He goes to school every day.",
        B: "To school he goes every day.",
        C: "Every day he goes to school.",
        D: "He every day goes to school."
      },
      correctAnswer: "A"
    },
    {
      id: 20,
      question: "Choose the correct article: ____ elephant is the largest land animal.",
      options: {
        A: "A",
        B: "An",
        C: "The",
        D: "Some"
      },
      correctAnswer: "B"
    }
  ]
},
{title: "Science - D.El.Ed Bihar परीक्षा",description: "Previous Year Objective Questions",
  questions: [
    {
      id: 1,
      question: "ध्वनि तरंगों की विशेषताएँ कौन-कौन सी हैं?",
      options: {
        A: "आयाम और आवृत्ति",
        B: "तरंगदैর্ঘ्य और गति",
        C: "परावर्तन और अपवर्तन",
        D: "विकिरण और हस्तक्षेप"
      },
      correctAnswer: "A"
    },
    {
      id: 2,
      question: "आवृत्ति की माप की इकाई क्या है?",
      options: {
        A: "डेसीबल",
        B: "हर्ट्ज़",
        C: "वाट",
        D: "पास्कल"
      },
      correctAnswer: "B"
    },
    {
      id: 3,
      question: "दालें मुख्य रूप से किस पोषक तत्व की समृद्ध स्रोत हैं?",
      options: {
        A: "कार्बोहाइड्रेट",
        B: "प्रोटीन",
        C: "खनिज",
        D: "विटामिन ए"
      },
      correctAnswer: "B"
    },
    {
      id: 4,
      question: "पौधे की कोशिका की भित्ति किससे बनी होती है?",
      options: {
        A: "सेल्युलोज़",
        B: "ग्लूकोज",
        C: "सुक्रोज़",
        D: "फ्रुक्टोज़"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "फफूंदी का अध्ययन किस विज्ञान के अंतर्गत आता है?",
      options: {
        A: "कोशिका विज्ञान",
        B: "मायोलॉजी",
        C: "माइकोलॉजी",
        D: "तंत्रिका विज्ञान"
      },
      correctAnswer: "C"
    },
    {
      id: 6,
      question: "स्टार्च की खोज किसने की थी?",
      options: {
        A: "एंथनी वॉन लीवेनहॉक",
        B: "जेफ्री हार्टवे",
        C: "इसाक न्यूटन",
        D: "नोबल पुरस्कार विजेता"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "ऊर्जा के संरक्षण का नियम क्या कहता है?",
      options: {
        A: "ऊर्जा न तो बनाई जा सकती है, न नष्ट",
        B: "ऊर्जा हमेशा बढ़ती है",
        C: "ऊर्जा संचित नहीं हो सकती",
        D: "ऊर्जा केवल नष्ट हो सकती है"
      },
      correctAnswer: "A"
    },
    {
      id: 8,
      question: "घर्षण बल क्या करता है?",
      options: {
        A: "गतिवर्धन करता है",
        B: "गति को रोकता है",
        C: "गति को बढ़ाता है",
        D: "बल को कम करता है"
      },
      correctAnswer: "B"
    },
    {
      id: 9,
      question: "विद्युत धारा की इकाई क्या है?",
      options: {
        A: "वोल्ट",
        B: "अंपियर",
        C: "ओम",
        D: "वाट"
      },
      correctAnswer: "B"
    },
    {
      id: 10,
      question: "सौर ऊर्जा का स्रोत क्या है?",
      options: {
        A: "पृथ्वी",
        B: "चंद्रमा",
        C: "सूरज",
        D: "तारा"
      },
      correctAnswer: "C"
    },
    {
      id: 11,
      question: "श्वसन की क्रिया में ऑक्सीजन का क्या काम होता है?",
      options: {
        A: "ऊर्जा उत्पादन",
        B: "कार्बन डाइऑक्साइड उत्पन्न करना",
        C: "शरीर को ठंडा रखना",
        D: "पाचन क्रिया में सहायता"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "मनुष्य का रक्त कितना प्रतिशत पानी होता है?",
      options: {
        A: "90%",
        B: "80%",
        C: "60%",
        D: "70%"
      },
      correctAnswer: "D"
    },
    {
      id: 13,
      question: "पानी का उबालने का तापमान क्या होता है?",
      options: {
        A: "90°C",
        B: "100°C",
        C: "80°C",
        D: "110°C"
      },
      correctAnswer: "B"
    },
    {
      id: 14,
      question: "कोशिका के अंदर कौन सा अंग केंद्रक को नियंत्रित करता है?",
      options: {
        A: "माइटोकॉण्ड्रिया",
        B: "राइबोसोम",
        C: "न्यूक्लियस",
        D: "लाइसोसोम"
      },
      correctAnswer: "C"
    },
    {
      id: 15,
      question: "पृथ्वी की परतों में सबसे बाहरी परत कौन सी है?",
      options: {
        A: "मैंटल",
        B: "कोर",
        C: "क्रस्ट",
        D: "एटमास्फीयर"
      },
      correctAnswer: "C"
    },
    {
      id: 16,
      question: "रासायनिक प्रतिक्रिया के दौरान ऊर्जा कैसे प्रकट होती है?",
      options: {
        A: "सदा ऊर्जा अवशोषित होती है",
        B: "सदा ऊर्जा मुक्त होती है",
        C: "ऊर्जा अवशोषित या मुक्त हो सकती है",
        D: "ऊर्जा स्थिर रहती है"
      },
      correctAnswer: "C"
    },
    {
      id: 17,
      question: "पृथ्वी किस प्रकार की क्रिया करती है?",
      options: {
        A: "अपवर्तन",
        B: "पृथ्वी की परिक्रमा",
        C: "आवर्ती",
        D: "संकुचन"
      },
      correctAnswer: "B"
    },
    {
      id: 18,
      question: "मूत्र पदार्थ किस अंग द्वारा शरीर से बाहर निकाला जाता है?",
      options: {
        A: "गुर्दे",
        B: "यकृत",
        C: "पित्ताशय",
        D: "स्नायु"
      },
      correctAnswer: "A"
    },
    {
      id: 19,
      question: "प्रकाश किस माध्यम में सबसे तेज गति से चलता है?",
      options: {
        A: "पानी",
        B: "वायु",
        C: "कांच",
        D: "खाली जगह"
      },
      correctAnswer: "D"
    },
    {
      id: 20,
      question: "उर्जा के कायांतरण में कौन सा नियम लागू होता है?",
      options: {
        A: "ऊर्जा संरक्षण नियम",
        B: "गुरुत्वाकर्षण नियम",
        C: "न्यूटन का दूसरा नियम",
        D: "परिणाम नियम"
      },
      correctAnswer: "A"
    }
  ]
},
{title: "Mathematics-D.El.Ed Bihar परीक्षा",description: "Previous Year Objective Questions",
  questions: [
    {
      id: 1,
      question: "दो साल पहले रहीम और करीम की आयु के बीच अनुपात 3:2 था तथा वर्तमान में यह अनुपात 7:5 है। करीम की वर्तमान आयु ज्ञात कीजिए।",
      options: {
        A: "16 वर्ष",
        B: "12 वर्ष",
        C: "14 वर्ष",
        D: "10 वर्ष"
      },
      correctAnswer: "D"
    },
    {
      id: 2,
      question: "एक आदमी 5 वर्ष के लिए 10% वार्षिक दर से 1000 रुपये का निवेश करता है। भुगतान किए जाने वाले ब्याज की गणना कीजिए।",
      options: {
        A: "500 रुपए",
        B: "450 रुपए",
        C: "550 रुपए",
        D: "600 रुपए"
      },
      correctAnswer: "A"
    },
    {
      id: 3,
      question: "दो कोण बराबर हैं। तीसरा कोण उन दोनों से 30° कम है। प्रत्येक कोण ज्ञात कीजिए।",
      options: {
        A: "70°, 70°, 40°",
        B: "60°, 60°, 60°",
        C: "50°, 50°, 80°",
        D: "80°, 80°, 20°"
      },
      correctAnswer: "A"
    },
    {
      id: 4,
      question: "0.3555... दशमलव के रूप में लिखे भिन्न का प्रतिनिधित्व करे।",
      options: {
        A: "16/45",
        B: "32/90",
        C: "15/45",
        D: "17/50"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "यदि दो संख्याओं का अनुपात 7:11 है तथा उनका HCF 13 है, तो उनकी LCM क्या होगी?",
      options: {
        A: "1001",
        B: "1010",
        C: "900",
        D: "975"
      },
      correctAnswer: "A"
    },
    {
      id: 6,
      question: "सीढ़ी की लम्बाई ज्ञात करें यदि झुकाव कोण 45° और दीवार से दूरी 8 मीटर हो।",
      options: {
        A: "8 मीटर",
        B: "12 मीटर",
        C: "10 मीटर",
        D: "7 मीटर"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "साधारण ब्याज का सूत्र क्या है?",
      options: {
        A: "P×R×T / 100",
        B: "P+R+T",
        C: "P×R / T",
        D: "P+R×T"
      },
      correctAnswer: "A"
    },
    {
      id: 8,
      question: "रेखीय समीकरण 2x + 3y = 7 का कोई हल कौन सा हो सकता है?",
      options: {
        A: "(1,1)",
        B: "(2,3)",
        C: "(3,1)",
        D: "(0,0)"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "लघुगुणक को हिंदी में क्या कहा जाता है?",
      options: {
        A: "मूल",
        B: "वार्षिकी",
        C: "संयोजक",
        D: "वर्गमूल"
      },
      correctAnswer: "D"
    },
    {
      id: 10,
      question: "एक त्रिभुज की तीनों भुजाएँ क्रमशः 3 सेमी, 4 सेमी, और 5 सेमी हैं। इसका क्षेत्रफल ज्ञात करें।",
      options: {
        A: "6 वर्ग सेमी",
        B: "7 वर्ग सेमी",
        C: "8 वर्ग सेमी",
        D: "5 वर्ग सेमी"
      },
      correctAnswer: "A"
    },
    {
      id: 11,
      question: "2 का वर्गमूल क्या है?",
      options: {
        A: "1.4",
        B: "1.5",
        C: "1.3",
        D: "1.6"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "दो संख्याओं का योग 45 है एवं उनका अनुपात 2:3 है। संख्याएँ ज्ञात कीजिए।",
      options: {
        A: "18, 27",
        B: "15, 30",
        C: "12, 33",
        D: "20, 25"
      },
      correctAnswer: "A"
    },
    {
      id: 13,
      question: "प्रत्येक कोण 90° है, एक त्रिभुज क्या कहलाता है?",
      options: {
        A: "समद्विबाहु",
        B: "समकोण",
        C: "समभुज",
        D: "असमकोण"
      },
      correctAnswer: "B"
    },
    {
      id: 14,
      question: "2 की घात 4 क्या होगी?",
      options: {
        A: "8",
        B: "16",
        C: "12",
        D: "6"
      },
      correctAnswer: "B"
    },
    {
      id: 15,
      question: "शतांश में 25 प्रतिशत का मान क्या होगा?",
      options: {
        A: "0.025",
        B: "0.25",
        C: "2.5",
        D: "25"
      },
      correctAnswer: "B"
    },
    {
      id: 16,
      question: "100 रुपये 2 वर्षों के लिए 5% वार्षिक ब्याज दर पर निवेश किए। सरल ब्याज क्या होगा?",
      options: {
        A: "10",
        B: "12",
        C: "15",
        D: "20"
      },
      correctAnswer: "A"
    },
    {
      id: 17,
      question: "एक संख्या के 30% के बराबर 90 है। उस संख्या का मान क्या है?",
      options: {
        A: "300",
        B: "270",
        C: "330",
        D: "350"
      },
      correctAnswer: "A"
    },
    {
      id: 18,
      question: "60 का 25% कितना होगा?",
      options: {
        A: "12",
        B: "15",
        C: "18",
        D: "20"
      },
      correctAnswer: "A"
    },
    {
      id: 19,
      question: "एक घन के सभी भुजाओं की लंबाई 3 सेमी है। इसका आयतन ज्ञात करें।",
      options: {
        A: "27 घन सेमी",
        B: "18 घन सेमी",
        C: "9 घन सेमी",
        D: "36 घन सेमी"
      },
      correctAnswer: "A"
    },
    {
      id: 20,
      question: "24 को 6 से भाग देने पर क्या प्राप्त होगा?",
      options: {
        A: "4",
        B: "6",
        C: "3",
        D: "5"
      },
      correctAnswer: "A"
    },
    {
      id: 21,
      question: "2, 4, 6, 8, ... इस अनुक्रम की अगली संख्या क्या होगी?",
      options: {
        A: "10",
        B: "12",
        C: "11",
        D: "9"
      },
      correctAnswer: "A"
    },
    {
      id: 22,
      question: "π का मान कितना है (लगभग)?",
      options: {
        A: "3.14",
        B: "3.15",
        C: "3.16",
        D: "3.12"
      },
      correctAnswer: "A"
    },
    {
      id: 23,
      question: "8 का वर्गमूल कितना होगा?",
      options: {
        A: "2.83",
        B: "2.73",
        C: "2.63",
        D: "2.89"
      },
      correctAnswer: "A"
    },
    {
      id: 24,
      question: "प्रत्येक वर्ष 6% दर से पूंजी कितनी होगी यदि मूलधन 10000 है?",
      options: {
        A: "10600",
        B: "10650",
        C: "10300",
        D: "10500"
      },
      correctAnswer: "A"
    },
    {
      id: 25,
      question: "एक आयत की लंबाई 5 सेमी और चौड़ाई 3 सेमी है। इसका क्षेत्रफल क्या होगा?",
      options: {
        A: "15 वर्ग सेमी",
        B: "16 वर्ग सेमी",
        C: "18 वर्ग सेमी",
        D: "20 वर्ग सेमी"
      },
      correctAnswer: "A"
    }
  ]
},
{title: "Reasoning - D.El.Ed Bihar परीक्षा",description: "Previous Year Objective Questions",
  questions: [
    {
      id: 1,
      question: "एक निश्चित कोड भाषा में, '479' का अर्थ है 'fruit is sweet', '248' का अर्थ है 'very sweet voice' और '637' का अर्थ है 'eat fruit daily'. 'is' का कोड क्या है?",
      options: {
        A: "7",
        B: "9",
        C: "4",
        D: "8"
      },
      correctAnswer: "B"
    },
    {
      id: 2,
      question: "निम्नलिखित आकृति श्रृंखला में प्रश्नचिन्ह (?) के स्थान पर कौन-सी आकृति आएगी?",
      options: {
        A: "आकार 1",
        B: "आकार 2",
        C: "आकार 3",
        D: "आकार 4"
      },
      correctAnswer: "A"
    },
    {
      id: 3,
      question: "सात व्यक्ति A, B, C, D, E, F, और G एक पंक्ति में उत्तर की ओर बैठे हैं। G और E के बीच केवल 5 व्यक्ति हैं। F, G और A के पड़ोसी हैं। A के दाईं ओर केवल 4 व्यक्ति हैं। पंक्ति के सबसे बाएं कौन बैठा है?",
      options: {
        A: "A",
        B: "E",
        C: "G",
        D: "F"
      },
      correctAnswer: "C"
    },
    {
      id: 4,
      question: "पुष्पा ने एक आदमी की ओर इंगित करते हुए कहा, 'वह मेरे पिता की पत्नी के ससुर हैं।' पुष्पा उस व्यक्ति से कैसे संबंधित है?",
      options: {
        A: "पुत्री",
        B: "पत्नि",
        C: "पौत्री",
        D: "बहन"
      },
      correctAnswer: "C"
    },
    {
      id: 5,
      question: "'LEUCOMA' शब्द के अक्षरों को वर्णानुक्रम में सजाने पर बाएं से तीसरे और दाएं से दूसरे अक्षरों के बीच कितने अक्षर आते हैं?",
      options: {
        A: "7",
        B: "8",
        C: "9",
        D: "10"
      },
      correctAnswer: "C"
    },
    {
      id: 6,
      question: "चित्रा एक रिसॉर्ट से शुरू होकर 15 किमी पश्चिम की ओर चली, फिर बाएँ मुड़ी और 115 किमी चली। फिर दाएँ मुड़ी और 25 किमी चली। फिर दाएँ मुड़ी और 90 किमी चली। अंत में दाएँ मुड़ी और 40 किमी चली। रिसॉर्ट से घर की दूरी क्या होगी?",
      options: {
        A: "25 किमी",
        B: "30 किमी",
        C: "40 किमी",
        D: "50 किमी"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "एक श्रृंखला 3, 7, 11, 15, ... है। अगला अंक क्या होगा?",
      options: {
        A: "18",
        B: "19",
        C: "20",
        D: "21"
      },
      correctAnswer: "D"
    },
    {
      id: 8,
      question: "यदि 45 की 20% घटाई जाए तो परिणाम क्या होगा?",
      options: {
        A: "36",
        B: "35",
        C: "34",
        D: "33"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "दो संख्याओं का योग 50 है और उनका अनुपात 3:2 है। बड़ी संख्या क्या होगी?",
      options: {
        A: "30",
        B: "20",
        C: "25",
        D: "35"
      },
      correctAnswer: "A"
    },
    {
      id: 10,
      question: "A से B जाने में 15 मिनट लगते हैं, और B से C जाने में 20 मिनट लगते हैं। यदि A से C जाने में कुल 30 मिनट लगते हैं, तो A, B और C किस त्रिज्या में स्थित हैं?",
      options: {
        A: "लाइन में",
        B: "त्रिभुज बनाते हैं",
        C: "किसी वृत्त की परिधि पर",
        D: "कोई संबंध नहीं"
      },
      correctAnswer: "A"
    }
  ]
},
{title: "Hindi Alankar and Chhand - Bihar D.El.Ed Preparation",description: "Hindi poetry, Alankar, and Chhand test",
  questions: [
    {
      id: 1,
      question: "जहां उपमेय में उपमान की संभावना की जाए वहां क्या अलंकार होता है?",
      options: {
        A: "उत्प्रेक्षा",
        B: "भ्रांतिमान",
        C: "यमक",
        D: "रूपक"
      },
      correctAnswer: "A"
    },
    {
      id: 2,
      question: "प्रीति नदी में पायूं ना बोरियों इन पंक्ति में कौन सा अलंकार है?",
      options: {
        A: "यमक",
        B: "उत्प्रेक्षा",
        C: "उपमा",
        D: "रूपक"
      },
      correctAnswer: "D"
    },
    {
      id: 3,
      question: "छंद शब्द संस्कृत के किस धातु से बना है?",
      options: {
        A: "छिरी",
        B: "छिदी",
        C: "छन्द",
        D: "छाया"
      },
      correctAnswer: "A"
    },
    {
      id: 4,
      question: "मनहु विधि तन अक्ष का छवि स्वच्छ राखवे काज में कौन सा अलंकार होता है?",
      options: {
        A: "उत्प्रेक्षा",
        B: "रूपक",
        C: "उपमा",
        D: "विरोधाभास"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "कांटे ना कटत रात मारी में कौन सा अलंकार होता है?",
      options: {
        A: "विरोधाभास",
        B: "उत्प्रेक्षा",
        C: "उपमा",
        D: "रूपक"
      },
      correctAnswer: "B"
    },
    {
      id: 6,
      question: "वंशस्थ क्या है?",
      options: {
        A: "संदर्भित शब्द",
        B: "व्यक्ति का नाम",
        C: "परिपाटी अनुसार स्थायी होना",
        D: "अलंकार की एक विधा"
      },
      correctAnswer: "C"
    },
    {
      id: 7,
      question: "माया महा ठग्निह हम जानी पंक्तियों में कौन सा अलंकार होता है?",
      options: {
        A: "विरोधाभास",
        B: "उत्प्रेक्षा",
        C: "उपमा",
        D: "रूपक"
      },
      correctAnswer: "B"
    },
    {
      id: 8,
      question: "पद्मावती सब सखी बुलाई इन पंक्तियों में कौन सा अलंकार होता है?",
      options: {
        A: "विरोधाभास",
        B: "उत्प्रेक्षा",
        C: "उपमा",
        D: "रूपक"
      },
      correctAnswer: "B"
    },
    {
      id: 9,
      question: "जब एक ही शब्द दो या दो से अधिक बार आए और अर्थ हर बार भिन्न हो तो कौन सा अलंकार होता है?",
      options: {
        A: "विरोधाभास",
        B: "उत्प्रेक्षा",
        C: "उपमा",
        D: "रूपक"
      },
      correctAnswer: "C"
    },
    {
      id: 10,
      question: "उसकी मुस्कान धूप की तरह उज्जवल है, इसमें कौन सा अलंकार है?",
      options: {
        A: "विरोधाभास",
        B: "उत्प्रेक्षा",
        C: "उपमा",
        D: "रूपक"
      },
      correctAnswer: "C"
    },
    {
      id: 11,
      question: "जीवन को चंचल सरिता में फेंकी मैंने मन की जाली में कौन सा अलंकार होता है?",
      options: {
        A: "उत्प्रेक्षा",
        B: "रूपक",
        C: "यमक",
        D: "अनुप्रास"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "रूपक अलंकार की परिभाषा क्या है?",
      options: {
        A: "दो भिन्न वस्तुओं की समानता",
        B: "एक शब्द का बार-बार आना",
        C: "अर्थ में विरोध",
        D: "अक्षर दोहराना"
      },
      correctAnswer: "A"
    },
    {
      id: 13,
      question: "विरोधाभास अलंकार का एक उदाहरण बताइए?",
      options: {
        A: "उत्प्रेक्षा",
        B: "यमक",
        C: "रूपक",
        D: "उपमा"
      },
      correctAnswer: "A"
    },
    {
      id: 14,
      question: "अनुप्रास अलंकार के कितने भेद होते हैं?",
      options: {
        A: "3",
        B: "4",
        C: "5",
        D: "पांच"
      },
      correctAnswer: "D"
    },
    {
      id: 15,
      question: "कौन सा वर्णिक छंद है जिसमें प्रत्येक चरण में 17 वर्ण होते हैं?",
      options: {
        A: "मंदाक्रांता",
        B: "बसंत तिलका",
        C: "सवैया",
        D: "कुंडलियां"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "काव्य में जब दो विभिन्न वस्तुओं में समानता दिखाई जाती है तो कौन सा अलंकार होता है?",
      options: {
        A: "विरोधाभास",
        B: "उपमा",
        C: "उत्प्रेक्षा",
        D: "रूपक"
      },
      correctAnswer: "B"
    },
    {
      id: 17,
      question: "यमक अलंकार में क्या विशेषता होती है?",
      options: {
        A: "शब्द दोहराता है पर अर्थ भिन्न होता है",
        B: "शब्द की तुलना",
        C: "अक्षर दोहराना",
        D: "विरोधाभास"
      },
      correctAnswer: "A"
    },
    {
      id: 18,
      question: "‘मनु मानो मनहु जनु जानो जनहु’ जैसे शब्द किस अलंकार में प्रयोग होते हैं?",
      options: {
        A: "यमक",
        B: "उत्प्रेक्षा",
        C: "रूपक",
        D: "अनुप्रास"
      },
      correctAnswer: "A"
    },
    {
      id: 19,
      question: "निम्नलिखित में कौन सा शब्दालंकार है?",
      options: {
        A: "उत्प्रेक्षा",
        B: "रूपक",
        C: "उपमा",
        D: "विरोधाभास"
      },
      correctAnswer: "A"
    },
    {
      id: 20,
      question: "‘ज्यों-ज्यों वृद्ध होते जात त्यों-तों स्वस्थ होते जात’ में कौन सा अलंकार है?",
      options: {
        A: "विरोधाभास",
        B: "उत्प्रेक्षा",
        C: "उपमा",
        D: "रूपक"
      },
      correctAnswer: "B"
    }
  ]
},
{title: "Schedules of Indian Constitution-Bihar & SSC Polity Questions",description: "schedules of Indian Constitution for Bihar D.El.Ed and SSC exam preparation.",
  questions: [
    {
      id: 1,
      question: "भारतीय संविधान में कुल अनुसूचियों (Schedules) की वर्तमान संख्या कितनी है?",
      options: {
        A: "8",
        B: "10",
        C: "12",
        D: "14"
      },
      correctAnswer: "C"
    },
    {
      id: 2,
      question: "कौन सी अनुसूची संविधान में पहली बार संविधान संशोधन 1951 से जोड़ी गई थी?",
      options: {
        A: "9वीं अनुसूची",
        B: "10वीं अनुसूची",
        C: "11वीं अनुसूची",
        D: "12वीं अनुसूची"
      },
      correctAnswer: "A"
    },
    {
      id: 3,
      question: "10वीं अनुसूची संविधान में कब जोड़ी गई?",
      options: {
        A: "1985 में",
        B: "1992 में",
        C: "1972 में",
        D: "1951 में"
      },
      correctAnswer: "A"
    },
    {
      id: 4,
      question: "11वीं अनुसूची संविधान में कब जोड़ी गई और किससे संबंधित है?",
      options: {
        A: "1992 में, पंचायत संस्थाएं",
        B: "1985 में, दल बदल विरोधी कानून",
        C: "1972 में, नगरपालिका",
        D: "1951 में, भूमि सुधार"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "12वीं अनुसूची संविधान में कब जोड़ी गई और किससे संबंधित है?",
      options: {
        A: "1992 में, नगरपालिका",
        B: "1985 में, पंचायत",
        C: "1972 में, दल बदल विरोधी कानून",
        D: "1951 में, भूमि सुधार"
      },
      correctAnswer: "A"
    },
    {
      id: 6,
      question: "पहली अनुसूची में क्या वर्णित है?",
      options: {
        A: "राज्यों एवं केंद्र शासित प्रदेशों के नाम, सीमाएं और न्यायिक क्षेत्र",
        B: "संवैधानिक पदों के वेतन और भत्ते",
        C: "संसद के सदस्यों की शपथ",
        D: "राज्यों के बीच शक्तियों का बंटवारा"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "दूसरी अनुसूची में क्या वर्णित है?",
      options: {
        A: "संवैधानिक पदों के वेतन, भत्ते और विशेषाधिकार",
        B: "सांसदों की शपथ",
        C: "राज्यसभा में सीटों का आवंटन",
        D: "भूमि सुधार"
      },
      correctAnswer: "A"
    },
    {
      id: 8,
      question: "संविधान की तीसरी अनुसूची में क्या वर्णित है?",
      options: {
        A: "संवैधानिक पदों पर आसीन अधिकारियों द्वारा ली जाने वाली शपथ",
        B: "राज्यों के नाम और सीमाएं",
        C: "पंचायत संस्थाओं की शक्तियां",
        D: "दल बदल विरोधी कानून"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "छठी अनुसूची में किस क्षेत्रों के प्रशासन और नियंत्रण के प्रावधान हैं?",
      options: {
        A: "असम, मेघालय, त्रिपुरा, मिजोरम के जनजातीय क्षेत्रों",
        B: "पूरे भारत के अनुसूचित जनजातीय क्षेत्र",
        C: "केवल उत्तर भारत के जनजातीय क्षेत्र",
        D: "जम्मू-कश्मीर"
      },
      correctAnswer: "A"
    },
    {
      id: 10,
      question: "छठी अनुसूची के अंतर्गत कुल कितने ऑटोनोमस डिस्ट्रिक्ट काउंसिल (ADC) हैं?",
      options: {
        A: "10",
        B: "4",
        C: "11",
        D: "7"
      },
      correctAnswer: "A"
    },
    {
      id: 11,
      question: "सातवीं अनुसूची में क्या वर्णित है?",
      options: {
        A: "केंद्र और राज्यों के बीच शक्तियों का बंटवारा (संघ सूची, राज्य सूची, समवर्ती सूची)",
        B: "राज्यों एवं केंद्र शासित प्रदेशों के नाम",
        C: "संवैधानिक पदाधिकारियों के वेतन",
        D: "पंचायत संस्थाओं की शक्तियां"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "आठवीं अनुसूची में क्या वर्णित है?",
      options: {
        A: "संविधान द्वारा मान्यता प्राप्त भाषाएं",
        B: "संवैधानिक पदाधिकारियों के वेतन",
        C: "भूमि सुधार",
        D: "दल बदल विरोधी कानून"
      },
      correctAnswer: "A"
    },
    {
      id: 13,
      question: "आठवीं अनुसूची में प्रशासित भाषाओं की प्रारंभिक संख्या कितनी थी और वर्तमान में कितनी हैं?",
      options: {
        A: "प्रारंभ में 14, वर्तमान में 22",
        B: "प्रारंभ में 10, वर्तमान में 18",
        C: "प्रारंभ में 20, वर्तमान में 22",
        D: "प्रारंभ में 12, वर्तमान में 18"
      },
      correctAnswer: "A"
    },
    {
      id: 14,
      question: "नौवीं अनुसूची में क्या प्रमुख विषय हैं?",
      options: {
        A: "भूमि सुधार और जमींदारी उन्मूलन के कानूनों का संरक्षण",
        B: "पंचायतों की शक्तियां",
        C: "दल बदल विरोधी कानून",
        D: "केंद्र और राज्य के बीच शक्तियों का बंटवारा"
      },
      correctAnswer: "A"
    },
    {
      id: 15,
      question: "किस अनुसूची के अंतर्गत दल बदल विरोधी कानून शामिल है?",
      options: {
        A: "10वीं अनुसूची",
        B: "11वीं अनुसूची",
        C: "12वीं अनुसूची",
        D: "9वीं अनुसूची"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "11वीं अनुसूची में कितने विषय शामिल हैं?",
      options: {
        A: "29",
        B: "22",
        C: "32",
        D: "24"
      },
      correctAnswer: "A"
    },
    {
      id: 17,
      question: "आठवीं अनुसूची में से निम्नलिखित में से कौन सी भाषा शास्त्रीय भाषा नहीं है?",
      options: {
        A: "मगही",
        B: "तमिल",
        C: "संस्कृत",
        D: "मलयालम"
      },
      correctAnswer: "A"
    },
    {
      id: 18,
      question: "कौन सी भाषा को सबसे पुरानी शास्त्रीय भाषा माना गया है?",
      options: {
        A: "तमिल",
        B: "संस्कृत",
        C: "कन्नड़",
        D: "तेलुगु"
      },
      correctAnswer: "A"
    },
    {
      id: 19,
      question: "पाँचवीं अनुसूची में क्या वर्णित है?",
      options: {
        A: "अनुसूचित जनजाति और अनुसूचित क्षेत्रों का प्रशासन और नियंत्रण",
        B: "पंचायत संस्थाएं",
        C: "राज्यों एवं केंद्र शासित प्रदेशों के नाम",
        D: "संविधान के संशोधनों के नियम"
      },
      correctAnswer: "A"
    },
    {
      id: 20,
      question: "12वीं अनुसूची में क्या वर्णित है?",
      options: {
        A: "नगरपालिका और शहरों की प्रशासनिक शक्तियां",
        B: "पंचायत संस्थाएं",
        C: "दल बदल विरोधी कानून",
        D: "भूमि सुधार"
      },
      correctAnswer: "A"
    }
  ]
},
{title: "Parts of Indian Constitution-Key Polity",description: "Parts of the Indian Constitution with options and answers for Bihar D.El.Ed and SSC exam.",
  questions: [
    {
      id: 1,
      question: "26 जनवरी 1950 को लागू हुए मूल संविधान में कुल कितने भाग (Parts) थे?",
      options: {
        A: "18",
        B: "20",
        C: "22",
        D: "25"
      },
      correctAnswer: "C"
    },
    {
      id: 2,
      question: "वर्तमान में भारतीय संविधान में कुल कितने भाग (Parts) हैं?",
      options: {
        A: "22",
        B: "23",
        C: "24",
        D: "25"
      },
      correctAnswer: "D"
    },
    {
      id: 3,
      question: "संविधान में कुल कितने भाग जोड़े गए और घटाए गए हैं?",
      options: {
        A: "4 जोड़े गए, 1 घटाया गया",
        B: "3 जोड़े गए, 2 घटाए गए",
        C: "5 जोड़े गए, 0 घटाए गए",
        D: "2 जोड़े गए, 1 घटाया गया"
      },
      correctAnswer: "A"
    },
    {
      id: 4,
      question: "नए जोड़े गए भागों में से भाग 4A किस वर्ष के संविधान संशोधन से जुड़ा है?",
      options: {
        A: "1976 (42वां संशोधन)",
        B: "1956",
        C: "1992",
        D: "2011"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "भाग 9A और 9B किससे संबंधित हैं?",
      options: {
        A: "नगरपालिका और सहकारी समितियां",
        B: "मौलिक अधिकार",
        C: "वित्तीय प्रावधान",
        D: "पंचायत व्यवस्था"
      },
      correctAnswer: "A"
    },
    {
      id: 6,
      question: "किस भाग को संविधान से हटा दिया गया है?",
      options: {
        A: "भाग 7",
        B: "भाग 10",
        C: "भाग 4A",
        D: "भाग 9B"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "भाग 1 में क्या वर्णित है?",
      options: {
        A: "संघ और राज्य क्षेत्र",
        B: "नागरिकता",
        C: "मौलिक अधिकार",
        D: "वित्तीय प्रावधान"
      },
      correctAnswer: "A"
    },
    {
      id: 8,
      question: "भाग 2 में क्या वर्णित है?",
      options: {
        A: "नागरिकता",
        B: "संघ और राज्य क्षेत्र",
        C: "मौलिक अधिकार",
        D: "पंचायत व्यवस्था"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "भाग 3 में क्या वर्णित है?",
      options: {
        A: "मूल अधिकार (Fundamental Rights)",
        B: "नीति निर्देशक तत्व",
        C: "चुनाव",
        D: "वित्तीय प्रावधान"
      },
      correctAnswer: "A"
    },
    {
      id: 10,
      question: "भाग 4 में क्या वर्णित है?",
      options: {
        A: "नीति निर्देशक तत्व (Directive Principles of State Policy)",
        B: "चुनाव",
        C: "पंचायत व्यवस्था",
        D: "नगरपालिका"
      },
      correctAnswer: "A"
    },
    {
      id: 11,
      question: "भाग 5 में क्या वर्णित है?",
      options: {
        A: "केंद्र सरकार (Union Government)",
        B: "राज्य सरकार",
        C: "चुनाव प्रक्रिया",
        D: "वित्तीय प्रावधान"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "भाग 6 में क्या वर्णित है?",
      options: {
        A: "राज्य सरकार",
        B: "केंद्र सरकार",
        C: "संघ और राज्य संबंध",
        D: "पंचायत व्यवस्था"
      },
      correctAnswer: "A"
    },
    {
      id: 13,
      question: "भाग 9 में क्या वर्णित है?",
      options: {
        A: "पंचायतें",
        B: "नगरपालिका",
        C: "सहकारी समितियां",
        D: "मौलिक अधिकार"
      },
      correctAnswer: "A"
    },
    {
      id: 14,
      question: "भाग 10 में क्या वर्णित है?",
      options: {
        A: "अनुसूचित और जनजातीय क्षेत्र",
        B: "वित्तीय प्रावधान",
        C: "चुनाव",
        D: "नगरपालिका"
      },
      correctAnswer: "A"
    },
    {
      id: 15,
      question: "भाग 11 में क्या वर्णित है?",
      options: {
        A: "संघ और राज्य के बीच संबंध",
        B: "केंद्र सरकार",
        C: "राज्य सरकार",
        D: "वित्तीय उपबंध"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "भाग 12 में क्या वर्णित है?",
      options: {
        A: "वित्तीय उपबंध (Finance, Property, Contracts)",
        B: "चुनाव",
        C: "पंचायत",
        D: "नगरपालिका"
      },
      correctAnswer: "A"
    },
    {
      id: 17,
      question: "भाग 13 में क्या वर्णित है?",
      options: {
        A: "वित्तीय उपबंध",
        B: "व्यापार और वाणिज्य स्वतंत्रता",
        C: "चुनाव",
        D: "संघ और राज्य संबंध"
      },
      correctAnswer: "B"
    },
    {
      id: 18,
      question: "भाग 14 में क्या वर्णित है?",
      options: {
        A: "संघ और राज्य के अधीन सेवाएं (Services under Union and States)",
        B: "मौलिक अधिकार",
        C: "निगम और पंचायत",
        D: "वित्तीय प्रावधान"
      },
      correctAnswer: "A"
    },
    {
      id: 19,
      question: "भाग 15 में क्या वर्णित है?",
      options: {
        A: "चुनाव (Elections)",
        B: "पंचायत व्यवस्था",
        C: "नगरपालिका",
        D: "अनुसूचित क्षेत्र"
      },
      correctAnswer: "A"
    },
    {
      id: 20,
      question: "भाग 16 में क्या विशेष प्रावधान हैं?",
      options: {
        A: "कुछ वर्गों के लिए विशेष प्रावधान (Special Provisions for Certain Classes like SC, ST, OBC)",
        B: "चुनाव प्रकिया",
        C: "पंचायत व्यवस्था",
        D: "वित्तीय प्रावधान"
      },
      correctAnswer: "A"
    },
    {
      id: 21,
      question: "भाग 17 में क्या वर्णित है?",
      options: {
        A: "राजभाषा (Official Language)",
        B: "वित्तीय प्रावधान",
        C: "निर्वाचन प्रणाली",
        D: "पंचायत व्यवस्था"
      },
      correctAnswer: "A"
    },
    {
      id: 22,
      question: "भाग 18 में क्या वर्णित है?",
      options: {
        A: "आपातकालीन प्रावधान (Emergency Provisions)",
        B: "चुनाव",
        C: "वित्तीय प्रावधान",
        D: "पंचायत"
      },
      correctAnswer: "A"
    },
    {
      id: 23,
      question: "भाग 19 में क्या वर्णित है?",
      options: {
        A: "विविध प्रकीर्ण (Miscellaneous)",
        B: "पंचायत",
        C: "वित्तीय प्रावधान",
        D: "अनुसूचित क्षेत्र"
      },
      correctAnswer: "A"
    },
    {
      id: 24,
      question: "भाग 20 में क्या वर्णित है?",
      options: {
        A: "संविधान संशोधन",
        B: "वित्तीय प्रावधान",
        C: "चुनाव",
        D: "पंचायत"
      },
      correctAnswer: "A"
    },
    {
      id: 25,
      question: "भाग 21 में क्या वर्णित है?",
      options: {
        A: "अस्थाई संक्रमण कालीन और विशेष प्रावधान",
        B: "चुनाव",
        C: "वित्तीय प्रावधान",
        D: "पंचायत"
      },
      correctAnswer: "A"
    },
    {
      id: 26,
      question: "भाग 22 में क्या वर्णित है?",
      options: {
        A: "संक्षिप्त नाम, प्रारंभ, आदि (Short Title, Commencement, etc.)",
        B: "चुनाव",
        C: "वित्तीय प्रावधान",
        D: "नगरपालिका"
      },
      correctAnswer: "A"
    }
  ]
},
{title: "Union and Its Territory",description: "Key Polity Questions for Bihar D.El.Ed & SSC",
  questions: [
    {
      id: 1,
      question: "भारतीय संविधान के अनुच्छेद 1 में भारत को क्या कहा गया है?",
      options: {
        A: "राज्यों का महासंघ",
        B: "राज्यों का संघ और केंद्र शासित प्रदेश",
        C: "राज्यों का संघ",
        D: "स्वतंत्र राज्यों का समूह"
      },
      correctAnswer: "C"
    },
    {
      id: 2,
      question: "अनुच्छेद 1 में क्या शामिल नहीं है?",
      options: {
        A: "केंद्र शासित प्रदेश (यूटी)",
        B: "राज्यों का संघ",
        C: "भारत का भौगोलिक क्षेत्र",
        D: "अर्जित क्षेत्र"
      },
      correctAnswer: "A"
    },
    {
      id: 3,
      question: "भारत में कुल कितने राज्य और केंद्र शासित प्रदेश (यूटी) हैं?",
      options: {
        A: "28 राज्य और 8 यूटी",
        B: "27 राज्य और 7 यूटी",
        C: "29 राज्य और 9 यूटी",
        D: "26 राज्य और 6 यूटी"
      },
      correctAnswer: "A"
    },
    {
      id: 4,
      question: "अनुच्छेद 2 में क्या प्रावधान है?",
      options: {
        A: "संसद नए राज्यों के प्रवेश तथा स्थापना के लिए विधि बना सकती है",
        B: "केंद्र शासित प्रदेशों का निर्माण होगा",
        C: "राज्यसभा की सीटों का निर्धारण होगा",
        D: "राज्यों के संसदीय नियंत्रण का नियम होगा"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "अनुच्छेद 3 के अनुसार संसद क्या कर सकती है?",
      options: {
        A: "नए राज्यों का निर्माण, राज्यों की सीमाओं में बदलाव, नाम परिवर्तन आदि",
        B: "राज्यों की राजभाषा तय कर सकती है",
        C: "केंद्र शासित प्रदेशों का प्रबंधन कर सकती है",
        D: "राज्यों के प्रशासनिक अधिकार कम कर सकती है"
      },
      correctAnswer: "A"
    },
    {
      id: 6,
      question: "अनुच्छेद 3 के अंतर्गत नए राज्यों का निर्माण कैसा होना चाहिए?",
      options: {
        A: "वह पहले से भारत संघ में शामिल हो",
        B: "वह नया और स्वतंत्र क्षेत्र हो",
        C: "वह केंद्र शासित प्रदेश हो",
        D: "वह किसी और देश से आयातित क्षेत्र हो"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "अनुच्छेद 3 के तहत राज्यों के पुनर्गठन के लिए क्या आवश्यक है?",
      options: {
        A: "राष्ट्रपति की पूर्व अनुमति",
        B: "राज्यों की पूर्ण सहमति",
        C: "सर्वोच्च न्यायालय की मंजूरी",
        D: "केवल संसद का बहुमत"
      },
      correctAnswer: "A"
    },
    {
      id: 8,
      question: "अनुच्छेद 4 में क्या प्रावधान है?",
      options: {
        A: "अनुच्छेद 2 और 3 के पालन में संसद द्वारा बनाई गई विधि संविधान संशोधन नहीं मानी जाएगी",
        B: "राज्यों के पुनर्गठन के लिए विशेष विधि बनेगी",
        C: "राज्यों की सीमाएं स्थायी रहेंगी",
        D: "केंद्र शासित प्रदेशों की सीमाएं नहीं बदली जाएंगी"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "क्या भारत अपना क्षेत्र दूसरे देश को दे सकता है?",
      options: {
        A: "हां, संविधान संशोधन द्वारा",
        B: "नहीं, बिल्कुल नहीं",
        C: "हां, अनुच्छेद 2 के तहत",
        D: "हां, राष्ट्रपति के आदेश से"
      },
      correctAnswer: "A"
    },
    {
      id: 10,
      question: "सिक्किम भारत का 22वां राज्य कब बना?",
      options: {
        A: "1975",
        B: "1965",
        C: "1985",
        D: "1990"
      },
      correctAnswer: "A"
    },
    {
      id: 11,
      question: "गोवा को भारत में कब शामिल किया गया?",
      options: {
        A: "1961",
        B: "1947",
        C: "1975",
        D: "1954"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "दादर और नगर हवेली भारत में कब शामिल हुआ?",
      options: {
        A: "1954",
        B: "1961",
        C: "1975",
        D: "1987"
      },
      correctAnswer: "A"
    },
    {
      id: 13,
      question: "पांडिचेरी भारत में कब शामिल हुई?",
      options: {
        A: "1954",
        B: "1961",
        C: "1947",
        D: "1975"
      },
      correctAnswer: "A"
    },
    {
      id: 14,
      question: "राज्यों के पुनर्गठन के लिए अनुच्छेद 3 के अनुसार प्रभावित राज्यों की राय कैसे ली जाती है?",
      options: {
        A: "राय मांगी जाती है, लेकिन बाध्य नहीं होती",
        B: "राय अनिवार्य है",
        C: "राय संसद तय करेगी",
        D: "राय की कोई जरूरत नहीं है"
      },
      correctAnswer: "A"
    },
    {
      id: 15,
      question: "भारत संघीय या महासंघीय या अर्ध संघात्मक किस प्रकार का राज्य है?",
      options: {
        A: "अर्ध संघात्मक (क्वासी फेडरल)",
        B: "पूर्ण संघीय",
        C: "केंद्रीयकृत संघ",
        D: "स्वतंत्र राज्यों का संघ"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "अनुच्छेद 3 और 4 के तहत संसद द्वारा बनाए गए विधि का संविधान संशोधन के तौर पर मान्यता कैसी होती है?",
      options: {
        A: "संविधान संशोधन नहीं माना जाता",
        B: "संविधान संशोधन माना जाता है",
        C: "उच्च न्यायालय की मंजूरी आवश्यक",
        D: "राष्ट्रपति की मंजूरी आवश्यक"
      },
      correctAnswer: "A"
    }
  ]
},
{title: "GK & Geography-Important Questions",description: "General Knowledge and Geography for Bihar D.El.Ed exam preparation, covering fundamental rights, rivers, glaciers, mountains, deserts, constitutional provisions, and world geography.",
  questions: [
    {
      id: 1,
      question: "भारत के संविधान ने मौलिक अधिकार कितने प्रदान किए हैं?",
      options: {
        A: "6",
        B: "7",
        C: "8",
        D: "5"
      },
      correctAnswer: "A"
    },
    {
      id: 2,
      question: "संपत्ति के अधिकार को मूल अधिकार से कब हटा गया था?",
      options: {
        A: "1978 (44वां संविधान संशोधन)",
        B: "1975",
        C: "1980",
        D: "1967"
      },
      correctAnswer: "A"
    },
    {
      id: 3,
      question: "भारत के संविधान में मौलिक अधिकार किस भाग में दिए गए हैं?",
      options: {
        A: "भाग 3",
        B: "भाग 4",
        C: "भाग 2",
        D: "भाग 5"
      },
      correctAnswer: "A"
    },
    {
      id: 4,
      question: "अनुच्छेद 14 का विषय क्या है?",
      options: {
        A: "विधि के समक्ष समानता",
        B: "धार्मिक स्वतंत्रता",
        C: "रोजगार के अवसर",
        D: "संपत्ति अधिकार"
      },
      correctAnswer: "A"
    },
    {
      id: 5,
      question: "अनुच्छेद 15 में क्या वर्णित है?",
      options: {
        A: "किसी भी जाति, धर्म, लिंग, जन्मस्थान के आधार पर भेदभाव का निषेध",
        B: "समान रोजगार",
        C: "धार्मिक स्वतंत्रता",
        D: "संपत्ति अधिकार"
      },
      correctAnswer: "A"
    },
    {
      id: 6,
      question: "अनुच्छेद 21 किस अधिकार से संबंधित है?",
      options: {
        A: "जीवन और व्यक्तिगत स्वतंत्रता",
        B: "धार्मिक स्वतंत्रता",
        C: "संपत्ति अधिकार",
        D: "शिक्षा का अधिकार"
      },
      correctAnswer: "A"
    },
    {
      id: 7,
      question: "संविधान का कौन सा अनुच्छेद संवैधानिक उपचार का अधिकार देता है?",
      options: {
        A: "अनुच्छेद 32",
        B: "अनुच्छेद 21",
        C: "अनुच्छेद 14",
        D: "अनुच्छेद 19"
      },
      correctAnswer: "A"
    },
    {
      id: 8,
      question: "श्वेत क्रांति का संबंध किससे है?",
      options: {
        A: "दूध उत्पादन में वृद्धि",
        B: "आयात-निर्यात",
        C: "कृषि उत्पादन",
        D: "उद्योग"
      },
      correctAnswer: "A"
    },
    {
      id: 9,
      question: "विश्व का सबसे बड़ा ग्लेशियर कौन सा है?",
      options: {
        A: "सियाचिन ग्लेशियर",
        B: "गंगोत्री ग्लेशियर",
        C: "बाक्सी ग्लेशियर",
        D: "तुषार ग्लेशियर"
      },
      correctAnswer: "A"
    },
    {
      id: 10,
      question: "विश्व का सबसे ऊंचा झरना कौन सा है?",
      options: {
        A: "एंजेल जलप्रपात (वेनेजुएला)",
        B: "नियाग्रा जलप्रपात",
        C: "आर्गो जलप्रपात",
        D: "विजाग जलप्रपात"
      },
      correctAnswer: "A"
    },
    {
      id: 11,
      question: "भारत के बाहर वेनेजुएला की राजधानी क्या है?",
      options: {
        A: "कराकस",
        B: "सीमा",
        C: "बॉगोटा",
        D: "लिमा"
      },
      correctAnswer: "A"
    },
    {
      id: 12,
      question: "भारत में सबसे ऊंचा पर्वत कौन सा है और इसकी ऊंचाई क्या है?",
      options: {
        A: "माउंट एवरेस्ट, 8850 मीटर",
        B: "के2, 8611 मीटर",
        C: "कंचनजंगा, 8586 मीटर",
        D: "नामचा बरवा, 7800 मीटर"
      },
      correctAnswer: "A"
    },
    {
      id: 13,
      question: "भारत का सबसे बड़ा मरुस्थल कौन सा है?",
      options: {
        A: "थार मरुस्थल",
        B: "सहारा मरुस्थल",
        C: "आटाकामा मरुस्थल",
        D: "गोबी मरुस्थल"
      },
      correctAnswer: "A"
    },
    {
      id: 14,
      question: "विश्व का सबसे बड़ा ठंडा मरुस्थल कौन सा है?",
      options: {
        A: "अंटार्कटिका",
        B: "आर्कटिक",
        C: "गोबी मरुस्थल",
        D: "थार मरुस्थल"
      },
      correctAnswer: "A"
    },
    {
      id: 15,
      question: "भारत की सबसे बड़ी नदी कौन सी है?",
      options: {
        A: "सिंधु",
        B: "गंगा",
        C: "यमुना",
        D: "ब्रह्मपुत्र"
      },
      correctAnswer: "A"
    },
    {
      id: 16,
      question: "भारतीय उपमहाद्वीप में औद्योगिक क्रांति के दौरान भारत को विश्व में किस नाम से जाना गया?",
      options: {
        A: "भारत",
        B: "हिंदुस्तान",
        C: "आर्यावर्त",
        D: "इंडिया"
      },
      correctAnswer: "D"
    },
    {
      id: 17,
      question: "सिक्किम भारत का 22वां राज्य कब बना?",
      options: {
        A: "1975",
        B: "1974",
        C: "1980",
        D: "1985"
      },
      correctAnswer: "A"
    },
    {
      id: 18,
      question: "गोवा को भारत में कब शामिल किया गया?",
      options: {
        A: "1961",
        B: "1947",
        C: "1975",
        D: "1954"
      },
      correctAnswer: "A"
    },
    {
      id: 19,
      question: "भारत के संविधान की अनुच्छेद 3 के अंतर्गत क्या प्रावधान हैं?",
      options: {
        A: "नए राज्यों के निर्माण, राज्यों की सीमाओं में परिवर्तन, नाम परिवर्तन",
        B: "राज्यों की राजभाषा निर्धारित करना",
        C: "केंद्र शासित प्रदेशों का सीमांकन",
        D: "राज्यों के वित्त प्रबंधन करणा"
      },
      correctAnswer: "A"
    },
    {
      id: 20,
      question: "गंगा नदी की सहायक नदियों में कौन-कौन सी शामिल हैं?",
      options: {
        A: "सतलुज, यमुना, रावी, चिनाब, ब्यास",
        B: "सिंधु, ब्रह्मपुत्र, गोदावरी, कावेरी",
        C: "नर्मदा, ताप्ती, घाघरा, सरयू",
        D: "गोधावरी, महानदी, ठाणेश्वर"
      },
      correctAnswer: "A"
    }
  ]
},





{ title: "subject name", description: "Sample test",
    questions: [
      {
        id: 1,
        question: "question number 1",
        options: {
          A: "Venus",
          B: "Mars",
          C: "Jupiter",
          D: "Saturn"
        },
        correctAnswer: "B"
      },
      {
        id: 2,
        question: "question number 2",
        options: {
          A: "H2O",
          B: "CO2",
          C: "NaCl",
          D: "O2"
        },
        correctAnswer: "A"
      }
    ]
  }
];