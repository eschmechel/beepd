import { Hono } from "hono";

import { authRoutes } from "@/routes/v1/auth";
import { friendsRoutes } from "@/routes/v1/friends";
import { locationRoutes } from "@/routes/v1/location";
import { nearbyRoutes } from "@/routes/v1/nearby";
import { policiesRoutes } from "@/routes/v1/policies";

export const v1Routes = new Hono();

v1Routes.route("/auth", authRoutes);
v1Routes.route("/friends", friendsRoutes);
v1Routes.route("/policies", policiesRoutes);
v1Routes.route("/location", locationRoutes);
v1Routes.route("/nearby", nearbyRoutes);
