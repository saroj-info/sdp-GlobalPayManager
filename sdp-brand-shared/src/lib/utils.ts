import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// SDP Brand utility functions
export const brandColors = {
  primary: {
    50: 'hsl(25 100% 97%)',
    100: 'hsl(25 100% 91%)',
    500: 'hsl(25 100% 55%)',
    600: 'hsl(25 100% 50%)',
    700: 'hsl(25 100% 45%)',
  },
  secondary: {
    50: 'hsl(220 20% 98%)',
    100: 'hsl(220 20% 96%)',
    500: 'hsl(220 20% 30%)',
    600: 'hsl(220 20% 25%)',
    900: 'hsl(220 20% 15%)',
  },
  accent: {
    50: 'hsl(215 75% 97%)',
    100: 'hsl(215 75% 91%)',
    500: 'hsl(215 75% 45%)',
    600: 'hsl(215 75% 40%)',
  }
};

export const brandFonts = {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  serif: ['Georgia', 'serif'],
  mono: ['Menlo', 'monospace'],
};

// Currency formatting utilities (for Resources page)
export const CURRENCIES = {
  Australia: { code: "AUD", symbol: "A$" },
  USA: { code: "USD", symbol: "$" },
  "New Zealand": { code: "NZD", symbol: "NZ$" },
  Ireland: { code: "EUR", symbol: "€" },
  Philippines: { code: "PHP", symbol: "₱" },
  Japan: { code: "JPY", symbol: "¥" },
  Canada: { code: "CAD", symbol: "C$" },
  UK: { code: "GBP", symbol: "£" },
  Romania: { code: "RON", symbol: "lei" },
  Singapore: { code: "SGD", symbol: "S$" },
  Malaysia: { code: "MYR", symbol: "RM" },
  Vietnam: { code: "VND", symbol: "₫" },
  India: { code: "INR", symbol: "₹" },
  Brazil: { code: "BRL", symbol: "R$" },
  Pakistan: { code: "PKR", symbol: "₨" },
  "Sri Lanka": { code: "LKR", symbol: "Rs" },
  Germany: { code: "EUR", symbol: "€" },
};

export function formatCurrency(value: any, currencyCode: any) {
  if (Number.isNaN(value)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: currencyCode === "VND" ? 0 : 2,
    }).format(value || 0);
  } catch (e) {
    return `${value?.toFixed?.(2) ?? value}`;
  }
}