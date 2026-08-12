/** Runtime ports used by the MediaWiki editor integration. */

import type { Logger } from "#shared/logging";
import type { ActionNotifier } from "#shared/mediawiki/notifications";

export interface EditorRuntime {
    logger: Logger;
    notifyAction: ActionNotifier;
}
