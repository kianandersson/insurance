import { HeartbeatEmitted } from "@insurance/events";
import { CurrentActor, HealthStatus, SkeletonRpcs } from "@insurance/seam";
import { Effect } from "effect";
import { Database } from "./database.js";
import { EventBus } from "./event-bus.js";
import { Projection } from "./projection.js";

export const SkeletonHandlersLive = SkeletonRpcs.toLayer(
	Effect.gen(function* () {
		const bus = yield* EventBus;
		const projection = yield* Projection;
		const database = yield* Database;

		return {
			Health: () =>
				Effect.gen(function* () {
					const actor = yield* CurrentActor;
					const isReachable = yield* database.ping;
					return HealthStatus.make({
						status: "ok",
						database: isReachable ? "up" : "down",
						actor: actor.id,
					});
				}),

			Announce: ({ message }) =>
				Effect.gen(function* () {
					const actor = yield* CurrentActor;
					yield* bus.publish(
						HeartbeatEmitted.make({
							message,
							actor,
							occurredAt: new Date(),
						}),
					);
				}),

			Subscribe: () => projection.changes,
		};
	}),
);
