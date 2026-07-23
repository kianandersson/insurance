import { actorRef, CurrentActor } from "@insurance/actor";
import { HealthStatus, PublishResult, SkeletonRpcs } from "@insurance/contract";
import { EventBus, HeartbeatEmitted } from "@insurance/event-bus";
import { Effect } from "effect";
import { Database } from "./database.js";

export const SkeletonHandlersLive = SkeletonRpcs.toLayer(
	Effect.gen(function* () {
		const bus = yield* EventBus;
		const database = yield* Database;

		return {
			Health: () =>
				Effect.gen(function* () {
					const actor = yield* CurrentActor;
					const isReachable = yield* database.ping;
					return HealthStatus.make({
						status: "ok",
						database: isReachable ? "up" : "down",
						actor: actorRef(actor),
					});
				}),

			Publish: ({ message }) =>
				Effect.gen(function* () {
					const actor = yield* CurrentActor;
					yield* bus.publish(
						HeartbeatEmitted.make({
							message,
							actor: actorRef(actor),
							occurredAt: new Date(),
						}),
					);
					return PublishResult.make({ isPublished: true });
				}),

			Subscribe: () => bus.events,
		};
	}),
);
