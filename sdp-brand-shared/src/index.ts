// Styles
import './styles/brand.css';

// Components
export * from './components/ui';
export * from './components/pages';

// Utils
export * from './lib/utils';

// Re-export commonly used types
export type { ButtonProps } from './components/ui/button';

// Brand constants
export const BRAND_CONFIG = {
  name: 'SDP Global Pay',
  tagline: 'Making Global Contracting and Employment Easy',
  colors: {
    primary: 'hsl(25 100% 55%)',
    secondary: 'hsl(220 20% 25%)',
    accent: 'hsl(215 75% 45%)',
  },
  fonts: {
    primary: 'Inter',
  },
  countries: [
    'Australia', 'USA', 'New Zealand', 'Ireland', 'Philippines', 'Japan', 
    'Canada', 'UK', 'Romania', 'Singapore', 'Malaysia', 'Vietnam', 
    'India', 'Brazil', 'Pakistan', 'Sri Lanka', 'Germany'
  ]
} as const;