/**
 * Bangladesh's administrative geography: 8 divisions -> 64 districts -> thanas/upazilas.
 *
 * This is the WHOLE address vocabulary of the app. Two things depend on it:
 *
 *  1. The address form's cascading selects (division -> district -> area). Typing a district by
 *     hand is how you end up with "Dhaka", "dhaka", "DHK" and "Dahka" in one table.
 *  2. The Server Action's validation. `isValidLocation()` re-checks the trio SERVER-SIDE, so a
 *     hand-rolled POST cannot save an address in "Dhanmondi, Sylhet".
 *
 * Why the areas matter beyond tidiness: `calcDeliveryFee()` in '@/lib/pricing' charges ৳60 inside
 * Dhaka and ৳120 outside, and it decides that by string-matching the DISTRICT. A free-text district
 * field would quietly overcharge every Dhaka customer who wrote "dhaka " with a trailing space.
 *
 * Dhaka district lists city THANAS (Dhanmondi, Gulshan, Mirpur…) rather than only its upazilas,
 * because that is the granularity a rider actually needs — and the same is done for the other
 * metropolitan districts (Chattogram, Khulna, Rajshahi).
 */

export interface BdDistrict {
  name: string
  areas: string[]
}

export interface BdDivision {
  name: string
  districts: BdDistrict[]
}

