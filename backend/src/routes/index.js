import { Router } from "express";
import authRoutes from "./authRoutes.js";
import questionnaireRoutes from "./questionnaireRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import dietRoutes from "./dietRoutes.js";
import foodRoutes from "./foodRoutes.js";
import activityRoutes from "./activityRoutes.js";
import progressRoutes from "./progressRoutes.js";
import aiContextRoutes from "./aiContextRoutes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/questionnaire", questionnaireRoutes);
apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/diet", dietRoutes);
apiRouter.use("/foods", foodRoutes);
apiRouter.use("/activities", activityRoutes);
apiRouter.use("/progress", progressRoutes);
apiRouter.use("/ai", aiContextRoutes);

export default apiRouter;
