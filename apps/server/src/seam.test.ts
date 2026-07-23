import { createServer } from "node:net";
import { RpcClient } from "@effect/rpc";
import { layerProtocol, SkeletonRpcs } from "@insurance/contract";
import { Chunk, Effect, Fiber, Layer, Schedule, Stream } from "effect";
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

const retryUntilUp = Schedule.recurs(100).pipe(
	Schedule.addDelay(() => "20 millis"),
);

const withServer = <A, E>(use: (url: string) => Effect.Effect<A, E>) =>
	Effect.gen(function* () {
		const port = yield* Effect.promise(freePort);
		yield* Effect.forkScoped(
			Layer.launch(makeServer({ port, database: DatabaseUp })),
		);
		return yield* use(`http://localhost:${port}/rpc`);
	}).pipe(Effect.scoped);

const exercise = Effect.gen(function* () {
	const client = yield* RpcClient.make(SkeletonRpcs);

	// Retry the first call until the freshly forked server is listening.
	const health = yield* client.Health().pipe(Effect.retry(retryUntilUp));

	const subscriber = yield* Effect.fork(
		client.Subscribe().pipe(Stream.take(2), Stream.runCollect),
	);
	yield* Effect.sleep("200 millis");

	yield* client.Publish({ message: "first" });
	yield* client.Publish({ message: "second" });

	const events = Chunk.toReadonlyArray(yield* Fiber.join(subscriber));
	return { health, events };
});

describe("the internal Effect seam", () => {
	it("round-trips a unary call and pushes live stream updates to a subscriber", async () => {
		const { health, events } = await Effect.runPromise(
			withServer((url) =>
				exercise.pipe(
					Effect.provide(layerProtocol({ url, actorId: "seller-1" })),
					Effect.scoped,
				),
			),
		);

		expect(health.status).toBe("ok");
		expect(health.database).toBe("up");
		expect(health.actor).toBe("seller:seller-1");

		expect(events.map((event) => event.message)).toEqual(["first", "second"]);
		expect(events.every((event) => event.actor === "seller:seller-1")).toBe(
			true,
		);
	});

	it("resolves a stub actor at the edge when no identity is supplied", async () => {
		const health = await Effect.runPromise(
			withServer((url) =>
				RpcClient.make(SkeletonRpcs).pipe(
					Effect.flatMap((client) =>
						client.Health().pipe(Effect.retry(retryUntilUp)),
					),
					Effect.provide(layerProtocol({ url })),
					Effect.scoped,
				),
			),
		);

		expect(health.actor).toBe("seller:stub-seller");
	});
});
