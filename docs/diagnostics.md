# Diagnostics and Action Notifications

Every gadget uses the shared logger for developer diagnostics and the native
MediaWiki notification system for brief user-facing action results. Do not use
Codex Toast components or direct `console.*` and `mw.notify` calls in gadget
source.

## Logging

Create one root logger in `main.ts` and inject scoped child loggers into
workflows, adapters, and UI boundaries:

```ts
import { createLogger } from "#shared/logging";

const logger = createLogger("vg-page-assessor");
const mediaWikiLogger = logger.child("mediawiki");

mediaWikiLogger.info("page.fetch.started", { namespaceNumber: 0 });
mediaWikiLogger.error("page.fetch.failed", { error });
```

The levels, from least to most verbose, are `silent`, `error`, `warn`, `info`,
and `debug`. The default active level is `warn`. Each event name uses stable,
dot-separated words. Console output is prefixed consistently:

```text
[mediawiki-gadgets][vg-page-assessor][mediawiki]
```

Configure the common level and optional gadget overrides before a gadget
starts:

```js
window.mediaWikiGadgetsConfig = {
    logging: {
        level: "warn",
        gadgets: {
            "citation-formatter": "debug",
        },
    },
};
```

The gadget-specific setting wins over the common setting. Invalid levels fall
back safely. `child(scope)` adds a stable responsibility scope. `isEnabled`
avoids expensive diagnostic construction. `startTimer(event)` returns an
idempotent completion function for operation timing.

The logger sanitizes details before sending them to the console. Exception
messages are redacted because free-form errors often contain page titles or
source content; log a safe error code or bounded outcome field separately.
Never rely on that defense to justify logging credentials, tokens, cookies,
user or session data, article text, HTML, edit summaries, or complete requests
and responses. Domain code does not log.

## Action Notifications

Create the notifier in `main.ts` and inject it where short action feedback is
needed:

```ts
import { createActionNotifier } from "#shared/mediawiki/notifications";

const notify = createActionNotifier("wiked-lite");

notify({
    key: "format-complete",
    type: "success",
    message: msg("feedback.formatComplete"),
});
```

Notifications accept a stable `key`, a localized plain-text `message`, and one
of `success`, `info`, `warning`, or `error`. The adapter maps `warning` to the
MediaWiki `warn` type. Tags use the form `mediawiki-gadgets:<gadget>:<key>`, so
a repeated action replaces its previous message without colliding with another
gadget.

Success and information messages use MediaWiki's `short` lifetime. Warnings use
`long`. Errors remain until dismissed. MediaWiki owns the corner placement,
queue, RTL layout, dismissal control, and accessibility behavior. Gadget CSS
must not position or restyle notifications.

Use notifications for brief outcomes such as a completed format, a missing
editor, or a terminal action failure. Keep `CdxMessage` inside a dialog for
persistent validation, review, progress, recovery, and retry information. Never
use `CdxToast`, `CdxToastContainer`, or `useToast`.

## Event Design

One event name describes one stable outcome, not prose. Prefer names such as:

- `startup.failed`
- `page.fetch.started`
- `page.fetch.failed`
- `save.completed`
- `save.uncertain`

Put variable data in structured details. Use `debug` for development tracing,
`info` for normal milestones, `warn` for degraded but recoverable behavior, and
`error` for failed operations. A user notification and a log entry may describe
the same failure, but the notification is localized and actionable while the
log stays diagnostic and sanitized.
