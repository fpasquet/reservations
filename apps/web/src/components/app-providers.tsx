'use client';

import type { ReactNode } from 'react';
import { MemberProvider } from './member-context';
import { ToastProvider } from './ui/toast';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <MemberProvider>{children}</MemberProvider>
    </ToastProvider>
  );
}
