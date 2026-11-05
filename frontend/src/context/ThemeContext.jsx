import { readTheme, saveTheme } from '../utils/themePreference';
import { useState, useEffect } from 'react';
import { ThemeContext } from './theme-context';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return readTheme(() => window.localStorage);
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(() => window.localStorage, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

