@echo off
cd /d "%~dp0"
set /p msg=请输入提交注释：
git add .
git commit -m "%msg%"
git push
pause