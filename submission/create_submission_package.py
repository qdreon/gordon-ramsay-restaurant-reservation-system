from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SUBMISSION = ROOT / "submission"
CLEAN_DIR = SUBMISSION / "GRRRS_Submission_Code"
ZIP_PATH = SUBMISSION / "GRRRS_Submission_Code.zip"

EXCLUDED_DIR_NAMES = {
    ".git",
    ".agents",
    ".github",
    ".next",
    "node_modules",
    "test-results",
    ".playwright-artifacts-1",
    "out",
    "build",
    "coverage",
    ".vercel",
    ".temp",
}

EXCLUDED_FILE_NAMES = {
    ".env",
    ".env.local",
    "tsconfig.tsbuildinfo",
    "next-env.d.ts",
    "npm-debug.log",
    "yarn-debug.log",
    "yarn-error.log",
    ".DS_Store",
}

EXCLUDED_SUFFIXES = {
    ".pem",
    ".log",
    ".webm",
}

# Avoid recursively packaging submission output inside itself.
EXCLUDED_TOP_LEVEL = {"submission"}


def should_exclude(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    parts = rel.parts

    if parts and parts[0] in EXCLUDED_TOP_LEVEL:
        return True

    if any(part in EXCLUDED_DIR_NAMES for part in parts):
        return True

    if path.name in EXCLUDED_FILE_NAMES:
        return True

    if path.name.startswith(".env.") and path.name != ".env.example":
        return True

    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return True

    return False


def copy_clean_project() -> None:
    if CLEAN_DIR.exists():
        shutil.rmtree(CLEAN_DIR)

    CLEAN_DIR.mkdir(parents=True)

    for item in ROOT.iterdir():
        if should_exclude(item):
            continue

        destination = CLEAN_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, destination, ignore=lambda directory, names: [
                name for name in names if should_exclude(Path(directory) / name)
            ])
        else:
            shutil.copy2(item, destination)


def zip_clean_project() -> None:
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in CLEAN_DIR.rglob("*"):
            if file_path.is_file():
                archive.write(file_path, file_path.relative_to(SUBMISSION))


def main() -> None:
    SUBMISSION.mkdir(exist_ok=True)
    copy_clean_project()
    zip_clean_project()
    print(f"Clean source copy: {CLEAN_DIR}")
    print(f"Compressed source code: {ZIP_PATH}")


if __name__ == "__main__":
    main()
