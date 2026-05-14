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

  // Lock the viewport for authenticated pages so only <main> scrolls. The
  // matching CSS lives in index.css (`body.app-shell { overflow: hidden }`).
  // Public pages (Landing, Login) don't get the class and keep natural scroll.
  useEffect(() => {
    document.body.classList.add('app-shell');
    return () => { document.body.classList.remove('app-shell'); };
  }, []);

  return (
    // `overflow-hidden` on the outer container + `min-h-0` on <main> are the
    // standard Tailwind pattern for "fixed sidebar, content scrolls inside
    // main". Without them, a tall page (e.g. /sdp-invoices with many cards)
    // grows the flex container past 100vh and the whole window scrolls,
    // taking the sidebar with it.
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-y-auto">
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
