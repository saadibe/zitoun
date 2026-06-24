#!/usr/bin/env python3
"""
Script de vérification avant push - détecte les erreurs de compilation Java
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

        # 1. Package correct
        first = next((l for l in content.split('\n') if l.strip()), '')
        if not first.startswith('package '):
            errors.append(f"❌ {f}:1 — package manquant")

        # 2. Accolades équilibrées
        o, c = content.count('{'), content.count('}')
        if o != c:
            errors.append(f"❌ {f} — accolades: {o}{{ vs {c}}}")

        # 3. Champs final niveau classe principale SANS @RequiredArgsConstructor NI constructeur
        finals = re.findall(r'^\s{4}private final \S+ (\w+);', content, re.MULTILINE)
        if finals:
            has_required = '@RequiredArgsConstructor' in content
            has_ctor = bool(re.search(rf'public {classname}\s*\(', content))
            
            if not has_required and not has_ctor:
                errors.append(
                    f"❌ {f} — champs final sans constructeur ni @RequiredArgsConstructor: {finals}\n"
                    f"   Fix: ajouter import lombok.RequiredArgsConstructor; + @RequiredArgsConstructor"
                )
            elif has_ctor and not has_required:
                # Constructeur manuel — vérifier qu'il initialise tout
                all_assigned = set(re.findall(r'this\.(\w+)\s*=', content))
                uninit = [fd for fd in finals if fd not in all_assigned]
                if uninit:
                    errors.append(
                        f"❌ {f} — constructeur n'initialise pas: {uninit}\n"
                        f"   Fix: @RequiredArgsConstructor + supprimer constructeur manuel"
                    )

        # 4. @RequiredArgsConstructor sans import
        if '@RequiredArgsConstructor' in content:
            if 'import lombok.RequiredArgsConstructor' not in content and \
               'import lombok.*' not in content:
                errors.append(
                    f"❌ {f} — @RequiredArgsConstructor sans import lombok\n"
                    f"   Fix: ajouter import lombok.RequiredArgsConstructor;"
                )

        # 5. Méthodes dupliquées dans la classe principale (4 espaces = niveau 1)
        main_methods = re.findall(
            r'^    public\s+\S+\s+(\w+)\s*\([^)]*\)\s*(?:throws[^{{]+)?\{{',
            content, re.MULTILINE
        )
        seen = {}
        for m in main_methods:
            seen[m] = seen.get(m, 0) + 1
        for m, cnt in seen.items():
            if cnt > 1:
                errors.append(f"❌ {f} — méthode dupliquée: '{m}()' ({cnt}x)")

print(f"Vérification de {checked} fichiers Java...\n")

if errors:
    print("═══ ERREURS — NE PAS POUSSER ════════════════")
    for e in errors:
        print(e)
    print(f"\n💥 {len(errors)} erreur(s) — Corriger avant git push")
    sys.exit(1)
else:
    print(f"✅ {checked} fichiers OK — Prêt à pousser")
    sys.exit(0)
