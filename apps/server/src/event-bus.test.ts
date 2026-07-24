import { HeartbeatEmitted, User } from "@insurance/events";
import { Chunk, Effect, Fiber, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { EventBus, EventBusLive } from "./event-bus.js";

const event = (message: string) =>
	HeartbeatEmitted.make({
		message,
		actor: User.make({ id: "system" }),
		occurredAt: new Date("2026-07-23T00:00:00.000Z"),
	});

describe("EventBus", () => {
	it("delivers events published after a subscriber is listening", async () => {
		const program = Effect.gen(function* () {
			const bus = yield* EventBus;

			const collecting = yield* Effect.fork(
				bus.events.pipe(Stream.take(2), Stream.runCollect),
			);

			// Let the forked subscriber attach before publishing.
			yield* Effect.sleep("100 millis");

			yield* bus.publish(event("first"));
			yield* bus.publish(event("second"));

			const received = yield* Fiber.join(collecting);
			return Chunk.toReadonlyArray(received).map((e) => e.message);
		});

		const messages = await Effect.runPromise(
			program.pipe(Effect.provide(EventBusLive)),
		);

		expect(messages).toEqual(["first", "second"]);
	});

	it("fans one event out to every current subscriber", async () => {
		const program = Effect.gen(function* () {
			const bus = yield* EventBus;

			const one = yield* Effect.fork(
				bus.events.pipe(Stream.take(1), Stream.runCollect),
			);
			const two = yield* Effect.fork(
				bus.events.pipe(Stream.take(1), Stream.runCollect),
			);

			yield* Effect.sleep("100 millis");
			yield* bus.publish(event("broadcast"));

			const first = yield* Fiber.join(one);
			const second = yield* Fiber.join(two);
			return [
				Chunk.toReadonlyArray(first)[0]?.message,
				Chunk.toReadonlyArray(second)[0]?.message,
			];
		});

		const seen = await Effect.runPromise(
			program.pipe(Effect.provide(EventBusLive)),
		);

		expect(seen).toEqual(["broadcast", "broadcast"]);
	});
});
