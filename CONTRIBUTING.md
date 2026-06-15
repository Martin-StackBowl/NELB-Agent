# Contributing to NELB

First off, thank you so much for considering contributing to NELB (No Employee Left Behind)! 

I built NELB on my own for the Microsoft Agents League, and I'm really open to learning, collaborating, and seeing how others might improve it. Whether you're fixing a bug, suggesting a feature, or just pointing out a better way to write some code, I appreciate your interest in making community-level job distribution fairer and more transparent.

## Development Setup

To get your local development environment running, please follow the detailed "Running locally" instructions in the [README.md](README.md) file. 

**Quick Prerequisites Summary:**
- Docker Desktop
- Node.js 20+
- Python 3.11+

## How to Contribute

### 1. Reporting Bugs
If you find a bug, please open an issue in the repository. Make sure to include:
- A clear, descriptive title.
- Step-by-step instructions to reproduce the issue.
- What you expected to happen vs. what actually happened.
- Any relevant logs, screenshots, or error messages.

### 2. Suggesting Enhancements
I am always looking for ways to improve the allocation fairness, the work assistant capabilities, or the overall user experience! Please open an issue to discuss your proposed changes before spending time writing code. I'd love to chat about your ideas.

### 3. Submitting Pull Requests
1. **Fork and Branch:** Fork the repository and create your feature branch from `main`.
2. **Write Code:** Implement your feature or bug fix.
3. **Write Tests:** The reasoning engine relies heavily on predictable logic. If you touch the allocation pipeline, you *must* add or update unit tests to cover your changes.
4. **Run Tests:** Ensure all existing tests pass (see Testing section below).
5. **Open a PR:** Open a Pull Request with a clear description of why the change is needed and how it works.

## Development Guidelines

### Backend (Python / FastAPI)
- I used Python 3.11+ and Pydantic v2.
- Adhere to PEP 8 standards where possible.
- Keep the allocation engine completely deterministic. It should not rely on external API calls during the ranking phase unless absolutely necessary and mocked in tests.

### Frontend (Next.js / TypeScript)
- I built this with Next.js 15, TypeScript, and Tailwind CSS v4.
- Follow standard React/Next.js best practices.
- Keep the UI responsive and accessible.

## Testing
The allocation engine is covered by a suite of unit tests verifying skills, reliability, fairness, budget, and distance. Before submitting a PR, make sure you run the tests and that they all pass:

```bash
cd backend
python -m pytest tests/test_allocation.py -v
```

Thank you for helping me ensure that **No Employee is Left Behind**!
