import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Github, ShieldCheck, Sparkles, Workflow, BarChart3, Clock3 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

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
                ReviewIQ combines context-rich GitHub data, static analysis and Gemini AI to deliver
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

      {/* Feature strip - card style */}
      <section className="py-8 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl p-8 border border-white/40">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              <FeatureItem
                icon={<Workflow className="h-5 w-5 text-blue-600" />}
                title="Full PR Context"
                desc="Diffs, files, commits, checks, issues and reviews—summarized for the model."
              />
              <FeatureItem
                icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
                title="Actionable Suggestions"
                desc="Refactors, tests and best practices with inline, copyable snippets."
              />
              <FeatureItem
                icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
                title="Static + AI"
                desc="ESLint, TypeScript and security scans blended with Gemini insights."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Secondary section - card style stats */}
      <section className="py-8 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl p-8 border border-white/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Avg. Review Time" value="-42%" hint="with AI suggestions" icon={<Clock3 className="h-4 w-4 text-blue-600" />} />
              <StatCard label="Bugs Caught Early" value="+31%" hint="via static checks" icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} />
              <StatCard label="Merge Confidence" value="↑" hint="clear final verdicts" icon={<BarChart3 className="h-4 w-4 text-purple-600" />} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BrowserPreview() {
  return (
    <div className="mt-14 relative flex flex-col items-center">
      {/* Integration Tools Row */}
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-600 mb-4">Integrate with nearly any tool or framework under the sun</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Exact color matches from Outseta */}
          <div className="h-10 w-10 bg-gray-500 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚡</span>
          </div>
          <div className="h-10 w-10 bg-purple-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">⟶</span>
          </div>
          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <div className="h-10 w-10 bg-orange-500 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚙</span>
          </div>
          <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <div className="h-10 w-10 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <div className="h-10 w-10 bg-gray-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">📖</span>
          </div>
          <div className="h-10 w-10 bg-gray-700 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <div className="h-10 w-10 bg-purple-700 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">D</span>
          </div>
          <div className="h-10 w-10 bg-black rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">X</span>
          </div>
          <div className="h-10 w-10 bg-yellow-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚡</span>
          </div>
        </div>
      </div>

      {/* Single Dashboard Container */}
      <div className="w-full max-w-7xl rounded-2xl overflow-hidden shadow-2xl">
        {/* Dashboard Interface */}
        <div className="bg-gray-900 text-white">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <span className="text-sm font-medium text-white">Acme Inc</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-800 rounded px-4 py-2 text-gray-400">
                <span className="text-sm">🔍 Search</span>
              </div>
              <button className="text-sm text-gray-400">Help</button>
              <button className="text-sm text-gray-400">🔔</button>
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex">
            {/* Sidebar */}
            <div className="w-56 bg-gray-800 min-h-[500px]">
              <div className="p-4 space-y-1">
                <div className="flex items-center gap-3 p-3 bg-gray-700 rounded text-white">
                  <div className="w-4 h-4 bg-gray-600 rounded"></div>
                  <span className="text-sm">Home</span>
                </div>
                <div className="flex items-center gap-3 p-3 text-gray-400 hover:text-white">
                  <div className="w-4 h-4"></div>
                  <span className="text-sm">CRM</span>
                </div>
                <div className="flex items-center gap-3 p-3 text-gray-400 hover:text-white">
                  <div className="w-4 h-4"></div>
                  <span className="text-sm">Help Desk</span>
                </div>
                <div className="flex items-center gap-3 p-3 text-gray-400 hover:text-white">
                  <div className="w-4 h-4"></div>
                  <span className="text-sm">Billing</span>
                </div>
                <div className="flex items-center gap-3 p-3 text-gray-400 hover:text-white">
                  <div className="w-4 h-4"></div>
                  <span className="text-sm">Reports</span>
                </div>
                <div className="flex items-center gap-3 p-3 text-gray-400 hover:text-white">
                  <div className="w-4 h-4"></div>
                  <span className="text-sm">Design</span>
                </div>
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="flex-1 p-6">
              {/* Header Section */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-semibold text-white mb-1">Hey there, Jane</h1>
                  <p className="text-sm text-gray-400">Here's what's happening in your Outseta account today.</p>
                </div>
                <div className="flex gap-4">
                  <button className="px-4 py-2 text-sm text-orange-400 border-b-2 border-orange-400">Engagement</button>
                  <button className="px-4 py-2 text-sm text-gray-400">Billing</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8">
                {/* Left Column - Stats */}
                <div className="col-span-2">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-6 mb-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">134</div>
                      <div className="text-xs text-gray-400">Unique Logins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">25</div>
                      <div className="text-xs text-gray-400">Accounts Created</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">87</div>
                      <div className="text-xs text-gray-400">People Created</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">22</div>
                      <div className="text-xs text-gray-400">Open Tickets</div>
                    </div>
                  </div>

                  {/* Activity Section */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Activity</h3>
                    <div className="space-y-4">
                      <div className="text-xs text-gray-500 mb-2">Today</div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-300">Adventure of Painting sent an email broadcast</div>
                          <div className="text-xs text-gray-500 mt-1">3:30PM</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-300">Rebecca had a person submit information to a lead form</div>
                          <div className="text-xs text-gray-500 mt-1">3:30PM</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-300">ehernandez@creativefoundation.org logged in [2001:378:f10c:3950:414a:ecc0:5250:c89f]</div>
                          <div className="text-xs text-gray-500 mt-1">2:28PM</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-300">hazelwg@bidlow.com opened email for campaign 'Get Started Onboarding Drip (Free Trial)' with subject 'How did you hear about Outseta?'</div>
                          <div className="text-xs text-gray-500 mt-1">3:20PM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Revenue Chart */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white">MRR as of 04-Oct-2024</h3>
                    <button className="text-xs text-gray-400">Share</button>
                  </div>
                  <div className="text-3xl font-bold text-white mb-6">$137,445.24</div>
                  
                  {/* Chart placeholder */}
                  <div className="h-40 bg-gray-800 rounded-lg relative mb-6">
                    <div className="absolute inset-4">
                      <div className="h-full flex items-end justify-between">
                        <div className="w-6 bg-blue-500 h-16 rounded-sm"></div>
                        <div className="w-6 bg-blue-400 h-24 rounded-sm"></div>
                        <div className="w-6 bg-blue-600 h-12 rounded-sm"></div>
                        <div className="w-6 bg-blue-500 h-32 rounded-sm"></div>
                        <div className="w-6 bg-blue-400 h-20 rounded-sm"></div>
                      </div>
                    </div>
                  </div>

                  {/* Subscribers section */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-white">Subscribers as of 04-Oct-2024</h3>
                    <button className="text-xs text-gray-400">Share</button>
                  </div>
                  <div className="text-2xl font-bold text-white mb-4">3,799</div>
                  <div className="h-20 bg-gray-800 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Demo Overlay */}
        <div className="absolute bottom-6 left-6 z-10">
          <div className="bg-gray-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 border border-gray-700">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">▶</span>
            </div>
            <div>
              <div className="font-semibold text-sm text-white">Watch product demo</div>
              <div className="text-xs text-gray-400">See Geoff give a full tour</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-md bg-white border border-gray-200 p-2 shadow-sm">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl glass p-5 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-1">{hint}</div>
        </div>
        <div className="rounded-md bg-white border border-gray-200 p-2 shadow-sm">{icon}</div>
      </div>
    </div>
  );
}

