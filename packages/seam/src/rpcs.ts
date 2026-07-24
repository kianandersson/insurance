import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { ActorMiddleware } from "./middleware.js";

export const HealthStatus = Schema.Struct({
	status: Schema.Literal("ok"),
	database: Schema.Literal("up", "down"),
	actor: Schema.String,
});
export type HealthStatus = typeof HealthStatus.Type;

export const HeartbeatProjection = Schema.Struct({
	count: Schema.Number,
	lastMessage: Schema.NullOr(Schema.String),
	lastActor: Schema.NullOr(Schema.String),
});
export type HeartbeatProjection = typeof HeartbeatProjection.Type;

export class SkeletonRpcs extends RpcGroup.make(
	Rpc.make("Health", {
		success: HealthStatus,
	}),
	Rpc.make("Announce", {
		payload: { message: Schema.String },
	}),
	Rpc.make("Subscribe", {
		success: HeartbeatProjection,
		stream: true,
	}),
).middleware(ActorMiddleware) {}
