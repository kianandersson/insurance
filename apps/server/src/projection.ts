import type { DomainEvent } from "@insurance/events";
import type { HeartbeatProjection } from "@insurance/seam";
import { Context, Effect, Layer, Stream, SubscriptionRef } from "effect";
import { EventBus } from "./event-bus.js";

const empty: HeartbeatProjection = {
	count: 0,
	lastMessage: null,
	lastActor: null,
};

const fold = (
	current: HeartbeatProjection,
	event: DomainEvent,
): HeartbeatProjection => ({
	count: current.count + 1,
	lastMessage: event.message,
	lastActor: event.actor.id,
});

export class Projection extends Context.Tag("@insurance/server/Projection")<
	Projection,
	{ readonly changes: Stream.Stream<HeartbeatProjection> }
>() {}

export const ProjectionLive = Layer.scoped(
	Projection,
	Effect.gen(function* () {
		const bus = yield* EventBus;
		const ref = yield* SubscriptionRef.make(empty);

		yield* bus.events.pipe(
			Stream.runForEach((event) =>
				SubscriptionRef.update(ref, (current) => fold(current, event)),
			),
			Effect.forkScoped,
		);

		return { changes: ref.changes };
	}),
);
