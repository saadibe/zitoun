#!/usr/bin/env python3
"""
Script de vérification avant push - simule les erreurs de compilation Java
Usage: python3 check_before_push.py
"""
import os, re, sys

errors = []
checked = 0
BACKEND = '/home/claude/zitoun-repo/backend/src/main/java'

for root, dirs, files in os.walk(BACKEND):
    for f in files:
        if not f.endswith('.java'): continue
        path = os.path.join(root, f)
        content = open(path).read()
        classname = f.replace('.java', '')
        checked += 1

        # 1. Package déclaration
        first_nonblank = next((l for l in content.split('\n') if l.strip()), '')
        if not first_nonblank.startswith('package '):
            errors.append(f"❌ {f}:1 — package manquant")

        # 2. Accolades équilibrées
        o, c = content.count('{'), content.count('}')
        if o != c:
            errors.append(f"❌ {f} — accolades: {o}{{ vs {c}}}")

        # 3. Champs final non initialisés dans constructeur incomplet
        #    (uniquement classe principale, pas inner classes)
        finals = re.findall(r'^\s{4}private final \S+ (\w+);', content, re.MULTILINE)
        if finals and '@RequiredArgsConstructor' not in content:
            ctors = re.findall(
                rf'public {classname}\([^)]*\)\s*\{{(.*?)\}}',
                content, re.DOTALL
            )
            if ctors:
                all_assigned = set()
                for body in ctors:
                    all_assigned.update(re.findall(r'this\.(\w+)\s*=', body))
                uninit = [fd for fd in finals if fd not in all_assigned]
                if uninit:
                    errors.append(
                        f"❌ {f} — champs non initialisés dans constructeur: {uninit}\n"
                        f"   Fix: @RequiredArgsConstructor + supprimer constructeur manuel"
                    )

        # 4. Méthodes dupliquées dans la CLASSE PRINCIPALE seulement
        #    Extraire seulement le corps de la classe principale (pas les inner classes)
        # Trouver la classe principale (indentation niveau 0 des méthodes = 4 espaces)
        main_methods = re.findall(
            r'^    public\s+\S+\s+(\w+)\s*\([^)]*\)\s*(?:throws[^{]+)?\{',
            content, re.MULTILINE
        )
        seen = {}
        for m in main_methods:
            seen[m] = seen.get(m, 0) + 1
        for m, cnt in seen.items():
            if cnt > 1:
                errors.append(f"❌ {f} — méthode dupliquée dans classe principale: '{m}()' ({cnt}x)")

        # 5. @RequiredArgsConstructor sans import
        if '@RequiredArgsConstructor' in content:
            if 'import lombok.RequiredArgsConstructor' not in content and \
               'import lombok.*' not in content:
                errors.append(f"❌ {f} — @RequiredArgsConstructor sans import lombok")

print(f"Vérification de {checked} fichiers Java...\n")

if errors:
    print("═══ ERREURS — NE PAS POUSSER ═══════════════")
    for e in errors:
        print(e)
    print(f"\n💥 {len(errors)} erreur(s) — Corriger avant git push")
    sys.exit(1)
else:
    print(f"✅ {checked} fichiers OK — Prêt à pousser")
    sys.exit(0)
