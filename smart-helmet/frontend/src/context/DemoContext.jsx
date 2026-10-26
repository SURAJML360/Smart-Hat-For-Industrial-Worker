import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const checkDemo = async () => {
      try {
        const { data } = await api.get('/api/health');
        setIsDemoMode(!!data.demoMode);
      } catch {
        // Ignore – not critical
      }
    };
    checkDemo();
  }, []);

  const toggleDemo = () => setIsDemoMode((prev) => !prev);

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
};
