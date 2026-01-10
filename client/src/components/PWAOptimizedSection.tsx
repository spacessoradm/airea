// PWA-optimized section wrapper for better iOS performance
import { ReactNode } from 'react';

interface PWAOptimizedSectionProps {
  children: ReactNode;
  className?: string;
  isPWA?: boolean;
  mobileClassName?: string;
  desktopClassName?: string;
}

export function PWAOptimizedSection({ 
  children, 
  className = '', 
  isPWA = false,
  mobileClassName = '',
  desktopClassName = ''
}: PWAOptimizedSectionProps) {
  const baseClasses = isPWA 
    ? `${className} ${mobileClassName} scrollable-area`
    : `${className} ${desktopClassName}`;

  return (
    <section className={baseClasses}>
      {children}
    </section>
  );
}