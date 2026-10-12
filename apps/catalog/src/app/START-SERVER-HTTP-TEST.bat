@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Bastiyan Collector - HTTP (test only)
py -3 server.py
pause
