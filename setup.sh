#!/bin/bash
# MediQR Setup Script
# Run this from the hospital-qr-system/ root directory

echo ""
echo "🏥  MediQR Hospital System - Setup"
echo "===================================="
echo ""

# Backend setup
echo "📦  Installing backend dependencies..."
cd backend
npm install
echo "✅  Backend dependencies installed."

# Create .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️   Created backend/.env from .env.example"
  echo "    Please edit backend/.env and set your MONGODB_URI before starting."
  echo ""
fi

cd ..

# Frontend setup
echo "📦  Installing frontend dependencies..."
cd frontend
npm install
echo "✅  Frontend dependencies installed."
cd ..

echo ""
echo "🎉  Setup complete!"
echo ""
echo "To start the system:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm start"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && ng serve"
echo ""
echo "  Then open: http://localhost:4200"
echo ""
