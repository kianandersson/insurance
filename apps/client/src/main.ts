import { NodeRuntime } from "@effect/platform-node";
import { RpcClient } from "@effect/rpc";
import { layerProtocol, SkeletonRpcs } from "@insurance/seam";
import { Chunk, Config, Console, Effect, Fiber, Stream } from "effect";

const demo = Effect.gen(function* () {
	const client = yield* RpcClient.make(SkeletonRpcs);

	const health = yield* client.Health();
	yield* Console.log(
		`health: status=${health.status} database=${health.database} actor=${health.actor}`,
	);

	const projection = yield* Effect.fork(
		client.Subscribe().pipe(Stream.take(3), Stream.runCollect),
	);

	// Let the subscription attach before issuing commands.
	yield* Effect.sleep("200 millis");

	yield* client.Announce({ message: "hello" });
	yield* client.Announce({ message: "world" });

	const snapshots = yield* Fiber.join(projection);
	for (const snapshot of Chunk.toReadonlyArray(snapshots)) {
		yield* Console.log(
			`projection: count=${snapshot.count} last=${snapshot.lastMessage ?? "-"} (from ${snapshot.lastActor ?? "-"})`,
		);
	}
});

const program = Effect.gen(function* () {
	const url = yield* Config.string("SERVER_URL").pipe(
		Config.withDefault("http://localhost:3000/rpc"),
	);
	const actorId = yield* Config.string("ACTOR_ID").pipe(
		Config.withDefault("demo-user"),
	);
	yield* demo.pipe(Effect.provide(layerProtocol({ url, actorId })));
});

NodeRuntime.runMain(Effect.scoped(program));
