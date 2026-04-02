import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function BusinessSetup() {
  const [businessName, setBusinessName] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ["/api/countries"],
    retry: false,
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/businesses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success",
        description: "Business setup completed successfully!",
      });
      // Refresh the page to redirect to dashboard
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to setup business. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCountryToggle = (countryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCountries([...selectedCountries, countryId]);
    } else {
      setSelectedCountries(selectedCountries.filter(id => id !== countryId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName.trim()) {
      toast({
        title: "Error",
        description: "Business name is required.",
        variant: "destructive",
      });
      return;
    }

    createBusinessMutation.mutate({
      name: businessName,
      accessibleCountries: selectedCountries,
    });
  };

  if (countriesLoading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-globe text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-secondary-900">Welcome to SDP Global Pay</h1>
          <p className="text-lg text-secondary-600 mt-2">Let's set up your business account</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Business Setup</CardTitle>
            <CardDescription>
              Configure your business account and select the countries where you'll hire workers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-base font-medium text-secondary-900 mb-4 block">
                  Select Countries (optional - you can modify this later)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-secondary-200 rounded-lg p-4">
                  {countries.map((country: any) => (
                    <div key={country.id} className="flex items-center space-x-3 p-2 hover:bg-secondary-50 rounded">
                      <Checkbox
                        id={country.id}
                        checked={selectedCountries.includes(country.id)}
                        onCheckedChange={(checked) => handleCountryToggle(country.id, !!checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor={country.id} className="text-sm font-medium text-secondary-900 cursor-pointer block">
                          {country.name}
                        </label>
                        <p className="text-xs text-secondary-600">{country.sdpEntity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-secondary-500 mt-2">
                  If no countries are selected, you'll have access to all countries by default.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="submit"
                  disabled={createBusinessMutation.isPending}
                  className="min-w-32"
                >
                  {createBusinessMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Setting up...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}