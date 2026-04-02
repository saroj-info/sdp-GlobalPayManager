import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/layout/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Building2, 
  Globe, 
  Send,
  CheckCircle,
  Users,
  HeadphonesIcon,
  Calendar,
  Shield,
  FileText
} from "lucide-react";
import { z } from "zod";
import { generateSDPBrochure } from "@/lib/generateBrochure";

const contactFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  country: z.string().min(1, "Please select your country"),
  company: z.string().min(2, "Company name is required"),
  hiringCountry: z.string().min(1, "Please select where you're looking to hire"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  spamProtection: z.string().min(1, "Please complete the spam protection"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const regionalOffices = [
  {
    region: "Americas",
    phone: "+1 (650) 924-9250",
    email: "americas@sdpglobalpay.com",
    countries: ["United States", "Canada"],
    timezone: "PST/EST",
    hours: "8 AM - 6 PM"
  },
  {
    region: "Europe",
    phone: "+44 (20) 8144 9229",
    email: "europe@sdpglobalpay.com",
    countries: ["United Kingdom", "Ireland"],
    timezone: "GMT/BST",
    hours: "9 AM - 5 PM"
  },
  {
    region: "Asia Pacific",
    phone: "+61 (2) 9233 2255",
    email: "apac@sdpglobalpay.com",
    countries: ["Australia", "New Zealand", "Singapore", "Japan"],
    timezone: "AEST/NZST",
    hours: "9 AM - 5 PM"
  }
];

const countries = [
  "Australia", "Canada", "India", "Ireland", "Japan", 
  "New Zealand", "Philippines", "Singapore", "United Kingdom", "United States"
];

const inquiryTypes = [
  "General Inquiry",
  "Sales & Pricing",
  "Worker Support",
  "Business Setup",
  "Technical Support",
  "Compliance Questions",
  "Partnership Opportunities"
];

function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mathChallenge, setMathChallenge] = useState({ question: '', answer: 0 });
  const { toast } = useToast();

  // Generate a simple math challenge for spam protection
  const generateMathChallenge = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    setMathChallenge({
      question: `What is ${num1} + ${num2}?`,
      answer: answer
    });
  };

  // Initialize math challenge on component mount
  useEffect(() => {
    generateMathChallenge();
  }, []);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "",
      company: "",
      hiringCountry: "",
      subject: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      return apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    // Verify spam protection
    const userAnswer = parseInt(data.spamProtection);
    if (userAnswer !== mathChallenge.answer) {
      toast({
        title: "Incorrect answer",
        description: "Please solve the math problem correctly.",
        variant: "destructive",
      });
      generateMathChallenge(); // Generate new challenge
      form.setValue('spamProtection', ''); // Clear the field
      return;
    }

    contactMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Thank You for Contacting Us!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Your message has been received and our team will respond within 24 hours.
              </p>
              <Button onClick={() => setIsSubmitted(false)} className="mr-4">
                Send Another Message
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Unleash Your Global Potential
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Talk to us today about your international hiring needs
            </p>
            <div className="flex justify-center items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-blue-600">
                <Globe className="h-4 w-4" />
                <span>10+ Countries</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <Users className="h-4 w-4" />
                <span>100,000+ Contracts</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <Building2 className="h-4 w-4" />
                <span>$2B+ Processed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    Get in Touch
                  </CardTitle>
                  <CardDescription>
                    Fill out the form below and our team will get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} data-testid="input-first-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Email</FormLabel>
                              <FormControl>
                                <Input placeholder="john@company.com" type="email" {...field} data-testid="input-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Country</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-country">
                                    <SelectValue placeholder="Select your country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {countries.map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Company Ltd" {...field} data-testid="input-company" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="hiringCountry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country You're Looking to Hire In</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-hiring-country">
                                    <SelectValue placeholder="Select hiring country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {countries.map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inquiry Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-subject">
                                    <SelectValue placeholder="Select inquiry type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {inquiryTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tell us about your international hiring needs..."
                                className="min-h-[120px]"
                                {...field}
                                data-testid="textarea-message"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Simple Math Captcha for Spam Protection */}
                      <FormField
                        control={form.control}
                        name="spamProtection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              Spam Protection: {mathChallenge.question}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your answer"
                                type="number"
                                {...field}
                                data-testid="input-spam-protection"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={contactMutation.isPending}
                        data-testid="button-submit"
                      >
                        {contactMutation.isPending ? (
                          <>Sending...</>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              
              {/* Regional Offices */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-600" />
                    Regional Offices
                  </CardTitle>
                  <CardDescription>
                    Direct lines to our regional teams
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {regionalOffices.map((office, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{office.region}</h4>
                        <Badge variant="outline">{office.timezone}</Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <a href={`tel:${office.phone}`} className="text-blue-600 hover:underline">
                            {office.phone}
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <a href={`mailto:${office.email}`} className="text-blue-600 hover:underline">
                            {office.email}
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{office.hours}</span>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span className="text-gray-600">{office.countries.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Support Options */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeadphonesIcon className="h-5 w-5 text-blue-600" />
                    Support Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-primary-50 to-accent-50">
                    <h4 className="font-semibold mb-2 text-primary-700">Download Services Brochure</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      PDF brochure for agencies & enterprises
                    </p>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full bg-primary-600 hover:bg-primary-700"
                      onClick={async () => {
                        try {
                          await generateSDPBrochure();
                        } catch (error) {
                          console.error('Failed to generate brochure:', error);
                        }
                      }}
                      data-testid="button-download-brochure"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download Brochure (PDF)
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">24/7 Worker Support</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Emergency support for workers worldwide
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open('tel:+61292332255', '_self')}
                      data-testid="button-call-support"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Support
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Schedule a Demo</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      See SDP Global Pay in action
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open('mailto:sales@sdpglobalpay.com?subject=Demo Request&body=Hello, I would like to schedule a demo of SDP Global Pay.', '_blank')}
                      data-testid="button-book-demo"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Demo
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Knowledge Base</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Self-service resources and guides
                    </p>
                    <Link href="/resources">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        data-testid="button-browse-resources"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Browse Resources
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card className="shadow-lg border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-blue-900 mb-1">
                      Average Response Time
                    </h4>
                    <p className="text-2xl font-bold text-blue-600 mb-1">4 hours</p>
                    <p className="text-sm text-blue-700">
                      During business hours
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const { isAuthenticated } = useAuth();

  // Public layout for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Navigation />
        <main>
          <ContactForm />
        </main>
      </div>
    );
  }

  // Authenticated layout with sidebar
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">Contact Support</h1>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Get help with your account, submit support requests, or contact our team directly.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm">
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  );
}