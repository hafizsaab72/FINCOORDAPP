import re, os

# Files to convert: screen files that import colors from theme/tokens
files = [
    'src/screens/FriendsScreen.tsx',
    'src/screens/GroupsScreen.tsx',
    'src/screens/WelcomeScreen.tsx',
    'src/screens/AddBillModal.tsx',
    'src/screens/SignUpScreen.tsx',
    'src/screens/FriendDetailScreen.tsx',
    'src/screens/ActivityScreen.tsx',
    'src/screens/ProfileScreen.tsx',
    'src/screens/AddExpenseModal.tsx',
    'src/screens/SettingsScreen.tsx',
    'src/screens/QRScannerScreen.tsx',
    'src/screens/GroupDetailScreen.tsx',
    'src/screens/HomeScreen.tsx',
    'src/screens/MyQRCodeScreen.tsx',
    'src/components/RemainingIndicator.tsx',
    'src/components/DashboardSummary.tsx',
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"SKIP: {filepath}")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    has_static_colors = "from '../theme/tokens'" in content or "from '../../theme/tokens'" in content
    has_useAppTheme = "useAppTheme" in content
    has_useTheme = "useTheme" in content and "useTheme()" in content

    # Check if file uses colors in StyleSheet.create
    stylesheet_colors = False
    if 'StyleSheet.create' in content:
        # Find StyleSheet.create block and check for colors.
        ss_match = re.search(r'StyleSheet\.create\(\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\)', content, re.DOTALL)
        if ss_match:
            ss_block = ss_match.group(1)
            if 'colors.' in ss_block:
                stylesheet_colors = True

    if not has_static_colors:
        print(f"SKIP (no static import): {filepath}")
        continue

    # For files with StyleSheet.create using colors, keep static import for colors
    # but add dynamic useTheme for inline JSX styles
    if stylesheet_colors:
        # Don't remove static import — StyleSheet.create needs it
        # But add dynamic colors from useTheme for inline styles
        if not has_useTheme and not has_useAppTheme:
            # Add useTheme import
            content = content.replace(
                "import { useAppTheme } from '../context/ThemeContext';",
                "import { useAppTheme, useTheme } from '../context/ThemeContext';"
            )
            if "useTheme" not in content:
                content = content.replace(
                    "import { useStore } from '../store/useStore';",
                    "import { useStore } from '../store/useStore';\nimport { useTheme } from '../context/ThemeContext';"
                )
        # Add const { colors: themeColors } inside component function
        # Find "export default function" or "function" and add after opening brace
        # This is tricky — skip for now to avoid breaking things
        print(f"PARTIAL (StyleSheet uses colors, kept static): {filepath}")
    else:
        # No StyleSheet colors — safe to remove static import and use useTheme fully
        # Remove static color import line
        content = re.sub(r"import \{ colors(?:, [^}]+)? \} from '../theme/tokens';\n", "", content)
        content = re.sub(r"import \{ colors(?:, [^}]+)? \} from '../../theme/tokens';\n", "", content)
        # Keep spacing/radius/shadows if they were in the same import
        # Check if spacing was in the removed import
        if 'spacing' in original and "from '../theme/tokens'" in original:
            # Add back spacing/radius/shadows import
            content = content.replace(
                "import { haptics } from '../utils/haptics';",
                "import { haptics } from '../utils/haptics';\nimport { spacing, radius, shadows } from '../theme/tokens';"
            )

        # Add useTheme import if not present
        if "useTheme" not in content:
            content = content.replace(
                "import { useAppTheme } from '../context/ThemeContext';",
                "import { useAppTheme, useTheme } from '../context/ThemeContext';"
            )
            if "useTheme" not in content:
                content = content.replace(
                    "import { useStore } from '../store/useStore';",
                    "import { useStore } from '../store/useStore';\nimport { useTheme } from '../context/ThemeContext';"
                )

        # Add const { colors } = useTheme(); inside component function
        # Find function definition pattern and insert after first line
        # Pattern: export default function Name(...) {
        func_match = re.search(r'(export default function \w+\([^)]*\) \{)', content)
        if not func_match:
            func_match = re.search(r'(function \w+\([^)]*\) \{)', content)
        if not func_match:
            func_match = re.search(r'(const \w+ = \([^)]*\) =\u003e \{)', content)

        if func_match:
            insert_point = func_match.end()
            content = content[:insert_point] + "\n  const { colors } = useTheme();" + content[insert_point:]
        else:
            print(f"WARNING: Could not find function in {filepath}")

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"UPDATED: {filepath}")
    else:
        print(f"NO CHANGE: {filepath}")

print("\nBatch conversion complete")
