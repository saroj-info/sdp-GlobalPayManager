
interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'horizontal' | 'vertical' | 'icon';
  theme?: 'light' | 'dark';
  src?: string; // Allow custom logo source
}

const sizeClasses = {
  sm: 'h-10',
  md: 'h-14',
  lg: 'h-16',
  xl: 'h-20'
};

const logoWidthClasses = {
  sm: 'w-32',
  md: 'w-48',
  lg: 'w-56',
  xl: 'w-64'
};

export function SDPLogo({ 
  className = '', 
  size = 'md', 
  variant = 'horizontal',
  theme = 'light',
  src = '/assets/SDP_Global_Pay_Logo.png' // Default fallback path
}: LogoProps) {
  const height = sizeClasses[size];
  const width = logoWidthClasses[size];
  
  // For all variants, we'll use the official SDP logo image
  return (
    <div className={`${variant === 'icon' ? height + ' aspect-square' : width + ' ' + height} ${className}`}>
      <img
        src={src}
        alt="SDP Global Pay"
        className="w-full h-full object-contain"
        style={{
          filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none'
        }}
      />
    </div>
  );
}

export default SDPLogo;