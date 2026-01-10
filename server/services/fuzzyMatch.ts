function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  
  return dp[m][n];
}

function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

export interface FuzzyMatchResult {
  original: string;
  matched: string;
  score: number;
}

export function fuzzyMatch(
  input: string,
  candidates: string[],
  threshold: number = 0.6
): FuzzyMatchResult | null {
  const normalizedInput = input.toLowerCase().trim();
  
  if (!normalizedInput) return null;
  
  let bestMatch: FuzzyMatchResult | null = null;
  let bestScore = 0;
  
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase();
    
    if (normalizedCandidate === normalizedInput) {
      return { original: input, matched: candidate, score: 1 };
    }
    
    if (normalizedCandidate.includes(normalizedInput) || 
        normalizedInput.includes(normalizedCandidate)) {
      const score = 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { original: input, matched: candidate, score };
      }
      continue;
    }
    
    const score = similarity(normalizedInput, normalizedCandidate);
    
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = { original: input, matched: candidate, score };
    }
  }
  
  return bestMatch;
}

export function fuzzyMatchAll(
  input: string,
  candidates: string[],
  threshold: number = 0.6,
  maxResults: number = 5
): FuzzyMatchResult[] {
  const normalizedInput = input.toLowerCase().trim();
  
  if (!normalizedInput) return [];
  
  const results: FuzzyMatchResult[] = [];
  
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase();
    
    let score: number;
    
    if (normalizedCandidate === normalizedInput) {
      score = 1;
    } else if (normalizedCandidate.startsWith(normalizedInput)) {
      score = 0.95;
    } else if (normalizedCandidate.includes(normalizedInput)) {
      score = 0.85;
    } else if (normalizedInput.includes(normalizedCandidate)) {
      score = 0.8;
    } else {
      score = similarity(normalizedInput, normalizedCandidate);
    }
    
    if (score >= threshold) {
      results.push({ original: input, matched: candidate, score });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

export const MALAYSIAN_LOCATIONS = [
  'Kuala Lumpur', 'KL', 'KLCC', 'Petaling Jaya', 'PJ', 'Subang Jaya',
  'Shah Alam', 'Cyberjaya', 'Putrajaya', 'Bangsar', 'Mont Kiara',
  'Damansara', 'Cheras', 'Ampang', 'Setapak', 'Kepong', 'Sentul',
  'Bukit Bintang', 'TTDI', 'Desa ParkCity', 'Hartamas',
  'Johor Bahru', 'JB', 'Iskandar Puteri', 'Senai', 'Kulai', 'Pasir Gudang',
  'Penang', 'Georgetown', 'Bayan Lepas', 'Butterworth', 'Gurney',
  'Ipoh', 'Taiping', 'Lumut', 'Teluk Intan',
  'Melaka', 'Malacca', 'Ayer Keroh',
  'Kota Kinabalu', 'KK', 'Sandakan', 'Tawau',
  'Kuching', 'Miri', 'Sibu', 'Bintulu',
  'Seremban', 'Port Dickson',
  'Alor Setar', 'Langkawi', 'Sungai Petani',
  'Kuantan', 'Temerloh', 'Bentong',
  'Kota Bharu', 'Kuala Terengganu',
  'Sunway', 'Bandar Sunway', 'Puchong', 'Kajang', 'Seri Kembangan',
  'Rawang', 'Klang', 'Port Klang', 'Ara Damansara', 'Kota Damansara',
  'Mutiara Damansara', 'Tropicana', 'Bukit Jalil', 'Sri Petaling',
  'Bangsar South', 'Mid Valley', 'Pavilion', 'Publika',
  'Setia Alam', 'Eco Park', 'Alam Impian', 'Glenmarie',
  'USJ', 'Bukit Tinggi', 'Bandar Mahkota Cheras', 'Serdang',
  'Balakong', 'Semenyih', 'Nilai', 'Bangi',
  'Taman Desa', 'Bangsar Baru', 'Sri Hartamas', 'Desa Sri Hartamas',
  'Taman Tun Dr Ismail', 'Kepong Baru', 'Segambut', 'Jalan Ipoh',
  'Wangsa Maju', 'Setapak Jaya', 'Gombak', 'Batu Caves',
  'Selayang', 'Taman Melawati', 'Ulu Klang', 'Ampang Jaya',
  'Taman Duta', 'Kenny Hills', 'Bukit Tunku', 'Country Heights'
];

export const PROPERTY_TYPES = [
  'apartment', 'condo', 'condominium', 'house', 'terrace', 'terraced house',
  'semi-d', 'semi-detached', 'bungalow', 'studio', 'penthouse', 'duplex',
  'townhouse', 'flat', 'service residence', 'serviced apartment', 'soho',
  'shop', 'office', 'retail', 'commercial', 'shoplot', 'shop lot',
  'warehouse', 'factory', 'industrial', 'land', 'agricultural'
];

export function suggestLocationCorrection(input: string): FuzzyMatchResult | null {
  return fuzzyMatch(input, MALAYSIAN_LOCATIONS, 0.65);
}

export function suggestPropertyTypeCorrection(input: string): FuzzyMatchResult | null {
  return fuzzyMatch(input, PROPERTY_TYPES, 0.6);
}

export function extractAndCorrectLocations(query: string): { 
  correctedQuery: string; 
  corrections: Array<{ original: string; corrected: string; score: number }> 
} {
  const words = query.split(/\s+/);
  const corrections: Array<{ original: string; corrected: string; score: number }> = [];
  let correctedQuery = query;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if (word.length < 3) continue;
    
    const exactMatch = MALAYSIAN_LOCATIONS.find(
      loc => loc.toLowerCase() === word.toLowerCase()
    );
    if (exactMatch) continue;
    
    const twoWords = i < words.length - 1 ? `${words[i]} ${words[i + 1]}` : null;
    if (twoWords) {
      const exactTwoWordMatch = MALAYSIAN_LOCATIONS.find(
        loc => loc.toLowerCase() === twoWords.toLowerCase()
      );
      if (exactTwoWordMatch) {
        i++;
        continue;
      }
    }
    
    const fuzzyResult = suggestLocationCorrection(word);
    if (fuzzyResult && fuzzyResult.score >= 0.7 && fuzzyResult.score < 1) {
      // Avoid replacing short words with much longer ones (e.g., "Jaya" → "Petaling Jaya")
      // Only correct if lengths are similar (within 50% difference)
      const lengthRatio = fuzzyResult.matched.length / word.length;
      if (lengthRatio > 1.5) continue; // Skip if corrected is much longer
      
      corrections.push({
        original: word,
        corrected: fuzzyResult.matched,
        score: fuzzyResult.score
      });
      
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      correctedQuery = correctedQuery.replace(regex, fuzzyResult.matched);
    }
  }
  
  return { correctedQuery, corrections };
}

export function extractAndCorrectPropertyTypes(query: string): {
  correctedQuery: string;
  corrections: Array<{ original: string; corrected: string; score: number }>
} {
  const words = query.split(/\s+/);
  const corrections: Array<{ original: string; corrected: string; score: number }> = [];
  let correctedQuery = query;
  
  for (const word of words) {
    if (word.length < 4) continue;
    
    const exactMatch = PROPERTY_TYPES.find(
      pt => pt.toLowerCase() === word.toLowerCase()
    );
    if (exactMatch) continue;
    
    const fuzzyResult = suggestPropertyTypeCorrection(word);
    if (fuzzyResult && fuzzyResult.score >= 0.7 && fuzzyResult.score < 1) {
      corrections.push({
        original: word,
        corrected: fuzzyResult.matched,
        score: fuzzyResult.score
      });
      
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      correctedQuery = correctedQuery.replace(regex, fuzzyResult.matched);
    }
  }
  
  return { correctedQuery, corrections };
}

export function applyTypoCorrections(query: string): {
  correctedQuery: string;
  allCorrections: Array<{ original: string; corrected: string; type: 'location' | 'property'; score: number }>;
  hasCorrectedTypos: boolean;
} {
  const locationResult = extractAndCorrectLocations(query);
  const propertyResult = extractAndCorrectPropertyTypes(locationResult.correctedQuery);
  
  const allCorrections = [
    ...locationResult.corrections.map(c => ({ ...c, type: 'location' as const })),
    ...propertyResult.corrections.map(c => ({ ...c, type: 'property' as const }))
  ];
  
  return {
    correctedQuery: propertyResult.correctedQuery,
    allCorrections,
    hasCorrectedTypos: allCorrections.length > 0
  };
}
