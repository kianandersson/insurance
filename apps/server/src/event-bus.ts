import type { DomainEvent } from "@insurance/events";
import { Context, Effect, Layer, PubSub, Stream } from "effect";

export interface EventBusService {
	readonly publish: (event: DomainEvent) => Effect.Effect<void>;
	readonly events: Stream.Stream<DomainEvent>;
}

export class EventBus extends Context.Tag("@insurance/server/EventBus")<
	EventBus,
	EventBusService
>() {}

export const EventBusLive = Layer.effect(
	EventBus,
	Effect.gen(function* () {
		const pubsub = yield* PubSub.unbounded<DomainEvent>();
		return EventBus.of({
			publish: (event) => Effect.asVoid(PubSub.publish(pubsub, event)),
			events: Stream.fromPubSub(pubsub),
		});
	}),
);
