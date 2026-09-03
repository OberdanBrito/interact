// Interact Admin — composition root.
import { resolveTenantFromHost, restoreSession } from "../features/auth/session.js";
import { initRouter } from "./router.js";

resolveTenantFromHost();
restoreSession();
initRouter();
