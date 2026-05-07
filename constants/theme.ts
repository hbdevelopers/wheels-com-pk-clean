// mobile/constants/theme.ts
export const COLORS = {
  primary: '#00E676',
  primaryDim: '#00C85A',
  primaryFaint: 'rgba(0,230,118,0.07)',
  primaryGlow: 'rgba(0,230,118,0.15)',
  bg: '#0A0A0B',
  bgCard: '#111114',
  bgElevated: '#18181C',
  border: '#1E1E24',
  white: '#FFFFFF',
  gray1: '#F0F0F0',
  gray2: '#B0B0B8',
  gray3: '#606068',
  gray4: '#2A2A32',
  red: '#FF4757',
  amber: '#FFB300',
  blue: '#3D8EFF',
  purple: '#9B59FF',
  whatsapp: '#25D366',
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B8',
    muted: '#606068',
    inverse: '#000000',
  },
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const RADIUS = {
  sm: 6, md: 10, lg: 14, xl: 16, xxl: 20, full: 999,
};

export const FONT = {
  sizes: { xs: 10, sm: 12, md: 13, base: 14, lg: 16, xl: 18, xxl: 22, xxxl: 28 },
  weights: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900' },
};

// mobile/constants/cities.ts
export const PAKISTAN_CITIES = [
  { name: 'Lahore', urdu: 'لاہور', province: 'Punjab', major: true },
  { name: 'Karachi', urdu: 'کراچی', province: 'Sindh', major: true },
  { name: 'Islamabad', urdu: 'اسلام آباد', province: 'Federal', major: true },
  { name: 'Rawalpindi', urdu: 'راولپنڈی', province: 'Punjab', major: true },
  { name: 'Faisalabad', urdu: 'فیصل آباد', province: 'Punjab', major: true },
  { name: 'Multan', urdu: 'ملتان', province: 'Punjab', major: true },
  { name: 'Gujranwala', urdu: 'گوجرانوالہ', province: 'Punjab', major: true },
  { name: 'Peshawar', urdu: 'پشاور', province: 'KPK', major: true },
  { name: 'Quetta', urdu: 'کوئٹہ', province: 'Balochistan', major: true },
  { name: 'Sialkot', urdu: 'سیالکوٹ', province: 'Punjab', major: false },
  { name: 'Hyderabad', urdu: 'حیدرآباد', province: 'Sindh', major: false },
  { name: 'Bahawalpur', urdu: 'بہاولپور', province: 'Punjab', major: false },
  { name: 'Sargodha', urdu: 'سرگودھا', province: 'Punjab', major: false },
  { name: 'Abbottabad', urdu: 'ایبٹ آباد', province: 'KPK', major: false },
  { name: 'Sukkur', urdu: 'سکھر', province: 'Sindh', major: false },
  { name: 'Jhang', urdu: 'جھنگ', province: 'Punjab', major: false },
  { name: 'Rahim Yar Khan', urdu: 'رحیم یار خان', province: 'Punjab', major: false },
  { name: 'Gujrat', urdu: 'گجرات', province: 'Punjab', major: false },
];

// mobile/constants/makes.ts  
export const VEHICLE_MAKES = {
  popular: [
    { name: 'Toyota', models: ['Corolla', 'Yaris', 'Fortuner', 'Hilux', 'Land Cruiser', 'Camry', 'Prado', 'Rush', 'Raize'] },
    { name: 'Honda', models: ['Civic', 'City', 'HR-V', 'Accord', 'Vezel', 'BRV', 'Freed', 'Fit'] },
    { name: 'Suzuki', models: ['Alto', 'Cultus', 'Swift', 'Jimny', 'Wagon R', 'Every', 'Bolan', 'Ravi'] },
    { name: 'Hyundai', models: ['Tucson', 'Sonata', 'Elantra', 'Santa Fe', 'Grand i10', 'Ioniq 5'] },
    { name: 'KIA', models: ['Sportage', 'Picanto', 'Sorento', 'Stonic', 'Stinger', 'EV6'] },
  ],
  others: [
    { name: 'Daihatsu', models: ['Cuore', 'Mira', 'Cast', 'Move', 'Tanto'] },
    { name: 'Mitsubishi', models: ['Outlander', 'Eclipse Cross', 'Pajero', 'Lancer'] },
    { name: 'Nissan', models: ['Sunny', 'Dayz', 'Note', 'X-Trail', 'Juke', 'Patrol'] },
    { name: 'BMW', models: ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5'] },
    { name: 'Mercedes-Benz', models: ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE'] },
    { name: 'Audi', models: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7'] },
    { name: 'MG', models: ['HS', 'ZS', 'RX5', '5', 'GT', 'Cyberster'] },
    { name: 'Chery', models: ['Tiggo 4 Pro', 'Tiggo 8 Pro', 'Arrizo 6 Pro'] },
    { name: 'BAIC', models: ['X55 II', 'BJ40 Plus'] },
    { name: 'Prince', models: ['Pearl', 'DFSK Glory 580'] },
  ],
};

export const TRANSMISSION_OPTIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
  { value: 'cvt', label: 'CVT' },
  { value: 'semi_automatic', label: 'Semi-Auto' },
];

export const FUEL_OPTIONS = [
  { value: 'petrol', label: 'Petrol', icon: '⛽' },
  { value: 'diesel', label: 'Diesel', icon: '🛢️' },
  { value: 'hybrid', label: 'Hybrid', icon: '🌿' },
  { value: 'electric', label: 'Electric', icon: '⚡' },
  { value: 'cng', label: 'CNG', icon: '🔵' },
  { value: 'lpg', label: 'LPG', icon: '🟡' },
];

export const BODY_TYPES = [
  { value: 'sedan', label: 'Sedan', icon: '🚗' },
  { value: 'suv', label: 'SUV', icon: '🚙' },
  { value: 'hatchback', label: 'Hatchback', icon: '🚘' },
  { value: 'pickup', label: 'Pickup', icon: '🛻' },
  { value: 'coupe', label: 'Coupe', icon: '🏎️' },
  { value: 'van', label: 'Van', icon: '🚐' },
  { value: 'crossover', label: 'Crossover', icon: '🚗' },
  { value: 'wagon', label: 'Wagon', icon: '🚗' },
];

// mobile/utils/format.ts
export const formatPKR = (amount: number): string => {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `${(amount / 100_000).toFixed(1)} Lac`;
  return amount.toLocaleString('en-PK');
};

export const formatMileage = (km: number): string => {
  if (km >= 1000) return `${(km / 1000).toFixed(0)}k km`;
  return `${km} km`;
};

export const formatRelativeTime = (date: string | Date): string => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-PK');
};

export const calculateEMI = (price: number, downPct: number, tenureYears: number = 5, annualRate: number = 22): number => {
  const principal = price * (1 - downPct / 100);
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  return Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
};
