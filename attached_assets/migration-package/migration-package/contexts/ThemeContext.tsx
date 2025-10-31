import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { label: string; value: Theme }[];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage for saved theme
    const saved = localStorage.getItem('theme') as Theme;
    if (saved && ['light', 'dark'].includes(saved)) {
      return saved;
    }
    // Default to light theme
    return 'light';
  });

  const themes = [
    { label: 'Light', value: 'light' as Theme },
    { label: 'Dark', value: 'dark' as Theme },
  ];

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    if (theme !== 'light') {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    console.error('useTheme called outside of ThemeProvider');
    // Return a default theme instead of throwing
    return {
      theme: 'light' as const,
      setTheme: () => {},
      themes: [
        { label: 'Light', value: 'light' as const },
        { label: 'Dark', value: 'dark' as const },
      ]
    };
  }
  return context;
}