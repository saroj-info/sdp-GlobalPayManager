// Custom SVG icons for SDP Global Pay features

interface IconProps {
  className?: string;
}

export const ContractIcon = ({ className }: IconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {/* Document with signature line and pen */}
    <rect x="3" y="2" width="14" height="20" rx="2" />
    <path d="M7 6h6" />
    <path d="M7 10h6" />
    <path d="M7 14h4" />
    <path d="M11 14l6 6" />
    <path d="M17 14l3 3" />
    <circle cx="18" cy="15" r="1" />
  </svg>
);

export const PayrollIcon = ({ className }: IconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {/* Stack of money with currency symbols */}
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <rect x="4" y="4" width="16" height="12" rx="2" fill="currentColor" fillOpacity="0.1" />
    <rect x="6" y="2" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.05" />
    <path d="M12 8v4" />
    <path d="M10 10h4" />
    <circle cx="8" cy="10" r="1" />
    <path d="M16 8l1 1-1 1" />
  </svg>
);

export const ComplianceIcon = ({ className }: IconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {/* Shield with checkmark and legal scale */}
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
    <rect x="1" y="1" width="6" height="2" rx="1" />
    <rect x="17" y="1" width="6" height="2" rx="1" />
    <path d="M4 3v2" />
    <path d="M20 3v2" />
  </svg>
);

export const TeamManagementIcon = ({ className }: IconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {/* Multiple people with management hierarchy */}
    <circle cx="8" cy="6" r="3" />
    <circle cx="16" cy="6" r="3" />
    <circle cx="12" cy="14" r="3" />
    <path d="M8 9v3" />
    <path d="M16 9v3" />
    <path d="M8 12h8" />
    <path d="M5 18v-1a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v1" />
    <path d="M9 21v-4" />
    <path d="M15 21v-4" />
  </svg>
);

export const TimeTrackingIcon = ({ className }: IconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {/* Clock with calendar and timesheet lines */}
    <circle cx="12" cy="12" r="8" />
    <path d="M12 6v6l4 2" />
    <rect x="2" y="2" width="6" height="6" rx="1" />
    <path d="M4 2v2" />
    <path d="M6 2v2" />
    <path d="M2 6h6" />
    <path d="M18 4h4" />
    <path d="M18 8h3" />
    <path d="M18 12h2" />
  </svg>
);

export const GlobalCoverageIcon = ({ className }: IconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {/* Globe with network connections and location pins */}
    <circle cx="12" cy="12" r="9" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
    <circle cx="16" cy="7" r="1" fill="currentColor" />
    <circle cx="7" cy="16" r="1" fill="currentColor" />
    <circle cx="17" cy="15" r="1" fill="currentColor" />
    <path d="M8 8l8-1" strokeWidth="1" opacity="0.5" />
    <path d="M7 16l9-1" strokeWidth="1" opacity="0.5" />
  </svg>
);