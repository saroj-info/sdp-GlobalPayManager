import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AuthenticatedLayoutProvider, useAuthenticatedLayout } from "@/contexts/AuthenticatedLayoutContext";

interface Country {
  id: number;
  name: string;
  code: string;
}

function AuthenticatedLayoutContent({ children }: { children: ReactNode }) {
  const { headerMetadata, setCountries } = useAuthenticatedLayout();
  
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['/api/countries'],
  });

  useEffect(() => {
    setCountries(countries);
  }, [countries]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header 
          title={headerMetadata.title}
          description={headerMetadata.description || ""}
          accessibleCountries={countries}
        />
        {children}
      </main>
    </div>
  );
}

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthenticatedLayoutProvider>
      <AuthenticatedLayoutContent>
        {children}
      </AuthenticatedLayoutContent>
    </AuthenticatedLayoutProvider>
  );
}
