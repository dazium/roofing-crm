@echo off
setlocal

if "%JAVA_HOME%"=="" (
  set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
)

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo JAVA_HOME is not configured and Android Studio JBR was not found.
  exit /b 1
)

set "PATH=%JAVA_HOME%\bin;%PATH%"

pushd "%~dp0..\android"
call gradlew.bat --stop >nul 2>&1
cmd /c rmdir /s /q app\build 2>nul
cmd /c rmdir /s /q build 2>nul
call gradlew.bat assembleDebug --no-daemon
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
