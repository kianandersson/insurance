import { Context, Effect, Layer, PubSub, Schema, Stream } from "effect";

export const HeartbeatEmitted = Schema.TaggedStruct("HeartbeatEmitted", {
	message: Schema.String,
	actor: Schema.String,
	occurredAt: Schema.Date,
});

export const DomainEvent = Schema.Union(HeartbeatEmitted);
export type DomainEvent = typeof DomainEvent.Type;

export interface EventBusService {
	readonly publish: (event: DomainEvent) => Effect.Effect<void>;
	readonly events: Stream.Stream<DomainEvent>;
}

export class EventBus extends Context.Tag("@insurance/event-bus/EventBus")<
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
