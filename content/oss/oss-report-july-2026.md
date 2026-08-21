+++
date = "2026-07-31T00:00:00+03:00"
title = "Open Source Report"
subtitle = "July 2026"
slug = "2026-07"
draft = false
image = "/img/og/oss-report-july-2026.png"
comments = true
+++

A quiet month — most of it went to vacation, so there are only two things to report.

**LMPlayground 1.9.0** taught the app to read. Attach a PDF, Word file, or EPUB and ask questions about it — retrieval runs entirely on-device, so a small embedding model downloads once and then works with every chat model, and your files never leave the phone.

Everything Spark shipped **1.3.0**. Agents can now act on your calendar through a new **`event`** tool, gated behind a new **send** access level. The skills also landed in a third place: **spark-codex-marketplace**, a new Codex plugin marketplace that installs all 34 Spark skills in one step.

## LMPlayground

- **[1.9.0](https://github.com/andriydruk/LMPlayground/releases/tag/1.9.0)** — **Documents** — attach a file (PDF, Word, EPUB, HTML, Markdown, plain text) and ask questions about it. On-device search finds the right passages by meaning; a small embedding model downloads once on first use and works with every chat model.

## spark-cli-skills

- **[1.3.0](https://github.com/readdle/spark-cli-skills/releases/tag/1.3.0)** — New **`event`** command — create, update, delete, and RSVP to calendar events, and invite or remove attendees. Adds the **send** access level alongside read-only and triage, configured per account and shared inbox in Spark Desktop.

## spark-claude-extension

- **[1.3.0](https://github.com/readdle/spark-claude-extension/releases/tag/1.3.0)** — The **`event`** tool and **send** access level come to Claude Desktop.

## spark-codex-marketplace

- **[1.3.0](https://github.com/readdle/spark-codex-marketplace/releases/tag/1.3.0)** — A new Codex plugin marketplace for Spark. Add the repo as a marketplace in Codex, install the Spark plugin, and get all 34 skills — email, calendar, contacts, teams, and meeting notes.
