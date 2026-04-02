import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/layout/navigation";
import { ArrowRight, Users, Building2, UserCheck, Globe, CheckCircle, Star, Shield, Clock, DollarSign, Heart, TrendingUp } from "lucide-react";
import globalMapImage from "@assets/image_1755584088045.png";
import whoWeHelpImage from "@assets/generated_images/Who_we_help_illustration_f0ba6c2f.png";
import mapBackground from "@assets/generated_images/Simple_black_white_outline_map_34ec6799.png";
import team1 from "@assets/IMG_2724_1758299760186.jpeg";
import team2 from "@assets/IMG_2725_1758299760186.jpeg";
import team3 from "@assets/IMG_2726_1758299760186.jpeg";
import team4 from "@assets/IMG_2727_1758299760186.jpeg";
import team5 from "@assets/IMG_2728_1758299760186.jpeg";
import team6 from "@assets/IMG_2730_1758299760186.jpeg";
import team7 from "@assets/IMG_2731_1758299760186.jpeg";
import team8 from "@assets/IMG_2732_1758299760186.jpeg";
import team9 from "@assets/IMG_2733_1758299760186.jpeg";
import team10 from "@assets/IMG_2734_1758299760186.jpeg";
import team11 from "@assets/IMG_2735_1758299760186.jpeg";
import team12 from "@assets/IMG_2736_1758299687757.jpeg";
import team13 from "@assets/IMG_2737_1758299687757.jpeg";
import team14 from "@assets/IMG_2738_1758299687757.jpeg";
import team15 from "@assets/IMG_2739_1758299687757.jpeg";
import team16 from "@assets/IMG_2740_1758299687757.jpeg";
import team17 from "@assets/IMG_2741_1758299687757.jpeg";
import team18 from "@assets/IMG_2742_1758299687757.jpeg";
import team19 from "@assets/IMG_2743_1758299687757.jpeg";
import team20 from "@assets/IMG_2744_1758299687757.jpeg";
import team21 from "@assets/IMG_2723_1758327981781.jpeg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />

      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center py-20 md:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-8">
              <Star className="w-4 h-4 mr-2 text-primary-600" />
              Trusted by 10,000+ businesses across 17 countries
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-secondary-900 mb-8 leading-tight">
              We Make <span className="text-primary-600 font-black">Global Contracting</span>
              <span className="block">and <span className="text-primary-600 font-black">Employment Easy</span></span>
            </h1>
            <p className="text-xl md:text-2xl text-secondary-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              For over twenty years, we've delighted <strong>businesses</strong>, <strong>agencies</strong>, and <strong>contractors</strong> by offering easy contracting and employment solutions. Our happy team, spread across five continents, delivers service with a smile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-16">
              <Button 
                size="xl"
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all"
                onClick={() => window.location.href = '/signup'}
              >
                Get Started Free
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
              <Button 
                size="xl"
                variant="outline"
                className="border-2 border-secondary-300 text-secondary-700 hover:bg-secondary-50 font-semibold px-8 py-4 text-lg"
                onClick={() => {
                  const demoModal = document.getElementById('demo-modal');
                  if (demoModal) {
                    demoModal.style.display = 'flex';
                  }
                }}
              >
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-8 text-sm text-secondary-500">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                No setup fees
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>

        {/* Hero Video Section */}
        <div className="py-20 bg-gradient-to-br from-secondary-50 to-primary-50">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">See How SDP Global Pay Works</h2>
            <p className="text-xl text-secondary-600 mb-12 max-w-3xl mx-auto">
              Watch our explainer video to understand how we make global employment and contracting simple for businesses worldwide.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-video">
                <video 
                  className="w-full h-full object-cover"
                  controls
                  poster="/api/placeholder-video-poster.jpg"
                  preload="metadata"
                >
                  <source src="/attached-assets/SDP%20Global%20Pay%20Hero%20Video_1755608317836.mp4" type="video/mp4" />
                  <div className="flex items-center justify-center h-full bg-black text-white">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎬</div>
                      <h3 className="text-2xl font-bold mb-2">SDP Global Pay Explainer</h3>
                      <p className="text-lg text-gray-300">Your browser doesn't support video playback</p>
                    </div>
                  </div>
                </video>
              </div>
              
              {/* Video Overlay for Fallback */}
              <div id="video-fallback" className="absolute inset-0 bg-black flex items-center justify-center hidden">
                <div className="text-center text-white p-8">
                  <div className="text-6xl mb-6">🎬</div>
                  <h3 className="text-2xl font-bold mb-4">SDP Global Pay Explainer Video</h3>
                  <p className="text-lg text-gray-300 mb-6">Learn how we simplify global employment and contracting</p>
                  <Button 
                    className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3"
                    onClick={() => {
                      // For now, show the demo instead
                      const demoModal = document.getElementById('demo-modal');
                      if (demoModal) {
                        demoModal.style.display = 'flex';
                      }
                    }}
                  >
                    Watch Interactive Demo Instead
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Video Description */}
            <div className="mt-8 text-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="bg-white/70 rounded-lg p-4">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-semibold text-secondary-900 mb-1">Fast Setup</h4>
                  <p className="text-sm text-secondary-600">Get started in minutes</p>
                </div>
                <div className="bg-white/70 rounded-lg p-4">
                  <div className="text-2xl mb-2">🌍</div>
                  <h4 className="font-semibold text-secondary-900 mb-1">Global Reach</h4>
                  <p className="text-sm text-secondary-600">17+ countries supported</p>
                </div>
                <div className="bg-white/70 rounded-lg p-4">
                  <div className="text-2xl mb-2">✅</div>
                  <h4 className="font-semibold text-secondary-900 mb-1">100% Compliant</h4>
                  <p className="text-sm text-secondary-600">Automated compliance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Who We Help Section */}
        <div className="py-20 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">Who We Help</h2>
            <p className="text-xl text-secondary-600 mb-12 max-w-3xl mx-auto">
              We help solve contracting bottlenecks for a wide range of people and organisations from every industry.
            </p>
            
            {/* Professional Team Photo */}
            <div className="max-w-3xl mx-auto mb-16">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white p-6" style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                <img 
                  src={whoWeHelpImage} 
                  alt="Hand-drawn cartoon with labeled characters: Freelancer/Contractor completing €2,500 contracts, Recruiter earning margins, and Business Client finding international talent - all connected through SDP Global Pay platform with Euro and Dollar currency symbols" 
                  className="w-full h-auto rounded-2xl"
                />
              </div>
              <p className="text-sm text-slate-500 mt-4 text-center italic">Connecting contractors, recruiters, and businesses worldwide</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border border-primary-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2 bg-gradient-to-br from-white to-primary-50">
              <CardHeader className="text-center p-8">
                <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-200 transition-colors group-hover:scale-110 transform duration-300">
                  <UserCheck className="text-primary-600 w-10 h-10" />
                </div>
                <CardTitle className="text-primary-600 text-2xl font-bold mb-4">Contractors</CardTitle>
                <CardDescription className="text-secondary-600 text-lg leading-relaxed">
                  We make the whole process of contracting easy. We do the heavy lifting allowing you to focus on what you do best.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-accent-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2 bg-gradient-to-br from-white to-accent-50">
              <CardHeader className="text-center p-8">
                <div className="w-20 h-20 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-accent-200 transition-colors group-hover:scale-110 transform duration-300">
                  <Users className="text-accent-600 w-10 h-10" />
                </div>
                <CardTitle className="text-accent-600 text-2xl font-bold mb-4">Recruiters</CardTitle>
                <CardDescription className="text-secondary-600 text-lg leading-relaxed">
                  We help recruiters increase their revenue. We manage your back office, so you are free to focus on growing your business.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-secondary-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2 bg-gradient-to-br from-white to-secondary-50">
              <CardHeader className="text-center p-8">
                <div className="w-20 h-20 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-secondary-200 transition-colors group-hover:scale-110 transform duration-300">
                  <Building2 className="text-secondary-600 w-10 h-10" />
                </div>
                <CardTitle className="text-secondary-600 text-2xl font-bold mb-4">Business / Enterprise</CardTitle>
                <CardDescription className="text-secondary-600 text-lg leading-relaxed">
                  We solve contingent workforce bottlenecks with a global perspective, and execute our solutions with local expertise.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Global Reach Section */}
        <div className="py-20 bg-gradient-to-br from-secondary-50 via-primary-50 to-accent-50">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">Global Reach, Local Touch</h2>
            <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
              Since 2004, SDP has been solving contingent workforce bottlenecks across five continents, expanding to 17 countries with comprehensive employment solutions.
            </p>
            
            {/* Global Map Image */}
            <div className="max-w-6xl mx-auto mb-16">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white p-4">
                <img 
                  src={globalMapImage} 
                  alt="SDP Global Pay worldwide presence across 17 countries" 
                  className="w-full h-auto rounded-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-600/10 to-transparent rounded-xl"></div>
              </div>
              <p className="text-sm text-secondary-500 mt-4 italic">
                Our global team collaborating across 17 countries to deliver seamless employment solutions
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4 max-w-7xl mx-auto">
            {[
              { name: 'Australia', code: 'AU', year: '2004', flag: '🇦🇺', icon: '🦘' },
              { name: 'New Zealand', code: 'NZ', year: '2009', flag: '🇳🇿', icon: '🥝' },
              { name: 'United States', code: 'US', year: '2017', flag: '🇺🇸', icon: '🦅' },
              { name: 'United Kingdom', code: 'GB', year: '2020', flag: '🇬🇧', icon: '🦁' },
              { name: 'Singapore', code: 'SG', year: '2021', flag: '🇸🇬', icon: '🏙️' },
              { name: 'Ireland', code: 'IE', year: '2022', flag: '🇮🇪', icon: '🍀' },
              { name: 'Philippines', code: 'PH', year: '2023', flag: '🇵🇭', icon: '🌴' },
              { name: 'Canada', code: 'CA', year: '2023', flag: '🇨🇦', icon: '🍁' },
              { name: 'Japan', code: 'JP', year: '2024', flag: '🇯🇵', icon: '🌸' },
              { name: 'India', code: 'IN', year: '2015', flag: '🇮🇳', icon: '🐅' },
              { name: 'Romania', code: 'RO', year: '2024', flag: '🇷🇴', icon: '🏰' },
              { name: 'Malaysia', code: 'MY', year: '2024', flag: '🇲🇾', icon: '🌺' },
              { name: 'Vietnam', code: 'VN', year: '2024', flag: '🇻🇳', icon: '🏮' },
              { name: 'Brazil', code: 'BR', year: '2024', flag: '🇧🇷', icon: '🌴' },
            ].map((country, index) => (
              <div key={country.code} className="group">
                <div className="p-6 bg-white rounded-xl border border-secondary-200 hover:border-primary-300 hover:shadow-lg transition-all transform hover:-translate-y-1 group-hover:scale-105">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col items-center justify-center mx-auto mb-4 group-hover:from-primary-100 group-hover:to-primary-200 transition-all">
                    <div className="text-4xl mb-1 group-hover:scale-110 transition-transform">{country.flag}</div>
                    <div className="text-2xl group-hover:scale-110 transition-transform">{country.icon}</div>
                  </div>
                  <div className="text-sm font-bold text-secondary-900 mb-1">{country.name}</div>
                  <div className="text-xs text-primary-600 font-semibold">Since {country.year}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose SDP Section */}
        <div className="py-20 bg-gradient-to-br from-green-50 via-teal-50 to-blue-50">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">Why Choose SDP Global Pay?</h2>
            <p className="text-xl text-secondary-600 mb-12 max-w-3xl mx-auto">
              With over 20 years of experience, we deliver comprehensive global employment solutions that simplify your international workforce management.
            </p>
            
            {/* Global Team Map with Real Photos */}
            <div className="max-w-4xl mx-auto mb-16">
              <div className="relative rounded-3xl overflow-hidden shadow-xl bg-white p-8">
                <div className="relative w-full h-96 rounded-2xl overflow-hidden">
                  {/* Background Map */}
                  <img 
                    src={mapBackground}
                    alt="World map outline"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Real Team Member Photos in Wave Pattern Left to Right */}
                  <img src={team1} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '45%', left: '5%'}} data-testid="team-photo-1" />
                  <img src={team2} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '35%', left: '9%'}} data-testid="team-photo-2" />
                  <img src={team3} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '25%', left: '13%'}} data-testid="team-photo-3" />
                  <img src={team4} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '20%', left: '17%'}} data-testid="team-photo-4" />
                  <img src={team5} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '18%', left: '21%'}} data-testid="team-photo-5" />
                  <img src={team6} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '20%', left: '25%'}} data-testid="team-photo-6" />
                  <img src={team7} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '25%', left: '29%'}} data-testid="team-photo-7" />
                  <img src={team8} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '32%', left: '33%'}} data-testid="team-photo-8" />
                  <img src={team9} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '40%', left: '37%'}} data-testid="team-photo-9" />
                  <img src={team10} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '48%', left: '41%'}} data-testid="team-photo-10" />
                  <img src={team11} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '55%', left: '45%'}} data-testid="team-photo-11" />
                  <img src={team12} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '60%', left: '49%'}} data-testid="team-photo-12" />
                  <img src={team13} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '58%', left: '53%'}} data-testid="team-photo-13" />
                  <img src={team14} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '52%', left: '57%'}} data-testid="team-photo-14" />
                  <img src={team15} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '45%', left: '61%'}} data-testid="team-photo-15" />
                  <img src={team16} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '38%', left: '65%'}} data-testid="team-photo-16" />
                  <img src={team17} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '30%', left: '69%'}} data-testid="team-photo-17" />
                  <img src={team18} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '25%', left: '73%'}} data-testid="team-photo-18" />
                  <img src={team19} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '22%', left: '77%'}} data-testid="team-photo-19" />
                  <img src={team20} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '25%', left: '81%'}} data-testid="team-photo-20" />
                  <img src={team21} alt="SDP Team Member" className="absolute w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-lg" style={{top: '30%', left: '85%'}} data-testid="team-photo-21" />
                </div>
                
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-bold text-secondary-900 mb-3">Human-Centered Service</h3>
                  <p className="text-lg text-secondary-700 leading-relaxed max-w-3xl mx-auto">
                    Behind every solution is a real person dedicated to your success, not just automated processes. Our global team of experts personally guides each client with genuine care and expertise, providing human support wherever you are in the world.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border border-primary-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-200 transition-colors">
                  <Shield className="text-primary-600 w-8 h-8" />
                </div>
                <CardTitle className="text-primary-600 text-xl font-bold mb-4">100% Compliant</CardTitle>
                <CardDescription className="text-secondary-600 leading-relaxed">
                  Full employment law compliance across all 17 countries with automatic updates to regulations and local expertise.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-accent-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-accent-200 transition-colors">
                  <Globe className="text-accent-600 w-8 h-8" />
                </div>
                <CardTitle className="text-accent-600 text-xl font-bold mb-4">Global Scale</CardTitle>
                <CardDescription className="text-secondary-600 leading-relaxed">
                  Operate across 17 countries with unified processes, local banking, and multi-currency support for seamless global operations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
                  <Star className="text-green-600 w-8 h-8" />
                </div>
                <CardTitle className="text-green-600 text-xl font-bold mb-4">Expert Support</CardTitle>
                <CardDescription className="text-secondary-600 leading-relaxed">
                  Dedicated support team across five continents providing local expertise and 24/7 assistance for all your employment needs.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12">
            <Card className="border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2">
              <CardHeader className="text-center p-6">
                <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <Clock className="text-blue-600 w-7 h-7" />
                </div>
                <CardTitle className="text-blue-600 text-lg font-bold mb-3">Fast Setup</CardTitle>
                <CardDescription className="text-secondary-600 leading-relaxed">
                  Get started in as little as 24 hours with automated onboarding, contract generation, and immediate payroll processing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2">
              <CardHeader className="text-center p-6">
                <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <DollarSign className="text-purple-600 w-7 h-7" />
                </div>
                <CardTitle className="text-purple-600 text-lg font-bold mb-3">Bang for Your Buck</CardTitle>
                <CardDescription className="text-secondary-600 leading-relaxed">
                  One low monthly price, no setup fees, or minimum deposits. What you see is what you pay. No surprises. Cancel any time.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-pink-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2">
              <CardHeader className="text-center p-6">
                <div className="w-14 h-14 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-pink-200 transition-colors">
                  <Heart className="text-pink-600 w-7 h-7" />
                </div>
                <CardTitle className="text-pink-600 text-lg font-bold mb-3">Happy Contractors & Employees</CardTitle>
                <CardDescription className="text-secondary-600 leading-relaxed">
                  Our people-first approach ensures satisfaction for both contractors and employees with streamlined processes and reliable support.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-12 max-w-4xl mx-auto">
            <Card className="border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors">
                  <TrendingUp className="text-orange-600 w-8 h-8" />
                </div>
                <CardTitle className="text-orange-600 text-xl font-bold mb-4">Trusted by Thousands</CardTitle>
                <CardDescription className="text-secondary-600 leading-relaxed text-lg">
                  SDP Global Pay is part of SDP Solutions, a trusted digital partner having paid over <strong className="text-orange-600">$2 billion in payments</strong>, 
                  processed <strong className="text-orange-600">100,000+ contracts</strong> and more. Join our growing community of satisfied customers and contractors worldwide.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Demo Modal */}
        <div 
          id="demo-modal" 
          className="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const modal = document.getElementById('demo-modal');
              if (modal) modal.style.display = 'none';
            }
          }}
        >
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-secondary-900">SDP Global Pay Demo</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const modal = document.getElementById('demo-modal');
                  if (modal) modal.style.display = 'none';
                }}
                className="text-secondary-500 hover:text-secondary-700"
              >
                ✕
              </Button>
            </div>
            
            {/* Interactive Video-Style Demo */}
            <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl p-8 mb-6">
              <div className="text-center mb-8">
                <h4 className="text-xl font-bold text-secondary-900 mb-2">See How Easy Global Employment Can Be!</h4>
                <p className="text-secondary-600">Watch our 45-second journey from signup to global payments</p>
              </div>
              
              {/* Video-Style Player */}
              <div className="bg-black rounded-lg p-8 mb-6 relative min-h-[400px] flex items-center justify-center">
                {/* Video Player Controls */}
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                
                {/* Demo Content */}
                <div className="w-full text-center demo-play-btn">
                  <div className="text-white">
                    <div className="text-6xl mb-6">🎬</div>
                    <h3 className="text-2xl font-bold mb-4">SDP Global Pay Demo</h3>
                    <p className="text-lg text-gray-300 mb-8">Experience the complete journey from business signup to global payments</p>
                    <Button 
                      className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-full text-lg"
                      onClick={() => {
                        const playButton = document.querySelector('.demo-play-btn') as HTMLElement;
                        const content = document.getElementById('demo-content');
                        
                        if (playButton && content) {
                          playButton.style.display = 'none';
                          content.classList.remove('hidden');
                          
                          const steps = [
                            {
                              title: "Business Signup",
                              desc: "Sarah creates TechCorp account",
                              screen: `
                                <div class="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
                                  <div class="text-center mb-4">
                                    <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <span class="text-primary-600 font-bold text-xl">S</span>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800">Create Business Account</h3>
                                  </div>
                                  <div class="space-y-3">
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Business Name:</span>
                                      <span class="text-sm font-medium text-gray-800">TechCorp Solutions</span>
                                    </div>
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Country:</span>
                                      <span class="text-sm font-medium text-gray-800">United States</span>
                                    </div>
                                    <div class="flex items-center space-x-2 p-2 bg-primary-50 rounded border border-primary-200">
                                      <span class="text-sm text-primary-600">✓ Account created successfully!</span>
                                    </div>
                                  </div>
                                </div>
                              `
                            },
                            {
                              title: "Add Worker",
                              desc: "Onboard John from Australia",
                              screen: `
                                <div class="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
                                  <div class="text-center mb-4">
                                    <div class="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <span class="text-accent-600 font-bold text-xl">J</span>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800">Add New Worker</h3>
                                  </div>
                                  <div class="space-y-3">
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Name:</span>
                                      <span class="text-sm font-medium text-gray-800">John Smith</span>
                                    </div>
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Location:</span>
                                      <span class="text-sm font-medium text-gray-800">Sydney, Australia</span>
                                    </div>
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Type:</span>
                                      <span class="text-sm font-medium text-gray-800">Contractor</span>
                                    </div>
                                    <div class="bg-accent-600 text-white text-center py-2 px-4 rounded text-sm font-medium">
                                      Send Onboarding Link
                                    </div>
                                  </div>
                                </div>
                              `
                            },
                            {
                              title: "Generate Contract",
                              desc: "Auto-generated compliant contract",
                              screen: `
                                <div class="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
                                  <div class="text-center mb-4">
                                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <span class="text-green-600 font-bold text-xl">📝</span>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800">Contract Template</h3>
                                  </div>
                                  <div class="space-y-3">
                                    <div class="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                                      <div class="text-sm font-medium text-gray-800 mb-1">Australia Contractor Agreement</div>
                                      <div class="text-xs text-gray-600">Rate: $75/hour | Duration: 6 months</div>
                                    </div>
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Status:</span>
                                      <span class="text-sm font-medium text-green-600">✓ Compliance Verified</span>
                                    </div>
                                    <div class="bg-green-600 text-white text-center py-2 px-4 rounded text-sm font-medium">
                                      Send for E-Signature
                                    </div>
                                  </div>
                                </div>
                              `
                            },
                            {
                              title: "Submit Invoice",
                              desc: "John submits monthly invoice",
                              screen: `
                                <div class="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
                                  <div class="text-center mb-4">
                                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <span class="text-blue-600 font-bold text-xl">$</span>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800">Create Invoice</h3>
                                  </div>
                                  <div class="space-y-3">
                                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Hours:</span>
                                      <span class="text-sm font-medium text-gray-800">66.67 hrs</span>
                                    </div>
                                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Rate:</span>
                                      <span class="text-sm font-medium text-gray-800">$75.00/hr</span>
                                    </div>
                                    <div class="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                                      <span class="text-sm font-medium text-blue-600">Total:</span>
                                      <span class="text-sm font-bold text-blue-600">$5,000 USD</span>
                                    </div>
                                    <div class="bg-blue-600 text-white text-center py-2 px-4 rounded text-sm font-medium">
                                      Submit Invoice
                                    </div>
                                  </div>
                                </div>
                              `
                            },
                            {
                              title: "Process Payment",
                              desc: "SDP handles compliance & taxes",
                              screen: `
                                <div class="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
                                  <div class="text-center mb-4">
                                    <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <span class="text-purple-600 font-bold text-xl">⚡</span>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800">Payment Processing</h3>
                                  </div>
                                  <div class="space-y-3">
                                    <div class="p-2 bg-green-50 rounded border border-green-200">
                                      <div class="flex items-center space-x-2">
                                        <span class="text-green-500">✓</span>
                                        <span class="text-sm text-green-700">Invoice Approved</span>
                                      </div>
                                    </div>
                                    <div class="p-2 bg-green-50 rounded border border-green-200">
                                      <div class="flex items-center space-x-2">
                                        <span class="text-green-500">✓</span>
                                        <span class="text-sm text-green-700">Tax Calculations Complete</span>
                                      </div>
                                    </div>
                                    <div class="p-2 bg-yellow-50 rounded border border-yellow-200">
                                      <div class="flex items-center space-x-2">
                                        <span class="text-yellow-500">⏳</span>
                                        <span class="text-sm text-yellow-700">Processing Payment...</span>
                                      </div>
                                    </div>
                                    <div class="text-xs text-gray-500 text-center">
                                      USD → AUD conversion: 1.50 rate
                                    </div>
                                  </div>
                                </div>
                              `
                            },
                            {
                              title: "Payment Complete",
                              desc: "John receives payment in Australia",
                              screen: `
                                <div class="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
                                  <div class="text-center mb-4">
                                    <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <span class="text-orange-600 font-bold text-xl">🌏</span>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800">Payment Successful</h3>
                                  </div>
                                  <div class="space-y-3">
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <div class="text-center">
                                        <div class="text-2xl font-bold text-green-600 mb-1">$7,500 AUD</div>
                                        <div class="text-sm text-green-700">Deposited to John's Account</div>
                                      </div>
                                    </div>
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Bank:</span>
                                      <span class="text-sm font-medium text-gray-800">Commonwealth Bank</span>
                                    </div>
                                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                      <span class="text-sm text-gray-600">Time:</span>
                                      <span class="text-sm font-medium text-gray-800">18 hours</span>
                                    </div>
                                    <div class="bg-green-100 text-green-800 text-center py-2 px-4 rounded text-sm font-medium">
                                      ✓ Transaction Complete
                                    </div>
                                  </div>
                                </div>
                              `
                            }
                          ];
                          
                          let stepIndex = 0;
                          const interval = setInterval(() => {
                            if (stepIndex < steps.length) {
                              const step = steps[stepIndex];
                              content.innerHTML = `
                                <div class="text-center px-4">
                                  <h3 class="text-xl font-bold text-white mb-2">${step.title}</h3>
                                  <p class="text-sm text-gray-300 mb-6">${step.desc}</p>
                                  
                                  <div class="mb-6">
                                    ${step.screen}
                                  </div>
                                  
                                  <div class="mt-6">
                                    <div class="w-80 bg-gray-700 rounded-full h-3 mx-auto mb-2">
                                      <div class="bg-primary-500 h-3 rounded-full transition-all duration-1000" style="width: ${((stepIndex + 1) / 6) * 100}%"></div>
                                    </div>
                                    <p class="text-sm text-gray-400">Step ${stepIndex + 1} of 6 - ${step.title}</p>
                                  </div>
                                </div>
                              `;
                              stepIndex++;
                            } else {
                              content.innerHTML = `
                                <div class="text-white text-center px-4">
                                  <div class="text-6xl mb-6">✅</div>
                                  <h3 class="text-2xl font-bold text-green-400 mb-4">Demo Complete!</h3>
                                  <p class="text-lg mb-6">See how SDP Global Pay streamlines international payments</p>
                                  
                                  <div class="bg-white rounded-lg p-6 max-w-sm mx-auto shadow-lg mb-6">
                                    <div class="text-center">
                                      <div class="text-4xl mb-3">🎉</div>
                                      <h4 class="text-lg font-bold text-gray-800 mb-2">Success Summary</h4>
                                      <div class="text-sm text-gray-600 space-y-1">
                                        <div>• Business account created: 2 minutes</div>
                                        <div>• Worker onboarded: 5 minutes</div>
                                        <div>• Contract generated: Instant</div>
                                        <div>• Invoice processed: 1 day</div>
                                        <div>• Payment delivered: 18 hours</div>
                                      </div>
                                      <div class="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div class="text-green-600 font-semibold">Total Time: Under 24 hours</div>
                                        <div class="text-green-500 text-sm">From signup to global payment</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div class="inline-block bg-green-500/20 border border-green-400 rounded-lg p-4">
                                    <span class="text-green-300">🌏 Ready to start your global workforce journey?</span>
                                  </div>
                                </div>
                              `;
                              clearInterval(interval);
                              
                              setTimeout(() => {
                                if (playButton && content) {
                                  playButton.style.display = 'inline-block';
                                  content.classList.add('hidden');
                                }
                              }, 5000);
                            }
                          }, 5000);
                        }
                      }}
                    >
                      ▶ Play Demo
                    </Button>
                  </div>
                </div>
                
                <div id="demo-content" className="absolute inset-0 flex items-center justify-center hidden"></div>
              </div>
              
              {/* Demo Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/50 rounded-lg p-4">
                  <h5 className="font-semibold text-secondary-900 mb-2">What You'll See:</h5>
                  <ul className="text-sm text-secondary-600 space-y-1">
                    <li>• Quick business account setup</li>
                    <li>• International worker onboarding</li>
                    <li>• Automated contract generation</li>
                    <li>• Invoice processing & payments</li>
                  </ul>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <h5 className="font-semibold text-secondary-900 mb-2">Real Benefits:</h5>
                  <ul className="text-sm text-secondary-600 space-y-1">
                    <li>• 24-hour payment processing</li>
                    <li>• 100% compliance guaranteed</li>
                    <li>• Multi-currency support</li>
                    <li>• Global tax handling</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                size="lg"
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3"
                onClick={() => {
                  window.location.href = '/signup';
                }}
              >
                Start Your Journey Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* CTA Section - Moved Higher */}
        <div className="py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-transparent"></div>
              <div className="relative z-10 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Make Contracting Easy?</h2>
                <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto leading-relaxed">
                  Join thousands of happy contractors, agencies, and enterprises who trust SDP Solutions for their global workforce needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <Button 
                    size="xl"
                    className="bg-white text-primary-600 hover:bg-secondary-50 font-bold px-8 py-3 text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all"
                    onClick={() => window.location.href = '/signup'}
                  >
                    Get Started Free
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                  <Button 
                    size="xl"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-3 text-lg"
                    onClick={() => window.location.href = '/api/login'}
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
