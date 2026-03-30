@echo off
echo.
echo  MediQR Hospital System - Setup
echo ====================================
echo.

echo  Installing backend dependencies...
cd backend
call npm install
echo  Backend done.

if not exist .env (
  copy .env.example .env
  echo.
  echo  Created backend\.env - please edit MONGODB_URI before running!
  echo.
)

cd ..
echo  Installing frontend dependencies...
cd frontend
call npm install
echo  Frontend done.
cd ..

echo.
echo  Setup complete!
echo.
echo  To start:
echo    Terminal 1: cd backend ^&^& npm start
echo    Terminal 2: cd frontend ^&^& ng serve
echo    Open: http://localhost:4200
echo.
pause
