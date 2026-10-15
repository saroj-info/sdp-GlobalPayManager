import React, { useEffect, useState } from 'react';
import sdpLogoUrl from '@assets/SDP_Global_Pay_Logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'horizontal' | 'vertical' | 'icon';
  theme?: 'light' | 'dark';
  /**
   * A business's own logo URL. When set (and it loads), it replaces the SDP
   * Global Pay image in the same box; when empty or broken, the SDP logo shows.
   */
  src?: string | null;
  /** Alt text for a business logo (its name). */
  alt?: string;
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
  src,
  alt,
}: LogoProps) {
  const height = sizeClasses[size];
  const width = logoWidthClasses[size];

  // A business logo that fails to load (removed, 404) falls back to the SDP
  // logo. Reset when the URL changes so a new upload is tried again.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const showBusinessLogo = !!src && !failed;

  return (
    <div className={`${variant === 'icon' ? height + ' aspect-square' : width + ' ' + height} ${className}`}>
      <img
        src={showBusinessLogo ? src : sdpLogoUrl}
        alt={showBusinessLogo ? (alt || 'Business logo') : 'SDP Global Pay'}
        className="w-full h-full object-contain"
        style={{
          filter: !showBusinessLogo && theme === 'dark' ? 'brightness(0) invert(1)' : 'none'
        }}
        onError={showBusinessLogo ? () => setFailed(true) : undefined}
        data-testid={showBusinessLogo ? 'img-logo-business' : 'img-logo-sdp'}
      />
    </div>
  );

}
