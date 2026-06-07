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
  'live-booty': 'price_BOOTY',
  'live-flexibility': 'price_FLEX',
  'live-power': 'price_POWER',
  'live-core': 'price_CORE',
};

// Video URLs - Upload to YouTube as unlisted and paste IDs here
// Example: https://www.youtube.com/watch?v=XXXXXXXXXXXX -> 'XXXXXXXXXXXX'
const COURSES = {
  'movement-lab-1': {
    title: 'Movement Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'movement',
    price: 49,
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
    title: 'Movement Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'movement',
    price: 49,
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
    title: 'Movement Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'movement',
    price: 49,
    color: '#C8A96E',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'sculpt-lab-1': {
    title: 'Sculpt Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'sculpt',
    price: 49,
    color: '#C1848B',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'sculpt-lab-2': {
    title: 'Sculpt Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'sculpt',
    price: 49,
    color: '#C1848B',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'sculpt-lab-3': {
    title: 'Sculpt Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'sculpt',
    price: 49,
    color: '#C1848B',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'strength-lab-1': {
    title: 'Strength Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'strength',
    price: 49,
    color: '#9B6B6F',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'strength-lab-2': {
    title: 'Strength Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'strength',
    price: 49,
    color: '#9B6B6F',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'strength-lab-3': {
    title: 'Strength Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'strength',
    price: 49,
    color: '#9B6B6F',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },

  'metabolic-lab-1': {
    title: 'Metabolic Lab 1',
    subtitle: 'Foundation Series',
    subtitleKey: 'foundation',
    category: 'metabolic',
    price: 49,
    color: '#D4A89A',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'metabolic-lab-2': {
    title: 'Metabolic Lab 2',
    subtitle: 'Intermediate Series',
    subtitleKey: 'intermediate',
    category: 'metabolic',
    price: 49,
    color: '#D4A89A',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'metabolic-lab-3': {
    title: 'Metabolic Lab 3',
    subtitle: 'Advanced Series',
    subtitleKey: 'advanced',
    category: 'metabolic',
    price: 49,
    color: '#D4A89A',
    lessons: Array.from({length: 12}, (_, i) => ({
      id: i+1, title: `Lesson ${i+1}`, duration: '25 min', videoId: 'YOUR_VIDEO_ID'
    }))
  },
  'live-booty': {
    title: 'Booty Lab',
    subtitle: 'Live · 2x per week',
    subtitleKey: 'live',
    category: 'live',
    price: 49,
    color: '#C1848B',
    zoomLink: 'https://zoom.us/j/YOUR_BOOTY_ZOOM_LINK',
    schedule: { en: 'Tuesday & Thursday · 18:00', tr: 'Sali & Persembe - 18:00', de: 'Dienstag & Donnerstag · 18:00' },
    descKey: 'liveBootyDesc',
    lessons: []
  },
  'live-flexibility': {
    title: 'Flexibility Lab',
    subtitle: 'Live · 1x per week',
    subtitleKey: 'live',
    category: 'live',
    price: 29,
    color: '#C8A96E',
    zoomLink: 'https://zoom.us/j/YOUR_FLEX_ZOOM_LINK',
    schedule: { en: 'Sunday · 10:00', tr: 'Pazar · 10:00', de: 'Sonntag · 10:00' },
    descKey: 'liveFlexDesc',
    lessons: []
  },
  'live-power': {
    title: 'Power Lab',
    subtitle: 'Live · 2x per week',
    subtitleKey: 'live',
    category: 'live',
    price: 49,
    color: '#9B6B6F',
    zoomLink: 'https://zoom.us/j/YOUR_POWER_ZOOM_LINK',
    schedule: { en: 'Monday & Wednesday · 07:00', tr: 'Pazartesi & Carsamba - 07:00', de: 'Montag & Mittwoch · 07:00' },
    descKey: 'livePowerDesc',
    lessons: []
  },
  'live-core': {
    title: 'Core & Burn Lab',
    subtitle: 'Live · 2x per week',
    subtitleKey: 'live',
    category: 'live',
    price: 49,
    color: '#4A4548',
    zoomLink: 'https://zoom.us/j/YOUR_CORE_ZOOM_LINK',
    schedule: { en: 'Tuesday & Friday · 12:00', tr: 'Sali & Cuma - 12:00', de: 'Dienstag & Freitag · 12:00' },
    descKey: 'liveCoreDesc',
    lessons: []
  }
};
