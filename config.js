// ============================================================
// TRAIN WITH BUSE - LMS Config
// ============================================================
// Setup: Open supabase.com, create a new project
// Replace below with your Supabase project values:

const SUPABASE_URL = 'https://jgrnqqvmxqvfbxgvxuom.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xNmBmtMoxeeYsrtohlookw_yadawA3q';

// Stripe pricing (get from Stripe Dashboard)
const STRIPE_PRICES = {
  'movement-lab-1': 'price_MOVEMENT1',
  'movement-lab-2': 'price_MOVEMENT2',
  'movement-lab-3': 'price_MOVEMENT3',
  'sculpt-lab-1': 'price_SCULPT1',
  'sculpt-lab-2': 'price_SCULPT2',
  'sculpt-lab-3': 'price_SCULPT3',
  'strength-lab-1': 'price_STRENGTH1',
  'strength-lab-2': 'price_STRENGTH2',
  'strength-lab-3': 'price_STRENGTH3',
  'metabolic-lab-1': 'price_METABOLIC1',
  'metabolic-lab-2': 'price_METABOLIC2',
  'metabolic-lab-3': 'price_METABOLIC3',
  'live-lab-classes': 'price_LIVELAB',
};

// Video URLs - Upload to YouTube as unlisted and paste IDs here
// Example: https://www.youtube.com/watch?v=XXXXXXXXXXXX -> 'XXXXXXXXXXXX'
const COURSES = {
  'movement-lab-1': {
    comingSoon: true,
    title: 'Movement Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'movement',
    price: 89,
    color: '#C8A96E',
    lessons: [
      { id: 1, title: 'Lesson 1', duration: '18 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 2, title: 'Lesson 2', duration: '22 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 3, title: 'Lesson 3', duration: '25 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 4, title: 'Lesson 4', duration: '20 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 5, title: 'Lesson 5', duration: '24 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 6, title: 'Lesson 6', duration: '21 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 7, title: 'Lesson 7', duration: '23 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 8, title: 'Lesson 8', duration: '19 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 9, title: 'Lesson 9', duration: '26 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 10, title: 'Lesson 10', duration: '30 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 11, title: 'Lesson 11', duration: '22 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 12, title: 'Lesson 12', duration: '35 min', videoId: 'YOUR_VIDEO_ID' },
    ]
  },
  'movement-lab-2': {
    comingSoon: true,
    title: 'Movement Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'movement',
    price: 89,
    color: '#C8A96E',
    lessons: [
      { id: 1, title: 'Lesson 1', duration: '20 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 2, title: 'Lesson 2', duration: '25 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 3, title: 'Lesson 3', duration: '28 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 4, title: 'Lesson 4', duration: '24 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 5, title: 'Lesson 5', duration: '22 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 6, title: 'Lesson 6', duration: '26 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 7, title: 'Lesson 7', duration: '30 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 8, title: 'Lesson 8', duration: '20 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 9, title: 'Lesson 9', duration: '25 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 10, title: 'Lesson 10', duration: '32 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 11, title: 'Lesson 11', duration: '20 min', videoId: 'YOUR_VIDEO_ID' },
      { id: 12, title: 'Lesson 12', duration: '38 min', videoId: 'YOUR_VIDEO_ID' },
    ]
  },
  'movement-lab-3': {
    comingSoon: true,
    title: 'Movement Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'movement',
    price: 89,
    color: '#C8A96E',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'sculpt-lab-1': {
    comingSoon: true,
    title: 'Sculpt Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'sculpt',
    price: 89,
    color: '#C1848B',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'sculpt-lab-2': {
    comingSoon: true,
    title: 'Sculpt Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'sculpt',
    price: 89,
    color: '#C1848B',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'sculpt-lab-3': {
    comingSoon: true,
    title: 'Sculpt Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'sculpt',
    price: 89,
    color: '#C1848B',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'strength-lab-1': {
    comingSoon: true,
    title: 'Strength Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'strength',
    price: 89,
    color: '#9B6B6F',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'strength-lab-2': {
    comingSoon: true,
    title: 'Strength Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'strength',
    price: 89,
    color: '#9B6B6F',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'strength-lab-3': {
    comingSoon: true,
    title: 'Strength Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'strength',
    price: 89,
    color: '#9B6B6F',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },

  'metabolic-lab-1': {
    comingSoon: true,
    title: 'Metabolic Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'metabolic',
    price: 89,
    color: '#D4A89A',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'metabolic-lab-2': {
    comingSoon: true,
    title: 'Metabolic Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'metabolic',
    price: 89,
    color: '#D4A89A',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'metabolic-lab-3': {
    comingSoon: true,
    title: 'Metabolic Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'metabolic',
    price: 89,
    color: '#D4A89A',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'live-lab-classes': {
    title: 'Live Lab Classes',
    subtitle: 'Mon · Wed · Fri — Coming Soon',
    subtitleKey: 'live',
    category: 'live',
    price: 59,
    comingSoon: true,
    color: '#C1848B',
    zoomLink: 'https://zoom.us/j/YOUR_LIVELAB_ZOOM_LINK',
    schedule: { en: 'Mon · Wed · Fri · 18:00', tr: 'Pzt · Çar · Cum · 18:00', de: 'Mo · Mi · Fr · 18:00' },
    descKey: 'liveLabDesc',
    lessons: []
  }
};

// ============================================================
// BADGES — catalog of all achievements. Earned records live in the
// Supabase `user_badges` table (email-keyed); this is just the static
// "menu" of what exists, same pattern as COURSES above.
// type: 'auto'   — computed client-side in dashboard.html from existing
//                   lesson_progress data, user awards it to themselves
// type: 'manual' — awarded by Buse via admin.html (qualitative judgment
//                   an algorithm can't make, e.g. movement quality)
// category matches the Lab colors used elsewhere on the site (welcome.html
// bundle picker): movement=gold, sculpt=rose, strength=rose-dark,
// metabolic=nude. general uses gold as the default achievement tone.
// ============================================================
const BADGES = {
  'first-step': {
    category: 'general', color: '#C8A96E', type: 'auto', name: 'First Step',
    icon: 'footprint', nameKey: 'badgeFirstStep', descKey: 'badgeFirstStepDesc',
  },
  'getting-started': {
    category: 'general', color: '#C8A96E', type: 'auto', name: 'Getting Started',
    icon: 'calendar', nameKey: 'badgeGettingStarted', descKey: 'badgeGettingStartedDesc',
  },
  'monthly-consistency': {
    category: 'general', color: '#C8A96E', type: 'auto', name: 'Monthly Consistency',
    icon: 'trending-up', nameKey: 'badgeMonthlyConsistency', descKey: 'badgeMonthlyConsistencyDesc',
  },
  '100-lessons': {
    category: 'general', color: '#C8A96E', type: 'auto', name: '100 Lessons Completed',
    icon: 'trophy', nameKey: 'badge100Lessons', descKey: 'badge100LessonsDesc',
  },
  'movement-first-squat': {
    category: 'movement', color: '#C8A96E', type: 'manual', name: 'First Full-Depth Squat (Movement)',
    icon: 'squat', nameKey: 'badgeFirstSquat', descKey: 'badgeFirstSquatDesc',
  },
  'movement-shoulder-mobility': {
    category: 'movement', color: '#C8A96E', type: 'manual', name: 'Shoulder Mobility Milestone (Movement)',
    icon: 'mobility', nameKey: 'badgeShoulderMobility', descKey: 'badgeShoulderMobilityDesc',
  },
  'sculpt-first-10-reps': {
    category: 'sculpt', color: '#C1848B', type: 'manual', name: 'First 10 Reps Completed (Sculpt)',
    icon: 'reps', nameKey: 'badgeFirst10Reps', descKey: 'badgeFirst10RepsDesc',
  },
  'strength-increase-20': {
    category: 'strength', color: '#9B6B6F', type: 'manual', name: 'Strength Increase +20% (Strength)',
    icon: 'strength', nameKey: 'badgeStrength20', descKey: 'badgeStrength20Desc',
  },
  'metabolic-recovery': {
    category: 'metabolic', color: '#D4A89A', type: 'manual', name: 'Recovery Capacity Improved (Metabolic)',
    icon: 'heart', nameKey: 'badgeRecovery', descKey: 'badgeRecoveryDesc',
  },
};

// ============================================================
// LAB_WHY — short "why this Lab" micro-education blurb per category.
// Shared static content, embedded directly (not a T-object key) since
// it's used identically from both dashboard.html and programs.html,
// which each have their own separate T objects — same pattern already
// used for COURSES[x].schedule above.
// ============================================================
const LAB_WHY = {
  movement: {
    en: "Mobility and joint control come first — you can't meaningfully strengthen a movement your body can't yet access or control.",
    tr: 'Önce hareket alanı ve eklem kontrolü gelir — bedeninin erişemediği veya kontrol edemediği bir hareketi gerçek anlamda güçlendiremezsin.',
    de: 'Beweglichkeit und Gelenkkontrolle kommen zuerst — eine Bewegung, die dein Körper noch nicht erreichen oder kontrollieren kann, lässt sich nicht sinnvoll kräftigen.',
  },
  sculpt: {
    en: 'Structured training volume builds visible, functional muscle — not just for how you look, but for real strength, balance and long-term joint health.',
    tr: 'Planlı antrenman hacmi, görünür ve işlevsel kas geliştirir — sadece görünüm için değil, gerçek kuvvet, denge ve uzun vadeli eklem sağlığı için.',
    de: 'Strukturiertes Trainingsvolumen baut sichtbare, funktionale Muskulatur auf — nicht nur fürs Aussehen, sondern für echte Kraft, Balance und langfristige Gelenkgesundheit.',
  },
  strength: {
    en: "Real strength isn't about lifting more. It's about controlling the force your body produces — safely, and with confidence.",
    tr: 'Gerçek kuvvet daha ağır kaldırmak değildir. Bedeninin ürettiği kuvveti güvenle kontrol edebilmektir.',
    de: 'Echte Kraft bedeutet nicht, mehr zu heben. Es bedeutet, die Kraft, die dein Körper erzeugt, sicher zu kontrollieren.',
  },
  metabolic: {
    en: "Better conditioning isn't about exhausting you. It's about teaching your body to use energy more efficiently and recover faster.",
    tr: 'Daha iyi kondisyon seni tüketmek değildir. Bedenine enerjiyi daha verimli kullanmayı ve daha hızlı toparlanmayı öğretmektir.',
    de: 'Bessere Kondition soll dich nicht erschöpfen. Sie soll deinem Körper beibringen, Energie effizienter zu nutzen und schneller zu regenerieren.',
  },
};
