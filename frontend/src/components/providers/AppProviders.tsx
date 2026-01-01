'use client';

import React, { ReactNode } from 'react';
import { BrandingProvider } from '@/context/BrandingContext';
import { ThemeProvider } from '@/context/ThemeContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BrandingProvider>
        {children}
      </BrandingProvider>
    </ThemeProvider>
  );
}

