import { createServer } from "node:http";
import { HttpRouter } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { SkeletonRpcs } from "@insurance/contract";
import { EventBusLive } from "@insurance/event-bus";
import { Layer } from "effect";
import { ActorMiddlewareLive } from "./actor-middleware.js";
import type { Database } from "./database.js";
import { SkeletonHandlersLive } from "./handlers.js";

export const makeServer = <E>(options: {
	readonly port: number;
	readonly database: Layer.Layer<Database, E>;
}) => {
	const handlers = SkeletonHandlersLive.pipe(
		Layer.provide(EventBusLive),
		Layer.provide(options.database),
	);

	const rpc = RpcServer.layer(SkeletonRpcs).pipe(
		Layer.provide(handlers),
		Layer.provide(ActorMiddlewareLive),
	);

	const protocol = RpcServer.layerProtocolHttp({ path: "/rpc" }).pipe(
		Layer.provide(RpcSerialization.layerNdjson),
	);

	return HttpRouter.Default.serve().pipe(
		Layer.provide(rpc),
		Layer.provide(protocol),
		Layer.provide(
			NodeHttpServer.layer(() => createServer(), { port: options.port }),
		),
	);
};
