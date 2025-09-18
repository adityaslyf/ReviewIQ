import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Settings, ArrowLeft, Github, Brain, Key, Database, Webhook } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Settings className="h-8 w-8 text-gray-600" />
                  Settings
                </h1>
                <p className="mt-1 text-gray-600">
                  Configure GitHub App, API keys, and preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GitHub Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5 text-blue-600" />
                GitHub Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">GitHub App</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">App ID</span>
                    <Badge variant="outline" className="text-xs">
                      {process.env.GITHUB_APP_ID ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Private Key</span>
                    <Badge variant="outline" className="text-xs">
                      {process.env.GITHUB_PRIVATE_KEY ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Installation ID</span>
                    <Badge variant="outline" className="text-xs">
                      {process.env.GITHUB_INSTALLATION_ID ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">OAuth App</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Client ID</span>
                    <Badge variant="outline" className="text-xs">
                      {process.env.GITHUB_OAUTH_CLIENT_ID ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Client Secret</span>
                    <Badge variant="outline" className="text-xs">
                      {process.env.GITHUB_OAUTH_CLIENT_SECRET ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full" disabled>
                <Github className="h-4 w-4 mr-2" />
                Reconfigure GitHub App
              </Button>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Gemini API</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Key</span>
                    <Badge variant="outline" className="text-xs">
                      {process.env.GEMINI_API_KEY ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Model</span>
                    <Badge variant="secondary" className="text-xs">
                      gemini-1.5-pro
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Analysis Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Static Analysis</span>
                    <Badge variant="default" className="text-xs bg-green-500">
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Enhanced Context</span>
                    <Badge variant="default" className="text-xs bg-green-500">
                      Enabled
                    </Badge>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full" disabled>
                <Key className="h-4 w-4 mr-2" />
                Update API Keys
              </Button>
            </CardContent>
          </Card>

          {/* Database Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-600" />
                Database Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Connection Status</span>
                  <Badge variant="default" className="text-xs bg-green-500">
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database Type</span>
                  <Badge variant="secondary" className="text-xs">
                    PostgreSQL
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Migration Status</span>
                  <Badge variant="default" className="text-xs bg-green-500">
                    Up to Date
                  </Badge>
                </div>
              </div>

              <Button variant="outline" className="w-full" disabled>
                <Database className="h-4 w-4 mr-2" />
                Run Migrations
              </Button>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-indigo-600" />
                Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Webhook URL</h4>
                <code className="text-xs bg-gray-100 px-3 py-2 rounded block">
                  {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/webhook
                </code>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Events</h4>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs mr-2">pull_request</Badge>
                  <Badge variant="outline" className="text-xs mr-2">pull_request_review</Badge>
                  <Badge variant="outline" className="text-xs">push</Badge>
                </div>
              </div>

              <Button variant="outline" className="w-full" disabled>
                <Webhook className="h-4 w-4 mr-2" />
                Test Webhook
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">Running</div>
                <div className="text-sm text-gray-600">Server Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">v1.0.0</div>
                <div className="text-sm text-gray-600">Application Version</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {typeof window !== 'undefined' ? window.location.origin : 'localhost:3000'}
                </div>
                <div className="text-sm text-gray-600">Server URL</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
