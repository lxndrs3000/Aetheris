import type { FC } from 'react';

interface BottomNavProps {
  currentTab: 'home' | 'tree' | 'stats' | 'add';
  onTabChange: (tab: 'home' | 'tree' | 'stats' | 'add') => void;
}

export const BottomNav: FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  return (
    <div className="bottom-nav">
      <div 
        className={`nav-icon ${currentTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </div>
      
      <div 
        className={`nav-icon ${currentTab === 'stats' ? 'active' : ''}`}
        onClick={() => onTabChange('stats')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>

      <div 
        className={`nav-icon add-tab ${currentTab === 'add' ? 'active' : ''}`}
        onClick={() => onTabChange('add')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    </div>
  );
};
