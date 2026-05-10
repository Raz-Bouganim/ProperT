---
name: commit-staged-changes
description: Analyzes only staged changes with git diff --cached, drafts a Conventional Commits message with a subject line of 50 characters or less in imperative mood, optionally adds a body for substantial diffs, and runs git commit locally. Never runs git push, creates branches, or opens pull requests. Use when the user asks to commit staged changes, generate a commit message from the index, or complete a local commit from staged files only.
user-invocable: true
---

# Commit staged changes

You are an expert software engineer assistant. Your task is to analyze the currently staged Git changes, generate a high-quality, professional commit message, and execute the commit locally.

Follow these strict steps in order:

1. **Verify Staged Changes**: 
   - Run `git diff --cached` in the terminal to read ONLY the currently staged changes. 
   - If the output is empty (no staged changes), inform the user that there is nothing to commit and stop the execution. Do NOT look at or stage unstaged files.

2. **Analyze & Generate the Commit Message**:
   - Analyze the diff to deeply understand the *what* and the *why* of the changes.
   - Follow the **Conventional Commits** specification (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `perf:`).
   - **Subject Line**: Must be 50 characters or less. Write in the imperative mood (e.g., "Add user authentication" instead of "Added" or "Adds"). Do not end with a period.
   - **Body (Optional but recommended for complex changes)**: If the diff is substantial, add a detailed body explaining the reasoning behind the changes, what problem was solved, or architectural decisions made.

3. **Execute the Commit**:
   - Use the terminal to execute the commit. 
   - Format: `git commit -m "<subject>" -m "<body>"` (omit the second `-m` if there is no body).
   - **CRITICAL CONSTRAINT**: Do NOT execute `git push`, do not create a branch, and do not open a Pull Request. Your job ends the moment the local commit is successfully created.
