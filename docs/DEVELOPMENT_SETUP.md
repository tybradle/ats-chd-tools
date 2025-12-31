# Development Setup Guide

## GitHub Authentication Setup

### Option 1: Git Credential Store (Recommended)

This is already configured! On your first push, git will prompt for credentials and save them.

```bash
# Just push - git will prompt once and remember
git push origin main
# Username: tybradle
# Password: <your_github_PAT>
```

Credentials are saved to `~/.git-credentials` with 600 permissions (user-only access).

### Option 2: Environment Variables (.env file)

For scripts and automation that need explicit token access:

```bash
# 1. Copy the example file
cp .env.example .env

# 2. Edit .env and replace with your actual token
nano .env  # or vim .env

# 3. The .env file should look like:
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=tybradle
NODE_ENV=development
```

**Security:**
- `.env` is already in `.gitignore` (never committed)
- Will be created with 600 permissions (user-only)
- Token should have `repo` scope from: https://github.com/settings/tokens

### Using the Helper Script

```bash
# Push using .env credentials (if available) or credential store
./.dev-scripts/git-push.sh origin main

# Or with any git push arguments
./.dev-scripts/git-push.sh --force origin feature-branch
```

---

## Creating a GitHub Personal Access Token (PAT)

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Set description: `ats-chd-tools-dev`
4. Set expiration: `90 days` (or custom)
5. Select scopes:
   - ✅ **repo** (full control of private repositories)
6. Click **"Generate token"**
7. **Copy the token immediately** (shown only once!)
8. Save to `.env` file or use on first git push

---

## First-Time Setup Workflow

### Quick Setup (Git Credential Store)
```bash
# Already configured! Just push:
git push origin main

# Enter credentials when prompted:
# Username: tybradle
# Password: ghp_your_token_here

# Git will remember and never ask again
```

### Full Setup (With .env for scripts)
```bash
# 1. Create PAT on GitHub (see above)

# 2. Create .env file
cp .env.example .env

# 3. Edit .env with your token
nano .env

# 4. Secure it
chmod 600 .env

# 5. Test push
./.dev-scripts/git-push.sh origin main
```

---

## Troubleshooting

### "Authentication failed"
- Check token hasn't expired: https://github.com/settings/tokens
- Verify token has `repo` scope
- Try deleting `~/.git-credentials` and re-authenticate

### "Permission denied"
- Check `.env` permissions: `chmod 600 .env`
- Verify username is correct: `tybradle`
- Regenerate token if compromised

### "Token not working in .env"
```bash
# Check .env is loaded correctly
source .env
echo $GITHUB_TOKEN  # Should show your token
```

---

## Security Best Practices

✅ **DO:**
- Keep tokens in `.env` or git credential store
- Set token expiration (90 days recommended)
- Use minimal scopes needed (`repo` only)
- Regenerate if potentially exposed
- Use different tokens for different machines

❌ **DON'T:**
- Commit `.env` file (already gitignored)
- Share tokens in chat/email
- Use tokens with excessive permissions
- Set tokens to "no expiration"
- Hardcode tokens in scripts

---

## Current Status

- ✅ Git credential helper: **Configured** (`store`)
- ✅ `.env.example`: **Created** (template ready)
- ✅ `.gitignore`: **Protects** `.env` files
- ✅ Helper script: **Available** at `.dev-scripts/git-push.sh`
- ⏳ **Next step:** Create your PAT and push!

---

## Quick Reference

```bash
# Option 1: Simple push (will prompt once)
git push origin main

# Option 2: Using helper script
./.dev-scripts/git-push.sh origin main

# Check credential helper
git config --global credential.helper

# View saved credentials (careful!)
cat ~/.git-credentials

# Remove saved credentials
rm ~/.git-credentials
```
