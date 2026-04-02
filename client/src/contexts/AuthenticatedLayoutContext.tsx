import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";

interface HeaderMetadata {
  title: string;
  description?: string;
}

interface AuthenticatedLayoutContextType {
  headerMetadata: HeaderMetadata;
  setHeaderMetadata: (metadata: HeaderMetadata) => void;
  countries: any[];
  setCountries: (countries: any[]) => void;
}

const AuthenticatedLayoutContext = createContext<AuthenticatedLayoutContextType | undefined>(undefined);

export function AuthenticatedLayoutProvider({ children }: { children: ReactNode }) {
  const [headerMetadata, setHeaderMetadataState] = useState<HeaderMetadata>({
    title: "Dashboard",
    description: "",
  });
  const [countries, setCountriesState] = useState<any[]>([]);

  const setHeaderMetadata = useCallback((metadata: HeaderMetadata) => {
    setHeaderMetadataState(metadata);
  }, []);

  const setCountries = useCallback((newCountries: any[]) => {
    setCountriesState(newCountries);
  }, []);

  const contextValue = useMemo(
    () => ({ headerMetadata, setHeaderMetadata, countries, setCountries }),
    [headerMetadata, countries, setHeaderMetadata, setCountries]
  );

  return (
    <AuthenticatedLayoutContext.Provider value={contextValue}>
      {children}
    </AuthenticatedLayoutContext.Provider>
  );
}

export function useAuthenticatedLayout() {
  const context = useContext(AuthenticatedLayoutContext);
  if (!context) {
    throw new Error("useAuthenticatedLayout must be used within AuthenticatedLayoutProvider");
  }
  return context;
}

// Hook for pages to set their header metadata
export function usePageHeader(title: string, description?: string) {
  const { setHeaderMetadata } = useAuthenticatedLayout();
  
  useEffect(() => {
    setHeaderMetadata({ title, description });
  }, [title, description]);
}
