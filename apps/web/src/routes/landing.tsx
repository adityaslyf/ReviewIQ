import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Github, Mail, Linkedin, Twitter } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import dashboardImage from "@/assets/dashboard.png";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const handlePrimaryCta = () => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    } else {
      login();
    }
  };

  return (
    <div className="min-h-screen force-light bg-gradient-to-b from-orange-50 to-yellow-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating circles */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-orange-200/30 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-200/40 rounded-full blur-lg"></div>
          <div className="absolute bottom-40 left-20 w-20 h-20 bg-pink-200/30 rounded-full blur-lg"></div>
          <div className="absolute bottom-20 right-10 w-28 h-28 bg-orange-300/20 rounded-full blur-xl"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-orange-200/50 rounded-full px-4 py-2 mb-8 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">AI-Powered Code Reviews</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 leading-tight">
              Developers,
              <br />
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                welcome home.
              </span>
            </h1>
            
            <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-gray-600 leading-relaxed">
              ReviewIQ is a toolkit made by developers, for developers, that
              puts the focus on you and your work.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={handlePrimaryCta} 
                className="h-14 px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {isAuthenticated ? "Go to Dashboard" : (
                  <span className="inline-flex items-center gap-2">
                    Get started for free
                    <Github className="h-5 w-5" />
                  </span>
                )}
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex -space-x-2">
                  {/* Girl avatar */}
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-lg">
                    👩‍💻
                  </div>
                  {/* Boy avatar */}
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-lg">
                    👨‍💻
                  </div>
                  {/* Additional developer */}
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-lg">
                    👩‍💼
                  </div>
                  {/* Count indicator */}
                  <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-600">
                    +5k
                  </div>
                </div>
                <span>developers trust ReviewIQ</span>
              </div>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Requires GitHub account • Free forever
            </p>
          </div>

          {/* Hero preview */}
          <BrowserPreview />
        </div>
      </section>


      {/* Key Benefits Section - aligned with browser preview */}
      <section className="py-20 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <KeyBenefitsCard />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function BrowserPreview() {
  return (
    <div className="mt-20 relative flex flex-col items-center">
      {/* Subtle glow effect behind the preview */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-yellow-400/10 to-pink-400/10 blur-3xl transform scale-110"></div>
      
      {/* Browser mockup */}
      <div className="w-full max-w-6xl relative">
        {/* Browser chrome */}
        <div className="bg-gray-100 rounded-t-xl px-4 py-3 border border-gray-200 border-b-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-500 border border-gray-200">
                https://reviewiq.com/dashboard
              </div>
            </div>
          </div>
        </div>
        
        {/* Dashboard Image Preview */}
        <div className="rounded-b-xl overflow-hidden shadow-2xl relative border border-gray-200 border-t-0">
          <img 
            src={dashboardImage} 
            alt="ReviewIQ Dashboard Preview" 
            className="w-full h-auto"
          />
          
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/3 via-transparent to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}
function KeyBenefitsCard() {
  const benefits = [
    {
      title: "AI-Powered Analysis",
      description: "Advanced AI reviews your code for quality, security, and performance issues with context-aware suggestions."
    },
    {
      title: "Seamless GitHub Integration",
      description: "Works directly with your GitHub workflow. No setup required - just connect and start reviewing."
    },
    {
      title: "Intelligent Insights",
      description: "Get actionable feedback on architecture, testing strategies, and potential improvements for every PR."
    }
  ];

  return (
    <div className="text-center">
      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
        Why developers choose ReviewIQ
      </h2>
      <p className="text-lg md:text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
        Built for modern development teams who value quality and speed.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-16">
        {benefits.map((benefit, index) => (
          <div key={index} className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-6">
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
            <p className="text-gray-600 leading-relaxed">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Github className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ReviewIQ</span>
            </div>
            <p className="text-gray-600 mb-6">
              AI-powered code reviews that help developers ship better code faster.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-3 text-gray-600">
              <li><a href="#" className="hover:text-gray-900 transition-colors">AI Code Analysis</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">GitHub Integration</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">Security Scanning</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">Performance Insights</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3 text-gray-600">
              <li><a href="#" className="hover:text-gray-900 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Connect</h3>
            <div className="space-y-3 text-gray-600">
              <a href="mailto:hello@reviewiq.com" className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <Mail className="h-4 w-4" />
                hello@reviewiq.com
              </a>
              <div className="flex gap-4 mt-6">
                <a href="#" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Linkedin className="h-5 w-5 text-gray-600" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Github className="h-5 w-5 text-gray-600" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Twitter className="h-5 w-5 text-gray-600" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © 2024 ReviewIQ. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}




