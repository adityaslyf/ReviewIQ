import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Github, Sparkles, CheckCircle, Mail, Linkedin, Twitter } from "lucide-react";
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
    <div className="min-h-screen force-light bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Card Container */}
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-gray-200 px-3 py-1 text-xs text-gray-600 mb-4 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                AI-powered PR Reviews
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
                Streamline Your Pull Request Reviews
                <br className="hidden md:block" />
                with a Thoughtful AI Reviewer
              </h1>
              <p className="mt-4 max-w-2xl mx-auto text-gray-600">
                ReviewIQ combines context-rich GitHub data, static analysis and AI to deliver
                actionable code suggestions, risk flags, and testing guidance—so your team ships faster.
              </p>

              <div className="mt-8 flex items-center justify-center gap-3">
                <Button onClick={handlePrimaryCta} className="h-11 px-6 bg-blue-600 hover:bg-blue-700">
                  {isAuthenticated ? "Go to Dashboard" : (
                    <span className="inline-flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      Sign in with GitHub
                    </span>
                  )}
                </Button>
                <Link to="/analysis">
                  <Button variant="outline" className="h-11 px-6">
                    View Analysis
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero preview (browser mock with image placeholder) */}
            <BrowserPreview />
          </div>
        </div>
      </section>


      {/* Key Benefits Section - aligned with browser preview */}
      <section className="py-12 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <KeyBenefitsCard />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            From Code Review to Production in Minutes
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Accelerate your development with AI-powered code reviews. Reduce 
            review time and optimize quality. Get started with ReviewIQ today!
          </p>
          <Button 
            onClick={() => window.location.href = '#'} 
            className="bg-green-400 hover:bg-green-500 text-gray-900 font-semibold px-8 py-3 rounded-full text-lg"
          >
            Start Reviewing
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function BrowserPreview() {
  return (
    <div className="mt-14 relative flex flex-col items-center">
      {/* Dashboard Image Preview */}
      <div className="w-full max-w-7xl rounded-2xl overflow-hidden shadow-2xl relative">
        <img 
          src={dashboardImage} 
          alt="ReviewIQ Dashboard Preview" 
          className="w-full h-auto rounded-2xl"
        />
      </div>
    </div>
  );
}


function KeyBenefitsCard() {
  const benefits = [
    {
      title: "Boosting Quality with Tech",
      description: "With advanced technology, we help you achieve top product quality. Discover how we can enhance your standards."
    },
    {
      title: "Optimization Production Process",
      description: "Boost factory efficiency and productivity with our innovative solutions. See how the latest technology can maximize your output."
    },
    {
      title: "AI-Driven Production",
      description: "Leverage the power of AI to transform your manufacturing processes, achieving faster and more effective results."
    }
  ];

  return (
    <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl p-12 md:p-16 border border-white/40">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Key Benefits of Our System for Your Business Efficiency
        </h2>
        <p className="text-lg text-gray-500 max-w-3xl">
          Our systems boost productivity, cut costs, and drive business growth.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex flex-col items-start gap-4">
            <div className="shrink-0">
              <CheckCircle className="h-6 w-6 text-gray-900" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-gray-500 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-400 rounded-lg flex items-center justify-center">
                <Github className="h-5 w-5 text-gray-900" />
              </div>
              <span className="text-xl font-bold">ReviewIQ</span>
            </div>
            <p className="text-gray-400 mb-6">
              Our AI-powered solutions make code reviews faster and more reliable. Contact us for more information.
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Team</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">AI Code Analysis</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GitHub Integration</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security Scanning</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Get In Touch</h3>
            <div className="space-y-3 text-gray-400">
              <a href="mailto:hello@reviewiq.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="h-4 w-4" />
                hello@reviewiq.com
              </a>
              <div className="flex gap-4 mt-6">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 ReviewIQ. All rights reserved
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms & Conditions
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}


