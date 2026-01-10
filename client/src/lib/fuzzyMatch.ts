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
  'Bangsar South', 'Mid Valley', 'Pavilion', 'Publika'
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

export function getAutocompleteSuggestions(
  input: string, 
  type: 'location' | 'property' | 'all' = 'all'
): string[] {
  const normalizedInput = input.toLowerCase().trim();
  if (normalizedInput.length < 2) return [];
  
  let candidates: string[] = [];
  
  if (type === 'location' || type === 'all') {
    candidates = [...candidates, ...MALAYSIAN_LOCATIONS];
  }
  
  if (type === 'property' || type === 'all') {
    candidates = [...candidates, ...PROPERTY_TYPES];
  }
  
  return candidates
    .filter(c => c.toLowerCase().startsWith(normalizedInput))
    .slice(0, 8);
}
