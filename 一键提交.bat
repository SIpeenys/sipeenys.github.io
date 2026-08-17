@echo off
cd /d "%~dp0"
set /p msg=ÇëÊäÈëÌá½»×¢ÊÍ£º
git add .
git commit -m "%msg%"
git push
pause