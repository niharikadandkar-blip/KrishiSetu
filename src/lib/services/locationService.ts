export interface DistrictData {
  name: string;
  talukas: string[];
}

export interface StateData {
  state: string;
  districts: DistrictData[];
}

export const INDIAN_LOCATIONS: StateData[] = [
  {
    state: 'Maharashtra (महाराष्ट्र)',
    districts: [
      { name: 'Pune (पुणे)', talukas: ['Haveli (हवेली)', 'Shirur (शिरूर)', 'Baramati (बारामती)', 'Junner (जुन्नर)', 'Khed (खेड)', 'Daund (दौंड)'] },
      { name: 'Nashik (नाशिक)', talukas: ['Niphad (निफाड)', 'Malegaon (मालेगाव)', 'Sinnar (सिन्नर)', 'Yevla (येवला)', 'Chandwad (चांदवड)'] },
      { name: 'Ahmednagar (अहिल्यानगर/अहमदनगर)', talukas: ['Rahata (राहता)', 'Sangamner (संगमनेर)', 'Kopargaon (कोपरगाव)', 'Shrirampur (श्रीरामपूर)', 'Nevasa (नेवासा)'] },
      { name: 'Satara (सातारा)', talukas: ['Karad (कराड)', 'Phaltan (फलटण)', 'Wai (वाई)', 'Koregaon (कोरेगाव)'] },
      { name: 'Solapur (सोलापूर)', talukas: ['Pandharpur (पंढरपूर)', 'Barshi (बार्शी)', 'Sangola (सांगोला)', 'Akkalkot (अक्कलकोट)'] },
      { name: 'Nagpur (नागपूर)', talukas: ['Kamptee (कामठी)', 'Katol (काटोल)', 'Saoner (सावनेर)', 'Ramtek (रामटेक)'] },
      { name: 'Kolhapur (कोल्हापूर)', talukas: ['Hatkanangle (हातकणंगले)', 'Shirol (शिरोळ)', 'Kagal (कागल)', 'Radhanagari (राधानगरी)'] },
      { name: 'Aurangabad / Chhatrapati Sambhajinagar (छत्रपती संभाजीनगर)', talukas: ['Paithan (पैठण)', 'Gangapur (गंगापूर)', 'Kannad (कन्नड)', 'Vaijapur (वैजापूर)'] },
      { name: 'Jalgaon (जळगाव)', talukas: ['Bhusawal (भुसावळ)', 'Raver (रावेर)', 'Yawal (यावल)', 'Chopda (चोपडा)'] },
      { name: 'Amravati (अमरावती)', talukas: ['Achalpur (अचलपूर)', 'Chandur Bazar (चांदूर बाजार)', 'Warud (वरूड)', 'Morshi (मोर्शी)'] }
    ]
  },
  {
    state: 'Madhya Pradesh (मध्यप्रदेश)',
    districts: [
      { name: 'Indore (इंदौर)', talukas: ['Depalpur', 'Sanwer', 'Mhow'] },
      { name: 'Ujjain (उज्जैन)', talukas: ['Badnagar', 'Nagda', 'Khachrod'] },
      { name: 'Bhopal (भोपाल)', talukas: ['Huzur', 'Berasia'] },
      { name: 'Narmadapuram (नर्मदापुरम)', talukas: ['Itarsi', 'Pipariya', 'Seoni Malwa'] }
    ]
  },
  {
    state: 'Uttar Pradesh (उत्तर प्रदेश)',
    districts: [
      { name: 'Lucknow (लखनऊ)', talukas: ['Bakshi Ka Talab', 'Malihabad', 'Mohanlalganj'] },
      { name: 'Varanasi (वाराणसी)', talukas: ['Pindra', 'Patan', 'Pindra'] },
      { name: 'Kanpur (कानपुर)', talukas: ['Bilhaux', 'Ghatampur'] }
    ]
  },
  {
    state: 'Gujarat (गुजरात)',
    districts: [
      { name: 'Ahmedabad (अहमदाबाद)', talukas: ['Daskroi', 'Sanand', 'Bavla'] },
      { name: 'Rajkot (राजकोट)', talukas: ['Gondal', 'Jetpur', 'Dhoraji'] },
      { name: 'Surat (सूरत)', talukas: ['Bardoli', 'Kamrej', 'Olpad'] }
    ]
  },
  {
    state: 'Karnataka (कर्नाटक)',
    districts: [
      { name: 'Belagavi (बेळगाव)', talukas: ['Chikodi', 'Gokak', 'Athani'] },
      { name: 'Mysuru (मैसूरु)', talukas: ['Nanjangud', 'Hunsur', 'T.Narasipura'] }
    ]
  }
];

export const getStates = (): string[] => INDIAN_LOCATIONS.map(l => l.state);

export const getDistricts = (stateName: string): string[] => {
  const found = INDIAN_LOCATIONS.find(l => l.state === stateName);
  return found ? found.districts.map(d => d.name) : [];
};

export const getTalukas = (stateName: string, districtName: string): string[] => {
  const foundState = INDIAN_LOCATIONS.find(l => l.state === stateName);
  if (!foundState) return [];
  const foundDistrict = foundState.districts.find(d => d.name === districtName);
  return foundDistrict ? foundDistrict.talukas : [];
};
