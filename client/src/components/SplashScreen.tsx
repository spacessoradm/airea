import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  // DISABLED - Only use PWASplashFix to prevent duplicate logos
  useEffect(() => {
    onComplete();
  }, [onComplete]);

  return null; // Completely disabled to prevent duplicates
}

export default SplashScreen;