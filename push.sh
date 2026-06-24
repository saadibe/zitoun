#!/bin/bash
# Usage: ./push.sh "message de commit"
# Vérifie le backend Java avant de pousser

set -e
cd /home/claude/zitoun-repo

echo "🔍 Vérification Java..."
python3 check_before_push.py
if [ $? -ne 0 ]; then
    echo "❌ Arrêt — corriger les erreurs avant de pousser"
    exit 1
fi

echo ""
echo "🔍 Vérification build Angular..."
cd angular-app
timeout 120 node_modules/.bin/ng build --configuration=production 2>&1 | grep -E "ERROR|complete"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ Build Angular échoué"
    exit 1
fi
cd ..

echo ""
echo "📦 Git push..."
git add -A
git commit -m "${1:-fix: update}"
git push origin main

echo ""
echo "✅ Push réussi — Render rebuild en cours"
