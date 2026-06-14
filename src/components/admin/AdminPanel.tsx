import React from 'react';
import { ComprehensiveAdminPanel } from './ComprehensiveAdminPanel';

interface AdminPanelProps {
  onViewChange?: (view: string) => void;
}

export function AdminPanel({ onViewChange }: AdminPanelProps = {}) {
  return <ComprehensiveAdminPanel />;
}