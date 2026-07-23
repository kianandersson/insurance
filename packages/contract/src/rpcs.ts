import { Rpc, RpcGroup } from "@effect/rpc";
import { DomainEvent } from "@insurance/event-bus";
import { Schema } from "effect";
import { ActorMiddleware } from "./middleware.js";

export const HealthStatus = Schema.Struct({
	status: Schema.Literal("ok"),
	database: Schema.Literal("up", "down"),
	actor: Schema.String,
});
export type HealthStatus = typeof HealthStatus.Type;

export const PublishResult = Schema.Struct({
	isPublished: Schema.Boolean,
});
export type PublishResult = typeof PublishResult.Type;

export class SkeletonRpcs extends RpcGroup.make(
	Rpc.make("Health", {
		success: HealthStatus,
	}),
	Rpc.make("Publish", {
		success: PublishResult,
		payload: { message: Schema.String },
	}),
	Rpc.make("Subscribe", {
		success: DomainEvent,
		stream: true,
	}),
).middleware(ActorMiddleware) {}
