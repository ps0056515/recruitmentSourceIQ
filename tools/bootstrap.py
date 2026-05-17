# Generates sourceIQ source files as UTF-8
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FILES: dict[str, str] = {}

def add(path: str, content: str):
    FILES[path] = content

add("packages/shared/tsconfig.json", """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
""")

add("packages/shared/src/index.ts", open(__file__).read().split("SHARED_TYPES_START")[1].split("SHARED_TYPES_END")[0])

# placeholder - will fill below
