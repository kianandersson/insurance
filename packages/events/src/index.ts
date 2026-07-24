import { Schema } from "effect";

export const User = Schema.Struct({
	id: Schema.String,
});
export type User = typeof User.Type;

export const HeartbeatEmitted = Schema.TaggedStruct("HeartbeatEmitted", {
	message: Schema.String,
	actor: User,
	occurredAt: Schema.Date,
});

export const DomainEvent = Schema.Union(HeartbeatEmitted);
export type DomainEvent = typeof DomainEvent.Type;
