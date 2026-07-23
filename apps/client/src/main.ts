import { NodeRuntime } from "@effect/platform-node";
import { RpcClient } from "@effect/rpc";
import { layerProtocol, SkeletonRpcs } from "@insurance/contract";
import { Chunk, Config, Console, Effect, Fiber, Stream } from "effect";

const demo = Effect.gen(function* () {
	const client = yield* RpcClient.make(SkeletonRpcs);

	const health = yield* client.Health();
	yield* Console.log(
		`health: status=${health.status} database=${health.database} actor=${health.actor}`,
	);

	const subscriber = yield* Effect.fork(
		client.Subscribe().pipe(Stream.take(2), Stream.runCollect),
	);

	// Let the subscription attach before publishing.
	yield* Effect.sleep("200 millis");

	yield* client.Publish({ message: "hello" });
	yield* client.Publish({ message: "world" });

	const events = yield* Fiber.join(subscriber);
	for (const event of Chunk.toReadonlyArray(events)) {
		yield* Console.log(`event: ${event.message} (from ${event.actor})`);
	}
});

const program = Effect.gen(function* () {
	const url = yield* Config.string("SERVER_URL").pipe(
		Config.withDefault("http://localhost:3000/rpc"),
	);
	const actorId = yield* Config.string("ACTOR_ID").pipe(
		Config.withDefault("demo-seller"),
	);
	yield* demo.pipe(Effect.provide(layerProtocol({ url, actorId })));
});

NodeRuntime.runMain(Effect.scoped(program));
