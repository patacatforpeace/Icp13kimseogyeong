import { createContext, useContext } from 'react';

export const DarkCtx = createContext(false);
export const useDark = () => useContext(DarkCtx);

export function useChartColors() {
  const dark = useDark();
  return dark
    ? { ink: '#F0F0F0', accent: '#94A3B8', soft: '#5B6472', grid: '#2D3036', muted: '#A0A3AA', surface: '#18191C', success: '#4ADE80', danger: '#F87171', warning: '#FBBF24' }
    : { ink: '#171717', accent: '#64748B', soft: '#B8C1CE', grid: '#E5E7EB', muted: '#737373', surface: '#FFFFFF', success: '#16A34A', danger: '#DC2626', warning: '#D97706' };
}
