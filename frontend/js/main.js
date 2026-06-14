import { initRouter, registerPage } from "./router.js";
import { initAuthPage } from "./pages/auth.js";
import { initProfilePage } from "./pages/profile.js";
import { initGuideToursPage } from "./pages/tours-guide.js";
import { initBrowseToursPage } from "./pages/tours-browse.js";
import { initCartPage } from "./pages/cart.js";
import { initBlogPage } from "./pages/blog.js";
import { initFollowersPage } from "./pages/followers.js";
import { initSimulatorPage } from "./pages/simulator.js";
import { initAdminPage } from "./pages/admin.js";

registerPage("auth", initAuthPage);
registerPage("profile", initProfilePage);
registerPage("browse", initBrowseToursPage);
registerPage("cart", initCartPage);
registerPage("guide", initGuideToursPage);
registerPage("blog", initBlogPage);
registerPage("followers", initFollowersPage);
registerPage("simulator", initSimulatorPage);
registerPage("admin", initAdminPage);

initRouter();
