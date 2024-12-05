import React from 'react';
import { ThemeSelector } from '../components/dashboard/ThemeSelector';
import { BadgeGrid } from '../components/dashboard/BadgeGrid';

export default function Settings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="space-y-8">
        <ThemeSelector />
        <BadgeGrid />
      </div>
    </div>
  );
} 