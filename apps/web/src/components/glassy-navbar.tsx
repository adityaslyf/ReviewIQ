"use client";
import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Github, Menu as MenuIcon, X, LayoutDashboard, GitPullRequest, Brain, Database } from "lucide-react";

export function GlassyNavbar() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
}

function Navbar({ className }: { className?: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  if (!isAuthenticated) {
    return (
      <div className={cn("fixed top-4 inset-x-0 max-w-4xl mx-auto z-50 px-4", className)}>
        <nav 
          className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden"
        >
          <div className="flex justify-between items-center px-6 py-3">
            <button 
              onClick={() => navigate({ to: "/landing" })}
              className="flex items-center space-x-3 group cursor-pointer"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
                <Github className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ReviewIQ</span>
            </button>
            
            {/* Desktop Menu */}
            <div className="hidden sm:flex items-center gap-6">
              <button
                onClick={login}
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Github className="h-4 w-4" />
                Sign in with GitHub
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div ref={mobileMenuRef} className="sm:hidden border-t border-gray-200/50 overflow-hidden">
              <div className="p-4 space-y-3">
                <button
                  onClick={() => {
                    login();
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md"
                >
                  <Github className="h-4 w-4" />
                  Sign in with GitHub
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>
    );
  }

  return (
    <div className={cn("fixed top-4 inset-x-0 max-w-5xl mx-auto z-50 px-4", className)}>
      <nav 
        className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden"
      >
        <div className="flex justify-between items-center px-6 py-3">
          {/* Logo */}
          <button 
            onClick={() => navigate({ to: "/landing" })}
            className="flex items-center space-x-3 group cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
              <Github className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ReviewIQ</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 cursor-pointer transition-all duration-200"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => navigate({ to: "/pull-requests" })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 transition-all duration-200 cursor-pointer"
            >
              <GitPullRequest className="h-4 w-4" />
              Pull Requests
            </button>
            <button
              onClick={() => navigate({ to: "/analysis" })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 transition-all duration-200 cursor-pointer"
            >
              <Brain className="h-4 w-4" />
              AI Analysis
            </button>
            <button
              onClick={() => navigate({ to: "/stored" })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 transition-all duration-200 cursor-pointer"
            >
              <Database className="h-4 w-4" />
              Stored Data
            </button>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={() => {
                logout();
                setTimeout(() => {
                  navigate({ to: "/landing" });
                }, 100);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all duration-200"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className="lg:hidden border-t border-gray-200/50 overflow-hidden">
            <div className="p-4 space-y-3">
              {/* Navigation Links */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate({ to: "/dashboard" });
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item inline-flex items-center justify-center gap-2 p-3 text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    navigate({ to: "/pull-requests" });
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item inline-flex items-center justify-center gap-2 p-3 text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <GitPullRequest className="h-4 w-4" />
                  PRs
                </button>
                <button
                  onClick={() => {
                    navigate({ to: "/analysis" });
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item inline-flex items-center justify-center gap-2 p-3 text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <Brain className="h-4 w-4" />
                  Analysis
                </button>
                <button
                  onClick={() => {
                    navigate({ to: "/stored" });
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item inline-flex items-center justify-center gap-2 p-3 text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <Database className="h-4 w-4" />
                  Data
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                  setTimeout(() => {
                    navigate({ to: "/landing" });
                  }, 100);
                }}
                className="mobile-menu-item w-full p-3 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 transition-colors duration-200 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}