import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Github, Mail, Linkedin, Twitter } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import dashboardImage from "@/assets/dashboard.png";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

function AnimatedHeroText() {
  const textRef = useRef<HTMLDivElement>(null);
  const word1Ref = useRef<HTMLSpanElement>(null);
  const word2Ref = useRef<HTMLSpanElement>(null);
  const word3Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set([word1Ref.current, word2Ref.current, word3Ref.current], {
        y: 60,
        opacity: 0,
        rotationX: 45,
        transformOrigin: "50% 50% -30px",
      });

      // Create timeline for fast water-like flow
      const tl = gsap.timeline();

      // First word - "Developers," - quick flow
      tl.to(word1Ref.current, {
        duration: 0.6,
        y: 0,
        opacity: 1,
        rotationX: 0,
        ease: "power2.out",
      })
      // Second word - "welcome" - fast ripple
      .to(word2Ref.current, {
        duration: 0.5,
        y: 0,
        opacity: 1,
        rotationX: 0,
        ease: "back.out(1.2)",
      }, "-=0.3")
      // Third word - "home." - snappy finish
      .to(word3Ref.current, {
        duration: 0.4,
        y: 0,
        opacity: 1,
        rotationX: 0,
        ease: "power2.out",
      }, "-=0.2");

    }, textRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={textRef} className="relative">
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 leading-tight">
        <span 
          ref={word1Ref}
          className="inline-block"
          style={{ perspective: "1000px" }}
        >
          Developers,
        </span>
        <br />
        <span 
          ref={word2Ref}
          className="inline-block"
          style={{ perspective: "1000px" }}
        >
          welcome
        </span>{' '}
        <span 
          ref={word3Ref}
          className="inline-block"
          style={{ perspective: "1000px" }}
        >
          home.
        </span>
      </h1>
    </div>
  );
}

function LandingPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const requiresTextRef = useRef<HTMLParagraphElement>(null);

  const handlePrimaryCta = () => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    } else {
      login();
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set([descriptionRef.current, buttonRef.current, requiresTextRef.current], {
        y: 20,
        opacity: 0,
      });

      // Animate elements quickly after hero text
      const tl = gsap.timeline({ delay: 1.0 });
      
      tl.to(descriptionRef.current, {
        duration: 0.4,
        y: 0,
        opacity: 1,
        ease: "power2.out",
      })
      .to(buttonRef.current, {
        duration: 0.3,
        y: 0,
        opacity: 1,
        ease: "back.out(1.2)",
      }, "-=0.2")
      .to(requiresTextRef.current, {
        duration: 0.2,
        y: 0,
        opacity: 1,
        ease: "power2.out",
      }, "-=0.1");
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen force-light bg-gradient-to-b from-orange-50 to-yellow-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-12 md:py-16">

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <AnimatedHeroText />
            
            <p 
              ref={descriptionRef}
              className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-600 leading-relaxed"
            >
              ReviewIQ is a toolkit made by developers, for developers, that
              puts the focus on you and your work.
            </p>

            <div ref={buttonRef} className="mt-8">
              <Button 
                onClick={handlePrimaryCta} 
                className="h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isAuthenticated ? "Go to Dashboard" : (
                  <span className="inline-flex items-center gap-2">
                    Get started for free
                    <Github className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </div>

            <p ref={requiresTextRef} className="mt-4 text-sm text-gray-500">
              Requires GitHub account
            </p>
          </div>

          {/* Hero preview */}
          <BrowserPreview />
        </div>
      </section>


      {/* Key Benefits Section - aligned with browser preview */}
      <section className="py-16 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <KeyBenefitsCard />
        </div>
      </section>

      {/* Footer */}
      <div className="px-4">
      <Footer />
      </div>

    </div>
  );
}

function BrowserPreview() {
  return (
    <div className="mt-12 relative flex flex-col items-center">
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
                https://reviewiq.xyz/dashboard
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
      <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
        Built for modern development teams who value quality and speed.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12">
        {benefits.map((benefit, index) => (
          <div key={index} className="text-center">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              {benefit.title}
            </h3>
            <p className="text-gray-600 leading-relaxed text-base md:text-lg">
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
    <footer className="bg-gray-50 border-t border-gray-500 rounded-t-3xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Large Logo */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold">
            <span className="text-gray-800">review</span>
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">iq</span>
          </h1>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Product Links */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">AI Code Analysis</a></li>
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">GitHub Integration</a></li>
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Security Scanning</a></li>
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Performance Insights</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">About</a></li>
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Blog</a></li>
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Careers</a></li>
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Contact</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Connect</h3>
            <ul className="space-y-3">
              <li><a href="https://x.com/adityaslyf" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">X/Twitter</a></li>
              <li><a href="https://www.linkedin.com/in/aditya-varshney-089b33244/" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">LinkedIn</a></li>
              <li><a href="https://github.com/adityaslyf" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">GitHub</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Terms of Service</a></li>
              <li><a href="mailto:aditya.varshneymail@gmail.com" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">Contact us</a></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-300 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start">
            <div className="text-gray-600 text-sm mb-4 md:mb-0">
              <p className="font-bold">2025 REVIEWIQ. ALL RIGHTS RESERVED</p>
              <p className="text-xs mt-1">AI-powered code reviews that help developers ship better code faster.</p>
            </div>
            
            {/* Contact Info */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm">
                <span className="w-4 h-3 bg-orange-500 rounded-sm"></span>
                <span className="w-4 h-3 bg-white border border-gray-300 rounded-sm"></span>
                <span className="w-4 h-3 bg-green-500 rounded-sm"></span>
              </div>
              <span className="text-sm text-gray-600">aditya.varshneymail@gmail.com</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}




