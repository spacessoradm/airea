import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Language = 'en' | 'ms' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  en: {
    // Navigation
    explore: 'Explore',
    insights: 'Insights',
    rewards: 'Rewards',
    dashboard: 'Dashboard',
    aiRecommendations: 'AI Recommendations',
    projectReviews: 'Project Reviews',
    yieldHeatMap: 'Yield Heat Map',
    
    // Authentication
    signIn: 'Sign In',
    getStarted: 'Get Started',
    signOut: 'Sign Out',
    myAccount: 'My Account',
    profile: 'Profile',
    favorites: 'Favorites',
    messages: 'Messages',
    settings: 'Settings',
    
    // Agent Portal
    agentDashboard: 'Agent Dashboard',
    addProperty: 'Add Property',
    agent: 'Agent',
    
    // Search
    searchProperties: 'Search Properties',
    findYourProperty: 'Find your perfect property',
    searchPlaceholder: 'Try "3-bedroom condo near KLCC under 800k"',
    searchButton: 'Search',
    
    // Landing Page
    heroTitle: 'AI-driven real estate, tailored to you',
    heroSubtitle: 'Discover your perfect property with intelligent search and personalized recommendations',
    viewAllProperties: 'View All Properties',
    trendingNow: 'Trending Properties',
    aiRecommendationsTitle: 'AI-Powered Recommendations',
    aiRecommendationsDesc: 'Get personalized property suggestions based on your preferences',
    
    // Property Details
    price: 'Price',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    sqft: 'sq ft',
    propertyType: 'Property Type',
    location: 'Location',
    viewDetails: 'View Details',
    
    // Common
    menu: 'Menu',
    logout: 'Logout',
    exploreProperties: 'Explore Properties',
    loading: 'Loading...',
    noResults: 'No properties found',
    tryDifferentSearch: 'Try a different search term',
    
    // Property Types
    condominium: 'Condominium',
    apartment: 'Apartment',
    townhouse: 'Townhouse',
    house: 'House',
    commercial: 'Commercial',
    industrial: 'Industrial',
    
    // Listing Types
    sale: 'For Sale',
    rent: 'For Rent',
    
    // Property Detail Page
    save: 'Save',
    contactAgent: 'Contact Agent',
    perMonth: 'per month',
    description: 'Description',
    amenities: 'Amenities',
    legalInformation: 'Legal Information',
    tenure: 'Tenure',
    titleType: 'Title Type',
    landTitleType: 'Land Title Type',
    interestedMessage: 'Interested in this property? Send a message to the agent.',
    messagePlaceholder: 'Hi, I\'m interested in this property. Could you provide more information?',
    sendMessage: 'Send Message',
    sending: 'Sending...',
    callAgent: 'Call Agent',
    secureInquiry: 'Your inquiry is secure and will be shared only with the agent',
    
    // Landing Page Sections
    recommendedForYou: 'Recommended for You',
    basedOnPopular: 'Based on popular searches and featured properties',
    popularSearches: 'Popular Searches',
    featuredProperties: 'Featured Properties',
    
    // Landing Page Hero
    forSale: 'For Sale',
    forRent: 'For Rent',
    searchPlaceholderMain: 'Ask me anything — e.g. "condo near MRT below RM2500"',
    
    // Search & Filters
    filters: 'Filters',
    sortBy: 'Sort By',
    priceRange: 'Price Range',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    areaSize: 'Area Size',
    resultsFound: 'results found',
    noPropertiesFound: 'No properties found',
    tryDifferentFilters: 'Try adjusting your filters',
    clearFilters: 'Clear Filters',
    applyFilters: 'Apply Filters',
    
    // Property Card
    builtUp: 'Built-up',
    landArea: 'Land Area',
    
    // Footer
    aboutUs: 'About Us',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    contactUs: 'Contact Us',
    allRightsReserved: 'All rights reserved',
    
    // Messages & Notifications
    noMessages: 'No messages yet',
    noFavorites: 'No favorites yet',
    startBrowsing: 'Start browsing to save your favorite properties',
    
    // SimpleLanding specific
    yourPersonalPropertyAI: 'Your Personal Property AI',
    searchNaturally: 'Search naturally: "3-bedroom near KLCC" or "condo under RM500k"',
    tryAISearch: 'Try AI Search',
    recentlyViewed: 'Recently Viewed',
    recentViewedListings: 'Recent Viewed listings',
    featured: 'Featured',
    viewAll: 'View All',
    guidesInsights: 'Guides & Insights',
    all: 'All',
    guides: 'Guides',
    insights: 'Insights',
    news: 'News',
    
    // SimpleSearch specific
    buy: 'Buy',
    aiPoweredSuggestions: 'AI-Powered Suggestions',
    recent: 'Recent'
  },
  ms: {
    // Navigation
    explore: 'Jelajah',
    insights: 'Wawasan',
    rewards: 'Ganjaran',
    dashboard: 'Papan Pemuka',
    aiRecommendations: 'Cadangan AI',
    projectReviews: 'Ulasan Projek',
    yieldHeatMap: 'Peta Haba Hasil',
    
    // Authentication
    signIn: 'Log Masuk',
    getStarted: 'Mulakan',
    signOut: 'Log Keluar',
    myAccount: 'Akaun Saya',
    profile: 'Profil',
    favorites: 'Kegemaran',
    messages: 'Mesej',
    settings: 'Tetapan',
    
    // Agent Portal
    agentDashboard: 'Papan Pemuka Ejen',
    addProperty: 'Tambah Hartanah',
    agent: 'Ejen',
    
    // Search
    searchProperties: 'Cari Hartanah',
    findYourProperty: 'Cari hartanah sempurna anda',
    searchPlaceholder: 'Cuba "kondo 3 bilik tidur dekat KLCC bawah 800k"',
    searchButton: 'Cari',
    
    // Landing Page
    heroTitle: 'Hartanah dipacu AI, disesuaikan untuk anda',
    heroSubtitle: 'Temui hartanah sempurna anda dengan carian pintar dan cadangan peribadi',
    viewAllProperties: 'Lihat Semua Hartanah',
    trendingNow: 'Hartanah Popular',
    aiRecommendationsTitle: 'Cadangan Berdasarkan AI',
    aiRecommendationsDesc: 'Dapatkan cadangan hartanah peribadi berdasarkan keutamaan anda',
    
    // Property Details
    price: 'Harga',
    bedrooms: 'Bilik Tidur',
    bathrooms: 'Bilik Air',
    sqft: 'kaki persegi',
    propertyType: 'Jenis Hartanah',
    location: 'Lokasi',
    viewDetails: 'Lihat Butiran',
    
    // Common
    menu: 'Menu',
    logout: 'Log Keluar',
    exploreProperties: 'Jelajah Hartanah',
    loading: 'Memuatkan...',
    noResults: 'Tiada hartanah ditemui',
    tryDifferentSearch: 'Cuba istilah carian yang berbeza',
    
    // Property Types
    condominium: 'Kondominium',
    apartment: 'Apartmen',
    townhouse: 'Rumah Teres',
    house: 'Rumah',
    commercial: 'Komersial',
    industrial: 'Perindustrian',
    
    // Listing Types
    sale: 'Untuk Dijual',
    rent: 'Untuk Disewa',
    
    // Property Detail Page
    save: 'Simpan',
    contactAgent: 'Hubungi Ejen',
    perMonth: 'sebulan',
    description: 'Penerangan',
    amenities: 'Kemudahan',
    legalInformation: 'Maklumat Undang-undang',
    tenure: 'Pegangan',
    titleType: 'Jenis Hakmilik',
    landTitleType: 'Jenis Hakmilik Tanah',
    interestedMessage: 'Berminat dengan hartanah ini? Hantar mesej kepada ejen.',
    messagePlaceholder: 'Hai, saya berminat dengan hartanah ini. Bolehkah anda berikan maklumat lanjut?',
    sendMessage: 'Hantar Mesej',
    sending: 'Menghantar...',
    callAgent: 'Hubungi Ejen',
    secureInquiry: 'Pertanyaan anda selamat dan akan dikongsi hanya dengan ejen',
    
    // Landing Page Sections
    recommendedForYou: 'Disyorkan untuk Anda',
    basedOnPopular: 'Berdasarkan carian popular dan hartanah pilihan',
    popularSearches: 'Carian Popular',
    featuredProperties: 'Hartanah Pilihan',
    
    // Landing Page Hero
    forSale: 'Untuk Dijual',
    forRent: 'Untuk Disewa',
    searchPlaceholderMain: 'Tanya apa sahaja — contoh "kondo dekat MRT bawah RM2500"',
    
    // Search & Filters
    filters: 'Penapis',
    sortBy: 'Isih Mengikut',
    priceRange: 'Julat Harga',
    minPrice: 'Harga Minimum',
    maxPrice: 'Harga Maksimum',
    areaSize: 'Saiz Kawasan',
    resultsFound: 'keputusan dijumpai',
    noPropertiesFound: 'Tiada hartanah dijumpai',
    tryDifferentFilters: 'Cuba laraskan penapis anda',
    clearFilters: 'Kosongkan Penapis',
    applyFilters: 'Gunakan Penapis',
    
    // Property Card
    builtUp: 'Binaan',
    landArea: 'Kawasan Tanah',
    
    // Footer
    aboutUs: 'Tentang Kami',
    termsOfService: 'Terma Perkhidmatan',
    privacyPolicy: 'Dasar Privasi',
    contactUs: 'Hubungi Kami',
    allRightsReserved: 'Hak cipta terpelihara',
    
    // Messages & Notifications
    noMessages: 'Tiada mesej lagi',
    noFavorites: 'Tiada kegemaran lagi',
    startBrowsing: 'Mula melayari untuk menyimpan hartanah kegemaran anda',
    
    // SimpleLanding specific
    yourPersonalPropertyAI: 'AI Hartanah Peribadi Anda',
    searchNaturally: 'Cari secara semula jadi: "3 bilik tidur dekat KLCC" atau "kondo bawah RM500k"',
    tryAISearch: 'Cuba Carian AI',
    recentlyViewed: 'Dilihat Baru-baru Ini',
    recentViewedListings: 'Senarai yang Dilihat Baru-baru Ini',
    featured: 'Pilihan',
    viewAll: 'Lihat Semua',
    guidesInsights: 'Panduan & Wawasan',
    all: 'Semua',
    guides: 'Panduan',
    insights: 'Wawasan',
    news: 'Berita',
    
    // SimpleSearch specific
    buy: 'Beli',
    aiPoweredSuggestions: 'Cadangan Dikuasakan AI',
    recent: 'Terkini'
  },
  zh: {
    // Navigation
    explore: '探索',
    insights: '洞察',
    rewards: '奖励',
    dashboard: '仪表板',
    aiRecommendations: 'AI推荐',
    projectReviews: '项目评论',
    yieldHeatMap: '收益热力图',
    
    // Authentication
    signIn: '登录',
    getStarted: '开始',
    signOut: '登出',
    myAccount: '我的账户',
    profile: '个人资料',
    favorites: '收藏',
    messages: '消息',
    settings: '设置',
    
    // Agent Portal
    agentDashboard: '代理仪表板',
    addProperty: '添加房产',
    agent: '代理',
    
    // Search
    searchProperties: '搜索房产',
    findYourProperty: '找到您的完美房产',
    searchPlaceholder: '试试"KLCC附近800万以下的3室公寓"',
    searchButton: '搜索',
    
    // Landing Page
    heroTitle: 'AI驱动的房地产，为您量身定制',
    heroSubtitle: '通过智能搜索和个性化推荐发现您的完美房产',
    viewAllProperties: '查看所有房产',
    trendingNow: '热门房产',
    aiRecommendationsTitle: 'AI智能推荐',
    aiRecommendationsDesc: '根据您的偏好获得个性化房产建议',
    
    // Property Details
    price: '价格',
    bedrooms: '卧室',
    bathrooms: '浴室',
    sqft: '平方英尺',
    propertyType: '房产类型',
    location: '位置',
    viewDetails: '查看详情',
    
    // Common
    menu: '菜单',
    logout: '登出',
    exploreProperties: '探索房产',
    loading: '加载中...',
    noResults: '未找到房产',
    tryDifferentSearch: '尝试不同的搜索词',
    
    // Property Types
    condominium: '公寓',
    apartment: '公寓',
    townhouse: '联排别墅',
    house: '房屋',
    commercial: '商业',
    industrial: '工业',
    
    // Listing Types
    sale: '出售',
    rent: '出租',
    
    // Property Detail Page
    save: '保存',
    contactAgent: '联系代理',
    perMonth: '每月',
    description: '描述',
    amenities: '设施',
    legalInformation: '法律信息',
    tenure: '产权',
    titleType: '产权类型',
    landTitleType: '土地产权类型',
    interestedMessage: '对这个房产感兴趣？给代理发送消息。',
    messagePlaceholder: '您好，我对这个房产感兴趣。您能提供更多信息吗？',
    sendMessage: '发送消息',
    sending: '发送中...',
    callAgent: '致电代理',
    secureInquiry: '您的咨询是安全的，只会与代理分享',
    
    // Landing Page Sections
    recommendedForYou: '为您推荐',
    basedOnPopular: '基于热门搜索和精选房产',
    popularSearches: '热门搜索',
    featuredProperties: '精选房产',
    
    // Landing Page Hero
    forSale: '出售',
    forRent: '出租',
    searchPlaceholderMain: '问我任何问题 — 例如 "MRT附近2500令吉以下的公寓"',
    
    // Search & Filters
    filters: '筛选',
    sortBy: '排序方式',
    priceRange: '价格范围',
    minPrice: '最低价格',
    maxPrice: '最高价格',
    areaSize: '面积大小',
    resultsFound: '找到结果',
    noPropertiesFound: '未找到房产',
    tryDifferentFilters: '尝试调整筛选条件',
    clearFilters: '清除筛选',
    applyFilters: '应用筛选',
    
    // Property Card
    builtUp: '建筑面积',
    landArea: '土地面积',
    
    // Footer
    aboutUs: '关于我们',
    termsOfService: '服务条款',
    privacyPolicy: '隐私政策',
    contactUs: '联系我们',
    allRightsReserved: '版权所有',
    
    // Messages & Notifications
    noMessages: '暂无消息',
    noFavorites: '暂无收藏',
    startBrowsing: '开始浏览以保存您喜欢的房产',
    
    // SimpleLanding specific
    yourPersonalPropertyAI: '您的个人房产AI',
    searchNaturally: '自然搜索："KLCC附近3卧室"或"50万令吉以下公寓"',
    tryAISearch: '试用AI搜索',
    recentlyViewed: '最近浏览',
    recentViewedListings: '最近浏览的房源',
    featured: '精选',
    viewAll: '查看全部',
    guidesInsights: '指南和洞察',
    all: '全部',
    guides: '指南',
    insights: '洞察',
    news: '新闻',
    
    // SimpleSearch specific
    buy: '购买',
    aiPoweredSuggestions: 'AI智能建议',
    recent: '最近'
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    // Load saved language from localStorage on initial load
    const saved = localStorage.getItem('airea_language');
    return (saved as Language) || 'en';
  });

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('airea_language', lang);
    console.log('Language changed to:', lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  }, [language]);

  const contextValue = React.useMemo(() => ({ 
    language, 
    setLanguage: handleSetLanguage, 
    t 
  }), [language, handleSetLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    // Instead of throwing, provide fallback during development
    console.warn('useLanguage used outside LanguageProvider, providing fallback');
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: string) => key
    };
  }
  return context;
}