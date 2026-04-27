# Publishing Unwrench to the Chrome Web Store

This document covers the one-time store listing setup and the GitHub Actions workflow that
auto-publishes on version tags.

---

## Part 1 — One-time manual setup (do this first)

### 1. Register a Chrome Web Store developer account

- Go to [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).
- Pay the one-time $5 registration fee.

### 2. Host a privacy policy

The extension uses `chrome.storage.sync`, which requires a privacy policy URL. A minimal page
stating that no personal data is collected or transmitted is sufficient. Host it anywhere publicly
accessible (GitHub Pages works fine).

### 3. Prepare store listing assets

| Asset | Size | Notes |
| --- | --- | --- |
| Icon | 128×128 px | Already in `icons/icon128.png` |
| Screenshot | 1280×800 or 640×400 px | At least one required |
| Promotional tile | 440×280 px | Optional but recommended |
| Short description | ≤ 132 characters | Used in search results |
| Detailed description | Free-form | Supports plain text only |

### 4. Submit the first listing manually

The Chrome Web Store API cannot create a new listing — only update an existing one. The first
submission must go through the dashboard:

1. Zip the extension (see the zip recipe in Part 2 below — same exclusions apply).
2. In the developer console, click **New item** and upload the ZIP.
3. Fill in the listing details, privacy policy URL, and permission justifications (see below).
4. Submit for review. First reviews typically take a few days.

### 5. Permission justifications

Google's review form asks you to justify each sensitive permission:

| Permission | Justification |
| --- | --- |
| `<all_urls>` | The extension must activate on any self-hosted GitLab instance, whose hostname is unknown at install time. |
| `scripting` | Required to inject a script into the page context to intercept `diffs_metadata.json` fetches, which cannot be done from the isolated content script context. |

### 6. Note your Extension ID

After the listing is created, copy the Extension ID from the dashboard URL. You will need it for
the CI/CD secrets.

---

## Part 2 — GitHub Actions CI/CD

Once the listing exists, every subsequent release is automated by pushing a version tag.

### How it works

1. Push a tag matching `vMAJOR.MINOR.PATCH` (e.g. `v0.3.0`).
2. The workflow verifies the tag version matches `manifest.json` — fails loudly if they diverge.
3. It builds a clean ZIP (dev files excluded).
4. Uploads and publishes to the Chrome Web Store via the Publish API.

### One-time: get a Chrome Web Store OAuth refresh token

The Publish API uses OAuth 2.0. You need to do this browser-based flow once to obtain a refresh
token that the CI can reuse.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or use an existing one).
3. Enable the **Chrome Web Store API**.
4. Create an **OAuth 2.0 client ID** (type: Desktop app). Download the JSON credentials.
5. Run the following to get a refresh token — replace the placeholders:

   ```bash
   # Step 1: open this URL in your browser and authorise
   open "https://accounts.google.com/o/oauth2/auth\
   ?response_type=code\
   &scope=https://www.googleapis.com/auth/chromewebstore\
   &redirect_uri=urn:ietf:wg:oauth:2.0:oob\
   &client_id=YOUR_CLIENT_ID"

   # Step 2: exchange the code for a refresh token
   curl -X POST https://oauth2.googleapis.com/token \
     -d code=PASTE_CODE_FROM_BROWSER \
     -d client_id=YOUR_CLIENT_ID \
     -d client_secret=YOUR_CLIENT_SECRET \
     -d redirect_uri=urn:ietf:wg:oauth:2.0:oob \
     -d grant_type=authorization_code
   # The response contains "refresh_token" — save it.
   ```

6. Add these four secrets to the GitHub repository (**Settings → Secrets and variables →
   Actions**):

   | Secret name | Value |
   | --- | --- |
   | `EXTENSION_ID` | The ID from the Web Store dashboard |
   | `CHROME_CLIENT_ID` | OAuth client ID |
   | `CHROME_CLIENT_SECRET` | OAuth client secret |
   | `CHROME_REFRESH_TOKEN` | Refresh token from the curl step above |

### The workflow file

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to Chrome Web Store

on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Verify tag matches manifest version
        run: |
          MANIFEST_VERSION=$(jq -r '.version' manifest.json)
          TAG_VERSION="${GITHUB_REF_NAME#v}"
          if [ "$MANIFEST_VERSION" != "$TAG_VERSION" ]; then
            echo "ERROR: tag $GITHUB_REF_NAME does not match manifest version $MANIFEST_VERSION"
            exit 1
          fi
          echo "Version check passed: $MANIFEST_VERSION"

      - name: Build ZIP
        run: |
          zip -r extension.zip . \
            --exclude "*.git*" \
            --exclude "*.github*" \
            --exclude "docs/*" \
            --exclude ".beads/*" \
            --exclude ".ralph-tui/*" \
            --exclude "*.test.js" \
            --exclude "README.md"

      - name: Upload and publish
        uses: mnao305/chrome-extension-upload@v5
        with:
          file-path: extension.zip
          extension-id: ${{ secrets.EXTENSION_ID }}
          client-id: ${{ secrets.CHROME_CLIENT_ID }}
          client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
```

### Release workflow (once CI is set up)

```bash
# 1. Bump version in manifest.json
# 2. Commit
git add manifest.json
git commit -m "chore: bump version to 0.3.0"

# 3. Tag — this triggers the publish workflow
git tag v0.3.0
git push origin main --tags
```

The tag version and manifest version must match exactly or the workflow fails before touching
the store.
