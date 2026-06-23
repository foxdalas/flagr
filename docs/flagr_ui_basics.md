# Interface Basics

A quick orientation to the Flagr web UI — the parts that are the same on every page. The rest of this section covers the flag workflow itself: [managing flags](flagr_ui_flags), the [flag editor](flagr_ui_editor), [variants](flagr_ui_variants), [segments](flagr_ui_segments), [distributions](flagr_ui_distribution), and [testing & history](flagr_ui_testing).

## The top bar

Every page shares a top navigation bar:

- **Flagr** (left) — returns to the flags list.
- **API** — opens the interactive [API reference](api) (Swagger UI) for the management and evaluation endpoints.
- **Docs** — this documentation.
- **Version** — the running build version, handy when reporting issues.
- **Theme toggle** and **language switcher** — described below.

## Light & dark theme

The ☀️/🌙 toggle in the top bar switches between **light and dark** themes. Your choice is **remembered** in the browser, so it sticks across visits. Until you choose explicitly, Flagr follows your operating system's appearance (light or dark) automatically.

The whole app — including the documentation and the JSON editors — follows the selected theme.

## Language

Flagr's interface is available in **English, Русский, and Español**. Pick a language from the switcher in the top bar; the choice is **remembered** in the browser. If you've never chosen, Flagr starts in your browser's preferred language when it's one of the supported three, and falls back to English otherwise.

Localization covers the UI chrome and this documentation. Note that your own **data** — flag keys, descriptions, variant keys, segment descriptions, tags — is shown exactly as you entered it and is never translated.

## How saving works

Flagr **never saves automatically**. Every change is explicit, so nothing reaches production by accident:

- Each block (the flag, each variant, each segment, each constraint) has its **own Save button**, active only when that block has unsaved edits.
- **Save all changes** in the sticky header commits everything pending at once (<kbd>Cmd/Ctrl</kbd>+<kbd>S</kbd>).
- An **Unsaved changes** indicator appears whenever something is pending, and Flagr asks for confirmation if you try to leave the page with unsaved edits.

The full details — including what happens when some edits are invalid — are in the [flag editor guide](flagr_ui_editor).

## Finding your way

- The **flags list** is the home screen: search, filter, create, and reopen deleted flags. See [Managing Flags](flagr_ui_flags).
- Opening a flag takes you to its **editor**, organized into a **Config** tab, an **Evaluation Flow** tab, and a **History** tab. See [Editing a Flag](flagr_ui_editor).
