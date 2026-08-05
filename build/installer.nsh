!macro customUnInstall
  ; Ensure RoofingCRM is not running during uninstall/reinstall.
  ; This uses taskkill to close any still-running app instance by executable name.
  nsExec::ExecToLog '$SYSDIR\\taskkill.exe /F /IM RoofingCRM.exe /T'
  Pop $0
!macroend
