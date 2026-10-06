import { ReactNode, useEffect, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BusinessProfileReminder } from "./BusinessProfileReminder";
import { AuthenticatedLayoutProvider, useAuthenticatedLayout } from "@/contexts/AuthenticatedLayoutContext";
import { useAuth } from "@/hooks/useAuth";
import { AiSearchModal } from "@/components/modals/ai-search-modal";

interface Country {
  id: number;
  name: string;
  code: string;
}

function AuthenticatedLayoutContent({ children }: { children: ReactNode }) {
  const { headerMetadata, setCountries, commandBarOpen, setCommandBarOpen } = useAuthenticatedLayout();
  const { user } = useAuth();
  const searchEnabled = (user as any)?.featureFlags?.aiSearchEnabled === true;

  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['/api/countries'],
  });

  useEffect(() => {
    setCountries(countries);
  }, [countries]);

  // Lock the viewport for authenticated pages so only <main> scrolls. The
  // matching CSS lives in index.css (`.app-shell { height: 100%; overflow: hidden }`).
  // Public pages (Landing, Login) don't get the class and keep natural scroll.
  // Layout effect: the wrapper below is `h-full`, so the class must be on
  // <html> and <body> before the first paint.
  useLayoutEffect(() => {
    document.documentElement.classList.add('app-shell');
    document.body.classList.add('app-shell');
    return () => {
      document.documentElement.classList.remove('app-shell');
      document.body.classList.remove('app-shell');
    };
  }, []);

  // The shell never scrolls the document, but tablet browsers shift it to keep
  // a focused field above the on-screen keyboard and can leave it shifted once
  // the keyboard closes. Touch can't scroll a locked document back, so the
  // header stays out of reach. Put it back when nothing is being typed into.
  useEffect(() => {
    let timer: number | undefined;
    const isEditable = (el: Element | null) =>
      !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || (el as HTMLElement).isContentEditable);
    const reset = () => {
      window.clearTimeout(timer);
      // Delay so moving from one field to the next doesn't count as "done typing".
      timer = window.setTimeout(() => {
        const viewport = window.visualViewport;
        if (viewport && Math.abs(viewport.scale - 1) > 0.01) return; // pinch-zoomed
        if (isEditable(document.activeElement)) return;
        if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
      }, 150);
    };
    document.addEventListener('focusout', reset);
    window.visualViewport?.addEventListener('resize', reset);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('focusout', reset);
      window.visualViewport?.removeEventListener('resize', reset);
    };
  }, []);

  // Global ⌘K / Ctrl+K to open the AI search command bar.
  // Only attached when the feature is enabled — otherwise the key remains free.
  useEffect(() => {
    if (!searchEnabled) return;
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandBarOpen(true);
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [searchEnabled, setCommandBarOpen]);

  return (
    // `overflow-hidden` on the outer container + `min-h-0` on <main> are the
    // standard Tailwind pattern for "fixed sidebar, content scrolls inside
    // main". Without them, a tall page (e.g. /sdp-invoices with many cards)
    // grows the flex container past the viewport and the whole window scrolls,
    // taking the sidebar with it. `h-full` resolves against the locked
    // html/body/#root chain (see index.css); do not use `h-screen` here.
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <BusinessProfileReminder />
        <Header
          title={headerMetadata.title}
          description={headerMetadata.description || ""}
          accessibleCountries={countries}
        />
        {children}
      </main>
      {searchEnabled && (
        <AiSearchModal open={commandBarOpen} onOpenChange={setCommandBarOpen} />
      )}
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