export const BD_DIVISIONS: BdDivision[] = [
  {
    name: 'Barishal',
    districts: [
      {
        name: 'Barguna',
        areas: ['Amtali', 'Bamna', 'Barguna Sadar', 'Betagi', 'Patharghata', 'Taltali'],
      },
      {
        name: 'Barishal',
        areas: [
          'Agailjhara',
          'Babuganj',
          'Bakerganj',
          'Banaripara',
          'Barishal Sadar',
          'Gaurnadi',
          'Hizla',
          'Mehendiganj',
          'Muladi',
          'Wazirpur',
        ],
      },
      {
        name: 'Bhola',
        areas: [
          'Bhola Sadar',
          'Burhanuddin',
          'Char Fasson',
          'Daulatkhan',
          'Lalmohan',
          'Manpura',
          'Tazumuddin',
        ],
      },
      {
        name: 'Jhalokati',
        areas: ['Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'],
      },
      {
        name: 'Patuakhali',
        areas: [
          'Bauphal',
          'Dashmina',
          'Dumki',
          'Galachipa',
          'Kalapara',
          'Mirzaganj',
          'Patuakhali Sadar',
          'Rangabali',
        ],
      },
      {
        name: 'Pirojpur',
        areas: [
          'Bhandaria',
          'Indurkani',
          'Kawkhali',
          'Mathbaria',
          'Nazirpur',
          'Nesarabad',
          'Pirojpur Sadar',
        ],
      },
    ],
  },
  {
    name: 'Chattogram',
    districts: [
      {
        name: 'Bandarban',
        areas: [
          'Alikadam',
          'Bandarban Sadar',
          'Lama',
          'Naikhongchhari',
          'Rowangchhari',
          'Ruma',
          'Thanchi',
        ],
      },
      {
        name: 'Brahmanbaria',
        areas: [
          'Akhaura',
          'Ashuganj',
          'Bancharampur',
          'Bijoynagar',
          'Brahmanbaria Sadar',
          'Kasba',
          'Nabinagar',
          'Nasirnagar',
          'Sarail',
        ],
      },
      {
        name: 'Chandpur',
        areas: [
          'Chandpur Sadar',
          'Faridganj',
          'Haimchar',
          'Hajiganj',
          'Kachua',
          'Matlab Dakshin',
          'Matlab Uttar',
          'Shahrasti',
        ],
      },
      {
        name: 'Chattogram',
        areas: [
          'Agrabad',
          'Anwara',
          'Banshkhali',
          'Bayezid Bostami',
          'Boalkhali',
          'Chandanaish',
          'Chandgaon',
          'Double Mooring',
          'Fatikchhari',
          'Halishahar',
          'Hathazari',
          'Karnaphuli',
          'Khulshi',
          'Kotwali',
          'Lohagara',
          'Mirsharai',
          'Pahartali',
          'Panchlaish',
          'Patiya',
          'Rangunia',
          'Raozan',
          'Sandwip',
          'Satkania',
          'Sitakunda',
        ],
      },
      {
        name: "Cox's Bazar",
        areas: [
          'Chakaria',
          "Cox's Bazar Sadar",
          'Kutubdia',
          'Maheshkhali',
          'Pekua',
          'Ramu',
          'Teknaf',
          'Ukhia',
        ],
      },
      {
        name: 'Cumilla',
        areas: [
          'Barura',
          'Brahmanpara',
          'Burichang',
          'Chandina',
          'Chauddagram',
          'Cumilla Adarsha Sadar',
          'Cumilla Sadar Dakshin',
          'Daudkandi',
          'Debidwar',
          'Homna',
          'Laksam',
          'Meghna',
          'Monohorganj',
          'Muradnagar',
          'Nangalkot',
          'Titas',
        ],
      },
      {
        name: 'Feni',
        areas: ['Chhagalnaiya', 'Daganbhuiyan', 'Feni Sadar', 'Fulgazi', 'Parshuram', 'Sonagazi'],
      },
      {
        name: 'Khagrachhari',
        areas: [
          'Dighinala',
          'Khagrachhari Sadar',
          'Lakshmichhari',
          'Mahalchhari',
          'Manikchhari',
          'Matiranga',
          'Panchhari',
          'Ramgarh',
        ],
      },
      {
        name: 'Lakshmipur',
        areas: ['Kamalnagar', 'Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati'],
      },
      {
        name: 'Noakhali',
        areas: [
          'Begumganj',
          'Chatkhil',
          'Companiganj',
          'Hatiya',
          'Kabirhat',
          'Noakhali Sadar',
          'Senbagh',
          'Sonaimuri',
          'Subarnachar',
        ],
      },
      {
        name: 'Rangamati',
        areas: [
          'Baghaichhari',
          'Barkal',
          'Belaichhari',
          'Juraichhari',
          'Kaptai',
          'Kawkhali',
          'Langadu',
          'Naniarchar',
          'Rajasthali',
          'Rangamati Sadar',
        ],
      },
    ],
  },
  {
    name: 'Dhaka',
    districts: [
      {
        name: 'Dhaka',
        areas: [
          'Adabor',
          'Badda',
          'Banani',
          'Bangshal',
          'Bashundhara R/A',
          'Cantonment',
          'Chawkbazar',
          'Dakshinkhan',
          'Demra',
          'Dhamrai',
          'Dhanmondi',
          'Dohar',
          'Gendaria',
          'Gulshan',
          'Hazaribagh',
          'Jatrabari',
          'Kadamtali',
          'Kafrul',
          'Kalabagan',
          'Kamrangirchar',
          'Keraniganj',
          'Khilgaon',
          'Khilkhet',
          'Kotwali',
          'Lalbagh',
          'Mirpur',
          'Mohammadpur',
          'Motijheel',
          'Mugda',
          'Nawabganj',
          'New Market',
          'Pallabi',
          'Paltan',
          'Ramna',
          'Rampura',
          'Sabujbagh',
          'Savar',
          'Shahbagh',
          'Sher-e-Bangla Nagar',
          'Shyampur',
          'Sutrapur',
          'Tejgaon',
          'Turag',
          'Uttara',
          'Uttarkhan',
          'Vatara',
          'Wari',
        ],
      },
      {
        name: 'Faridpur',
        areas: [
          'Alfadanga',
          'Bhanga',
          'Boalmari',
          'Charbhadrasan',
          'Faridpur Sadar',
          'Madhukhali',
          'Nagarkanda',
          'Sadarpur',
          'Saltha',
        ],
      },
      {
        name: 'Gazipur',
        areas: ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'],
      },
      {
        name: 'Gopalganj',
        areas: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'],
      },
      {
        name: 'Kishoreganj',
        areas: [
          'Astagram',
          'Bajitpur',
          'Bhairab',
          'Hossainpur',
          'Itna',
          'Karimganj',
          'Katiadi',
          'Kishoreganj Sadar',
          'Kuliarchar',
          'Mithamain',
          'Nikli',
          'Pakundia',
          'Tarail',
        ],
      },
      {
        name: 'Madaripur',
        areas: ['Dasar', 'Kalkini', 'Madaripur Sadar', 'Rajoir', 'Shibchar'],
      },
      {
        name: 'Manikganj',
        areas: [
          'Daulatpur',
          'Ghior',
          'Harirampur',
          'Manikganj Sadar',
          'Saturia',
          'Shibalaya',
          'Singair',
        ],
      },
      {
        name: 'Munshiganj',
        areas: [
          'Gazaria',
          'Lohajang',
          'Munshiganj Sadar',
          'Sirajdikhan',
          'Sreenagar',
          'Tongibari',
        ],
      },
      {
        name: 'Narayanganj',
        areas: [
          'Araihazar',
          'Bandar',
          'Fatullah',
          'Narayanganj Sadar',
          'Rupganj',
          'Siddhirganj',
          'Sonargaon',
        ],
      },
      {
        name: 'Narsingdi',
        areas: ['Belabo', 'Monohardi', 'Narsingdi Sadar', 'Palash', 'Raipura', 'Shibpur'],
      },
      {
        name: 'Rajbari',
        areas: ['Baliakandi', 'Goalandaghat', 'Kalukhali', 'Pangsha', 'Rajbari Sadar'],
      },
      {
        name: 'Shariatpur',
        areas: [
          'Bhedarganj',
          'Damudya',
          'Gosairhat',
          'Naria',
          'Shariatpur Sadar',
          'Zanjira',
        ],
      },
      {
        name: 'Tangail',
        areas: [
          'Basail',
          'Bhuapur',
          'Delduar',
          'Dhanbari',
          'Ghatail',
          'Gopalpur',
          'Kalihati',
          'Madhupur',
          'Mirzapur',
          'Nagarpur',
          'Sakhipur',
          'Tangail Sadar',
        ],
      },
    ],
  },
  {
    name: 'Khulna',
    districts: [
      {
        name: 'Bagerhat',
        areas: [
          'Bagerhat Sadar',
          'Chitalmari',
          'Fakirhat',
          'Kachua',
          'Mollahat',
          'Mongla',
          'Morrelganj',
          'Rampal',
          'Sarankhola',
        ],
      },
      {
        name: 'Chuadanga',
        areas: ['Alamdanga', 'Chuadanga Sadar', 'Damurhuda', 'Jibannagar'],
      },
      {
        name: 'Jashore',
        areas: [
          'Abhaynagar',
          'Bagherpara',
          'Chaugachha',
          'Jashore Sadar',
          'Jhikargachha',
          'Keshabpur',
          'Manirampur',
          'Sharsha',
        ],
      },
      {
        name: 'Jhenaidah',
        areas: [
          'Harinakunda',
          'Jhenaidah Sadar',
          'Kaliganj',
          'Kotchandpur',
          'Maheshpur',
          'Shailkupa',
        ],
      },
      {
        name: 'Khulna',
        areas: [
          'Batiaghata',
          'Dacope',
          'Daulatpur',
          'Dighalia',
          'Dumuria',
          'Khalishpur',
          'Khan Jahan Ali',
          'Kotwali',
          'Koyra',
          'Paikgachha',
          'Phultala',
          'Rupsha',
          'Sonadanga',
          'Terokhada',
        ],
      },
      {
        name: 'Kushtia',
        areas: ['Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Kushtia Sadar', 'Mirpur'],
      },
      {
        name: 'Magura',
        areas: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
      },
      {
        name: 'Meherpur',
        areas: ['Gangni', 'Meherpur Sadar', 'Mujibnagar'],
      },
      {
        name: 'Narail',
        areas: ['Kalia', 'Lohagara', 'Narail Sadar'],
      },
      {
        name: 'Satkhira',
        areas: [
          'Assasuni',
          'Debhata',
          'Kalaroa',
          'Kaliganj',
          'Satkhira Sadar',
          'Shyamnagar',
          'Tala',
        ],
      },
    ],
  },
  {
    name: 'Mymensingh',
    districts: [
      {
        name: 'Jamalpur',
        areas: [
          'Bakshiganj',
          'Dewanganj',
          'Islampur',
          'Jamalpur Sadar',
          'Madarganj',
          'Melandaha',
          'Sarishabari',
        ],
      },
      {
        name: 'Mymensingh',
        areas: [
          'Bhaluka',
          'Dhobaura',
          'Fulbaria',
          'Gaffargaon',
          'Gauripur',
          'Haluaghat',
          'Ishwarganj',
          'Muktagachha',
          'Mymensingh Sadar',
          'Nandail',
          'Phulpur',
          'Tarakanda',
          'Trishal',
        ],
      },
      {
        name: 'Netrokona',
        areas: [
          'Atpara',
          'Barhatta',
          'Durgapur',
          'Kalmakanda',
          'Kendua',
          'Khaliajuri',
          'Madan',
          'Mohanganj',
          'Netrokona Sadar',
          'Purbadhala',
        ],
      },
      {
        name: 'Sherpur',
        areas: ['Jhenaigati', 'Nakla', 'Nalitabari', 'Sherpur Sadar', 'Sreebardi'],
      },
    ],
  },
  {
    name: 'Rajshahi',
    districts: [
      {
        name: 'Bogura',
        areas: [
          'Adamdighi',
          'Bogura Sadar',
          'Dhunat',
          'Dhupchanchia',
          'Gabtali',
          'Kahaloo',
          'Nandigram',
          'Sariakandi',
          'Shajahanpur',
          'Sherpur',
          'Shibganj',
          'Sonatala',
        ],
      },
      {
        name: 'Chapainawabganj',
        areas: [
          'Bholahat',
          'Chapainawabganj Sadar',
          'Gomastapur',
          'Nachole',
          'Shibganj',
        ],
      },
      {
        name: 'Joypurhat',
        areas: ['Akkelpur', 'Joypurhat Sadar', 'Kalai', 'Khetlal', 'Panchbibi'],
      },
      {
        name: 'Naogaon',
        areas: [
          'Atrai',
          'Badalgachhi',
          'Dhamoirhat',
          'Manda',
          'Mohadevpur',
          'Naogaon Sadar',
          'Niamatpur',
          'Patnitala',
          'Porsha',
          'Raninagar',
          'Sapahar',
        ],
      },
      {
        name: 'Natore',
        areas: [
          'Bagatipara',
          'Baraigram',
          'Gurudaspur',
          'Lalpur',
          'Naldanga',
          'Natore Sadar',
          'Singra',
        ],
      },
      {
        name: 'Pabna',
        areas: [
          'Atgharia',
          'Bera',
          'Bhangura',
          'Chatmohar',
          'Faridpur',
          'Ishwardi',
          'Pabna Sadar',
          'Santhia',
          'Sujanagar',
        ],
      },
      {
        name: 'Rajshahi',
        areas: [
          'Bagha',
          'Bagmara',
          'Boalia',
          'Charghat',
          'Durgapur',
          'Godagari',
          'Mohanpur',
          'Motihar',
          'Paba',
          'Puthia',
          'Rajpara',
          'Shah Makhdum',
          'Tanore',
        ],
      },
      {
        name: 'Sirajganj',
        areas: [
          'Belkuchi',
          'Chauhali',
          'Kamarkhanda',
          'Kazipur',
          'Raiganj',
          'Shahjadpur',
          'Sirajganj Sadar',
          'Tarash',
          'Ullapara',
        ],
      },
    ],
  },
  {
    name: 'Rangpur',
    districts: [
      {
        name: 'Dinajpur',
        areas: [
          'Birampur',
          'Biral',
          'Birganj',
          'Bochaganj',
          'Chirirbandar',
          'Dinajpur Sadar',
          'Ghoraghat',
          'Hakimpur',
          'Kaharole',
          'Khansama',
          'Nawabganj',
          'Parbatipur',
          'Phulbari',
        ],
      },
      {
        name: 'Gaibandha',
        areas: [
          'Gaibandha Sadar',
          'Gobindaganj',
          'Palashbari',
          'Phulchhari',
          'Sadullapur',
          'Saghata',
          'Sundarganj',
        ],
      },
      {
        name: 'Kurigram',
        areas: [
          'Bhurungamari',
          'Char Rajibpur',
          'Chilmari',
          'Kurigram Sadar',
          'Nageshwari',
          'Phulbari',
          'Rajarhat',
          'Raomari',
          'Ulipur',
        ],
      },
      {
        name: 'Lalmonirhat',
        areas: ['Aditmari', 'Hatibandha', 'Kaliganj', 'Lalmonirhat Sadar', 'Patgram'],
      },
      {
        name: 'Nilphamari',
        areas: ['Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Nilphamari Sadar', 'Saidpur'],
      },
      {
        name: 'Panchagarh',
        areas: ['Atwari', 'Boda', 'Debiganj', 'Panchagarh Sadar', 'Tetulia'],
      },
      {
        name: 'Rangpur',
        areas: [
          'Badarganj',
          'Gangachhara',
          'Kaunia',
          'Mithapukur',
          'Pirgachha',
          'Pirganj',
          'Rangpur Sadar',
          'Taraganj',
        ],
      },
      {
        name: 'Thakurgaon',
        areas: ['Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail', 'Thakurgaon Sadar'],
      },
    ],
  },
  {
    name: 'Sylhet',
    districts: [
      {
        name: 'Habiganj',
        areas: [
          'Ajmiriganj',
          'Bahubal',
          'Baniyachong',
          'Chunarughat',
          'Habiganj Sadar',
          'Lakhai',
          'Madhabpur',
          'Nabiganj',
          'Shayestaganj',
        ],
      },
      {
        name: 'Moulvibazar',
        areas: [
          'Barlekha',
          'Juri',
          'Kamalganj',
          'Kulaura',
          'Moulvibazar Sadar',
          'Rajnagar',
          'Sreemangal',
        ],
      },
      {
        name: 'Sunamganj',
        areas: [
          'Bishwambarpur',
          'Chhatak',
          'Derai',
          'Dharampasha',
          'Dowarabazar',
          'Jagannathpur',
          'Jamalganj',
          'Shantiganj',
          'Sullah',
          'Sunamganj Sadar',
          'Tahirpur',
        ],
      },
      {
        name: 'Sylhet',
        areas: [
          'Balaganj',
          'Beanibazar',
          'Bishwanath',
          'Companiganj',
          'Dakshin Surma',
          'Fenchuganj',
          'Golapganj',
          'Gowainghat',
          'Jaintiapur',
          'Kanaighat',
          'Osmani Nagar',
          'Sylhet Sadar',
          'Zakiganj',
        ],
      },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Lookups                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Division -> District -> Set(areas), built once at module load.
 *
 * `isValidLocation()` runs on every address write, and a nested `.find().find().includes()` over
 * ~500 strings on each one is work we can do exactly once instead.
 */
const INDEX: Map<string, Map<string, Set<string>>> = new Map(
  BD_DIVISIONS.map((division) => [
    division.name,
    new Map(division.districts.map((district) => [district.name, new Set(district.areas)])),
  ]),
)

export const DIVISION_NAMES: string[] = BD_DIVISIONS.map((division) => division.name)

/** Districts of a division, in the order declared above (alphabetical). Empty for a bad division. */
export function districtsOf(division: string): string[] {
  return BD_DIVISIONS.find((d) => d.name === division)?.districts.map((d) => d.name) ?? []
}

/** Areas of a district. Empty for a district that isn't in this division — which is the point. */
export function areasOf(division: string, district: string): string[] {
  const found = BD_DIVISIONS.find((d) => d.name === division)?.districts.find(
    (d) => d.name === district,
  )
  return found ? found.areas : []
}

/**
 * Does this division/district/area trio actually exist, together?
 *
 * The trio matters, not the three strings on their own: "Dhanmondi" is real and "Sylhet" is real,
 * but "Dhanmondi, Sylhet" is not — and an address that claims to be in Dhaka when it is in Sylhet
 * gets charged the wrong delivery fee and sent to the wrong hub.
 */
export function isValidLocation(division: string, district: string, area: string): boolean {
  return INDEX.get(division)?.get(district)?.has(area) ?? false
}
