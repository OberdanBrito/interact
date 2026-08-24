// Interact Admin — composition root.
import { restoreSession } from "../features/auth/session.js";
import { initRouter } from "./router.js";

restoreSession();
initRouter();
