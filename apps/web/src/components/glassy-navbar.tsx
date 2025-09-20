"use client";
import React, { useState } from "react";
import { HoveredLink, Menu, MenuItem, ProductItem } from "./ui/navbar-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import { BarChart3, Menu as MenuIcon, X } from "lucide-react";

export function GlassyNavbar() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
}

function Navbar({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className={cn("fixed top-10 inset-x-0 max-w-4xl mx-auto z-50 px-4", className)}>
        <div className="bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg flex justify-between items-center px-4 sm:px-8 py-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-gray-700" />
            <span className="text-xl font-bold text-gray-900">ReviewIQ</span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={login}
              className="px-6 py-2 text-sm font-medium rounded-full bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200 backdrop-blur-sm shadow-sm"
            >
              Sign in with GitHub
            </button>
            <div className="bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/30">
              <ModeToggle />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2 rounded-full bg-white/60 hover:bg-white/80 border border-white/30 transition-all duration-200"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="sm:hidden mt-2 bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg p-4">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  login();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full px-6 py-3 text-sm font-medium rounded-full bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200 backdrop-blur-sm shadow-sm"
              >
                Sign in with GitHub
              </button>
              <div className="flex justify-center">
                <div className="bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/30">
                  <ModeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("fixed top-10 inset-x-0 max-w-4xl mx-auto z-50 px-4", className)}>
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div className="bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg px-4 sm:px-6 py-3">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
            <span className="text-lg sm:text-xl font-bold text-gray-900">ReviewIQ</span>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:block">
          <Menu setActive={setActive}>
            <MenuItem setActive={setActive} active={active} item="Dashboard">
              <div className="flex flex-col space-y-4 text-sm">
                <HoveredLink to="/dashboard">Main Dashboard</HoveredLink>
                <HoveredLink to="/settings">Settings</HoveredLink>
              </div>
            </MenuItem>
            
            <MenuItem setActive={setActive} active={active} item="Services">
              <div className="flex flex-col space-y-4 text-sm">
                <HoveredLink to="/pull-requests">Pull Requests</HoveredLink>
                <HoveredLink to="/analysis">AI Analysis</HoveredLink>
                <HoveredLink to="/repositories">Repositories</HoveredLink>
                <HoveredLink to="/stored">Stored Data</HoveredLink>
              </div>
            </MenuItem>
            
            <MenuItem setActive={setActive} active={active} item="Products">
              <div className="text-sm grid grid-cols-2 gap-10 p-4">
                <ProductItem
                  title="ReviewIQ Dashboard"
                  href="/dashboard"
                  src="https://assets.aceternity.com/demos/algochurn.webp"
                  description="Manage your pull requests and AI analysis workflow"
                />
                <ProductItem
                  title="AI Analysis Engine"
                  href="/analysis"
                  src="https://assets.aceternity.com/demos/tailwindmasterkit.webp"
                  description="Advanced AI-powered code review and analysis"
                />
                <ProductItem
                  title="Repository Hub"
                  href="/repositories"
                  src="https://assets.aceternity.com/demos/Screenshot+2024-02-21+at+11.51.31%E2%80%AFPM.png"
                  description="Connect and manage your GitHub repositories"
                />
                <ProductItem
                  title="Data Insights"
                  href="/stored"
                  src="https://assets.aceternity.com/demos/Screenshot+2024-02-21+at+11.47.07%E2%80%AFPM.png"
                  description="View historical analysis and performance metrics"
                />
              </div>
            </MenuItem>
            
            <MenuItem setActive={setActive} active={active} item="Tools">
              <div className="flex flex-col space-y-4 text-sm">
                <HoveredLink to="/analysis">Code Analysis</HoveredLink>
                <HoveredLink to="/repositories">Repo Management</HoveredLink>
                <HoveredLink to="/stored">Data Analytics</HoveredLink>
              </div>
            </MenuItem>
          </Menu>
        </div>

        {/* Desktop User Actions */}
        <div className="hidden sm:flex bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg items-center gap-3 px-4 sm:px-6 py-3">
          <button
            onClick={() => {
              logout();
              setTimeout(() => {
                navigate({ to: "/landing" });
              }, 100);
            }}
            className="px-3 sm:px-4 py-2 text-sm font-medium rounded-full bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200 backdrop-blur-sm shadow-sm"
          >
            Logout
          </button>
          <div className="bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/30">
            <ModeToggle />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="sm:hidden p-2 rounded-full bg-white/80 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/90 transition-all duration-200"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="sm:hidden mt-2 bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg p-4">
          <div className="flex flex-col gap-4">
            {/* Quick Navigation */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  navigate({ to: "/dashboard" });
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 text-sm font-medium rounded-xl bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  navigate({ to: "/pull-requests" });
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 text-sm font-medium rounded-xl bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                Pull Requests
              </button>
              <button
                onClick={() => {
                  navigate({ to: "/analysis" });
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 text-sm font-medium rounded-xl bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                AI Analysis
              </button>
              <button
                onClick={() => {
                  navigate({ to: "/repositories" });
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 text-sm font-medium rounded-xl bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                Repositories
              </button>
            </div>

            {/* User Actions */}
            <div className="border-t border-white/30 pt-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  navigate({ to: "/settings" });
                  setIsMobileMenuOpen(false);
                }}
                className="w-full p-3 text-sm font-medium rounded-xl bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                Settings
              </button>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                    setTimeout(() => {
                      navigate({ to: "/landing" });
                    }, 100);
                  }}
                  className="flex-1 mr-3 p-3 text-sm font-medium rounded-xl bg-red-100/60 hover:bg-red-100/80 border border-red-200/30 text-red-700 hover:text-red-900 transition-all duration-200"
                >
                  Logout
                </button>
                <div className="bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/30">
                  <ModeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
