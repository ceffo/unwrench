# Unwrench 🔧

Stop reviewing generated files. Unwrench marks auto-generated code in GitLab MR diffs so you can
focus on what was actually written by a human (or an AI agent 🤖).

---

## What it does

Unwrench reads the `gitlab-generated` attribute from your repository's `.gitattributes` file —
that's the only detection mechanism. No heuristics, no guessing.

When you open a merge request, it surfaces every file your team has tagged as generated:

- **🔧 icon** next to every generated file in the sidebar and diff headers — spot them at a glance.
- **Dimmed sidebar rows** — generated files fade out so the files that matter stand out.
- **Hide from diff** — one toggle to remove generated file diffs entirely. The sidebar always shows
  everything, just faded, so you never lose context.
- **Auto-mark as Viewed** — another toggle to instantly collapse all generated files when you open
  any MR, the same way as clicking Viewed yourself.

---

## Installation

> The extension is not yet on the Chrome Web Store. Install it manually for now:

1. [Download or clone this repository](https://github.com/ceffo/unwrench).
2. Open **`chrome://extensions`** in Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the downloaded folder.
5. The Unwrench icon appears in your toolbar — you're done.

---

## Setup: tell Unwrench which files are generated

Unwrench reads a standard Git attribute called `gitlab-generated` from your repository's
`.gitattributes` file. Add it once to your repo and every reviewer benefits automatically.

```gitattributes
# Mark protobuf generated output
*.pb.go gitlab-generated

# Mark an entire folder
src/generated/** gitlab-generated
```

That's it. No per-user configuration needed. When a team member opens an MR, Unwrench picks up
the attribute and does the rest.

---

## Works on any GitLab instance

Unwrench works on `gitlab.com` and on any self-hosted GitLab (15.0+). No extra configuration is
required — just enter your GitLab host URL in the popup if you're not on `gitlab.com`.

---

## Settings

Click the 🔧 toolbar icon on any GitLab MR page to open the popup:

| Toggle | What it does |
| --- | --- |
| **Auto-mark as Viewed** | Collapses generated files automatically when you open any MR |
| **Hide from diff** | Removes generated file diffs from the page entirely |

Settings sync across your devices via your Chrome account.

---

## Requirements

- Chrome 120 or later
- GitLab 15.0 or later

---

## Roadmap

- Per-project or per-MR override toggles
- Keyboard shortcut to toggle hide mode
- Firefox support
- GitHub and Bitbucket support
