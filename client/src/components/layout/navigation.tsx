import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SDPLogo } from "@/components/ui/logo";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: "/resources", label: "Resources" },
    { href: "/solutions", label: "Solutions" },
    { href: "/country-guides", label: "Country Guides" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <div className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <SDPLogo size="md" variant="horizontal" theme="light" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-secondary-600 hover:text-secondary-900"
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <Link href="/login">
              <Button 
                variant="outline" 
                size="sm"
                className="border-primary-300 text-primary-600 hover:bg-primary-50"
                data-testid="nav-button-login"
              >
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button 
                size="sm"
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-lg"
                data-testid="nav-button-signup"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-secondary-600"
                  aria-label="Open navigation menu"
                  aria-expanded={isOpen}
                  data-testid="nav-button-mobile-menu"
                >
                  {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {menuItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50"
                        onClick={() => setIsOpen(false)}
                        data-testid={`nav-mobile-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                  <div className="pt-4 border-t space-y-3">
                    <Link href="/login">
                      <Button
                        variant="outline"
                        className="w-full border-primary-300 text-primary-600 hover:bg-primary-50"
                        onClick={() => setIsOpen(false)}
                        data-testid="nav-mobile-button-login"
                      >
                        Login
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold"
                        onClick={() => setIsOpen(false)}
                        data-testid="nav-mobile-button-signup"
                      >
                        Get Started Free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
