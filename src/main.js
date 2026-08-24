// Interact Admin — composition root.
import { restoreSession } from "./session.js";
import { initRouter } from "./router.js";

restoreSession();
initRouter();
