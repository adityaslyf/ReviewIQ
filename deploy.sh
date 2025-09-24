#!/bin/bash

# ReviewIQ Deployment Script
# This script helps build and prepare both frontend and backend for deployment

set -e  # Exit on any error

echo "🚀 Starting ReviewIQ deployment preparation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    print_error "Please run this script from the ReviewIQ root directory"
    exit 1
fi

print_status "Building ReviewIQ for production deployment..."

# Build backend
print_status "Building backend..."
cd apps/server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Build backend
print_status "Building backend for production..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Backend build completed successfully"
else
    print_error "Backend build failed"
    exit 1
fi

# Go back to root
cd ../../

# Build frontend
print_status "Building frontend..."
cd apps/web

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Build frontend
print_status "Building frontend for production..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Go back to root
cd ../../

print_success "🎉 Build completed successfully!"
echo ""
print_status "📁 Built files locations:"
echo "   Backend:  apps/server/dist/"
echo "   Frontend: apps/web/dist/"
echo ""
print_status "📋 Next steps:"
echo "   1. Deploy backend dist/ to serve at https://reviewiq.xyz/api"
echo "   2. Deploy frontend dist/ to serve at https://reviewiq.xyz"
echo "   3. Update GitHub OAuth app callback URL"
echo "   4. Set production environment variables"
echo ""
print_status "📖 See DEPLOYMENT_GUIDE.md for detailed instructions"

# Check if .env exists in server
if [ ! -f "apps/server/.env" ]; then
    print_warning "No .env file found in apps/server/"
    print_status "Create one with your production environment variables"
fi

print_success "Deployment preparation complete! 🚀"
