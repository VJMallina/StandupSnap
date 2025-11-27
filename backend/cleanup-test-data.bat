@echo off
echo.
echo ====================================
echo   Test Data Cleanup Script
echo ====================================
echo.
echo This will remove all automation test data from the database.
echo Real user data will NOT be affected.
echo.
pause
echo.

npm run cleanup:test-data

echo.
pause
