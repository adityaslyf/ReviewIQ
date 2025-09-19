"use client";
import React, { useState } from "react";
import { HoveredLink, Menu, MenuItem, ProductItem } from "./ui/navbar-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import { BarChart3 } from "lucide-react";

export function GlassyNavbar() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
}

function Navbar({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const { isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className={cn("fixed top-10 inset-x-0 max-w-4xl mx-auto z-50 px-4", className)}>
        <div className="bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg flex justify-between items-center px-8 py-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-gray-700" />
            <span className="text-xl font-bold text-gray-900">ReviewIQ</span>
          </div>
          
          <div className="flex items-center gap-4">
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
        </div>
      </div>
    );
  }

  return (
    <div className={cn("fixed top-10 inset-x-0 max-w-4xl mx-auto z-50 px-4", className)}>
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div className="bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg px-6 py-3">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-gray-700" />
            <span className="text-xl font-bold text-gray-900">ReviewIQ</span>
          </div>
        </div>

        {/* Main Menu */}
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

        {/* User Actions */}
        <div className="bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg flex items-center gap-3 px-6 py-3">
          <button
            onClick={() => {
              logout();
              setTimeout(() => {
                navigate({ to: "/landing" });
              }, 100);
            }}
            className="px-4 py-2 text-sm font-medium rounded-full bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200 backdrop-blur-sm shadow-sm"
          >
            Logout
          </button>
          <div className="bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/30">
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
