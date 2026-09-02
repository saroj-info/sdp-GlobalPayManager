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
  // AI search command bar — one instance shared across the app.
  commandBarOpen: boolean;
  setCommandBarOpen: (next: boolean) => void;
}

const AuthenticatedLayoutContext = createContext<AuthenticatedLayoutContextType | undefined>(undefined);

export function AuthenticatedLayoutProvider({ children }: { children: ReactNode }) {
  const [headerMetadata, setHeaderMetadataState] = useState<HeaderMetadata>({
    title: "Dashboard",
    description: "",
  });
  const [countries, setCountriesState] = useState<any[]>([]);
  const [commandBarOpen, setCommandBarOpenState] = useState(false);

  const setHeaderMetadata = useCallback((metadata: HeaderMetadata) => {
    setHeaderMetadataState(metadata);
  }, []);

  const setCountries = useCallback((newCountries: any[]) => {
    setCountriesState(newCountries);
  }, []);

  const setCommandBarOpen = useCallback((next: boolean) => {
    setCommandBarOpenState(next);
  }, []);

  const contextValue = useMemo(
    () => ({
      headerMetadata,
      setHeaderMetadata,
      countries,
      setCountries,
      commandBarOpen,
      setCommandBarOpen,
    }),
    [headerMetadata, countries, setHeaderMetadata, setCountries, commandBarOpen, setCommandBarOpen]
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
