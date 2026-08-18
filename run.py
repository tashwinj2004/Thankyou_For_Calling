"""Start Thankyou For Calling — FastAPI backend + Next.js frontend.

Run from the project root after activating .venv:
    python run.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PYTHON = sys.executable
FRONTEND_DIR = ROOT / "frontend"


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    if hasattr(sys.stderr, "reconfigure"):
        try:
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass

    environment = os.environ.copy()
    environment.setdefault("TFC_API_URL", "http://localhost:5112")

    bind_host = os.getenv("BIND_HOST", "127.0.0.1")

    commands = [
        # FastAPI backend — port 5112
        [PYTHON, "-m", "uvicorn", "backend.main:app", "--host", bind_host, "--port", "5112"],
        # Next.js frontend — port 5111
        ["npm", "run", "dev"],
    ]

    processes = [
        subprocess.Popen(commands[0], cwd=ROOT, env=environment),
        subprocess.Popen(commands[1], cwd=str(FRONTEND_DIR), env=environment, shell=True),
    ]

    time.sleep(5.0)
    print("\n" + "=" * 60)
    print(" Thankyou For Calling - Sales-Call Intelligence Platform is READY!")
    print("=" * 60)
    print(" ACCESS PORTAL (Next.js):  http://localhost:5111")
    print(" BACKEND API   (FastAPI):  http://localhost:5112")
    print("=" * 60 + "\n")
    sys.stdout.flush()

    try:
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping Thankyou For Calling...")
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    main()
