import { connect, createServer } from "node:net";
import { RpcClient } from "@effect/rpc";
import { layerProtocol, SkeletonRpcs } from "@insurance/seam";
import { Chunk, Effect, Either, Fiber, Layer, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { makeServer } from "./app.js";
import { Database } from "./database.js";

const DatabaseUp = Layer.succeed(
	Database,
	Database.of({ ping: Effect.succeed(true) }),
);

const freePort = () =>
	new Promise<number>((resolve, reject) => {
		const probe = createServer();
		probe.once("error", reject);
		probe.listen(0, () => {
			const address = probe.address();
			const port = typeof address === "object" && address ? address.port : 0;
			probe.close(() => resolve(port));
		});
	});

const waitForPort = (port: number) =>
	new Promise<void>((resolve, reject) => {
		const attempt = (remaining: number) => {
			const socket = connect(port, "localhost");
			socket.once("connect", () => {
				socket.end();
				resolve();
			});
			socket.once("error", () => {
				socket.destroy();
				if (remaining <= 0) reject(new Error("server never came up"));
				else setTimeout(() => attempt(remaining - 1), 20);
			});
		};
		attempt(100);
	});

const withServer = <A, E>(use: (url: string) => Effect.Effect<A, E>) =>
	Effect.gen(function* () {
		const port = yield* Effect.promise(freePort);
		yield* Effect.forkScoped(
			Layer.launch(makeServer({ port, database: DatabaseUp })),
		);
		yield* Effect.promise(() => waitForPort(port));
		return yield* use(`http://localhost:${port}/rpc`);
	}).pipe(Effect.scoped);

const exercise = Effect.gen(function* () {
	const client = yield* RpcClient.make(SkeletonRpcs);

	const health = yield* client.Health();

	const subscriber = yield* Effect.fork(
		client.Subscribe().pipe(Stream.take(3), Stream.runCollect),
	);
	yield* Effect.sleep("200 millis");

	yield* client.Announce({ message: "first" });
	yield* client.Announce({ message: "second" });

	const snapshots = Chunk.toReadonlyArray(yield* Fiber.join(subscriber));
	return { health, snapshots };
});

describe("the internal Effect seam", () => {
	it("round-trips a command and streams the folded projection to a subscriber", async () => {
		const { health, snapshots } = await Effect.runPromise(
			withServer((url) =>
				exercise.pipe(
					Effect.provide(layerProtocol({ url, actorId: "user-1" })),
					Effect.scoped,
				),
			),
		);

		expect(health.status).toBe("ok");
		expect(health.database).toBe("up");
		expect(health.actor).toBe("user-1");

		expect(snapshots.map((snapshot) => snapshot.count)).toEqual([0, 1, 2]);
		expect(snapshots.at(-1)).toEqual({
			count: 2,
			lastMessage: "second",
			lastActor: "user-1",
		});
	});

	it("fails closed when no actor identity is supplied at the edge", async () => {
		const result = await Effect.runPromise(
			withServer((url) =>
				RpcClient.make(SkeletonRpcs).pipe(
					Effect.flatMap((client) => client.Health()),
					Effect.provide(layerProtocol({ url })),
					Effect.scoped,
					Effect.either,
				),
			),
		);

		expect(Either.isLeft(result)).toBe(true);
		if (Either.isLeft(result)) {
			expect(result.left._tag).toBe("ActorUnresolved");
		}
	});
});
