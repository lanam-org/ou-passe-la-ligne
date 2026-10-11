@echo off
REM Lance un petit serveur web local et ouvre le site dans le navigateur.
REM Un serveur est necessaire : les navigateurs refusent les modules JavaScript
REM ouverts par un simple double-clic sur un fichier.

cd /d "%~dp0public"
echo Site : http://localhost:8080
echo (Ferme cette fenetre pour arreter le serveur.)
start "" http://localhost:8080

py -3 -m http.server 8080 >nul 2>&1 && goto :fin
python -m http.server 8080 >nul 2>&1 && goto :fin
npx --yes serve -l 8080 . && goto :fin

echo.
echo Aucun serveur n'a pu demarrer.
echo Installe Python (python.org) ou utilise l'extension "Live Server" de VS Code.
pause

:fin
