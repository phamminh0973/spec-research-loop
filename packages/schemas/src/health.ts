import { z } from "zod";

import { IsoTimestampSchema } from "./common";

export const HealthStatusSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  service: z.literal("specloop-api"),
  version: z.string(),
  timestamp: IsoTimestampSchema,
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;