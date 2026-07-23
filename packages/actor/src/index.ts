import { Context, Schema } from "effect";

export const Seller = Schema.TaggedStruct("Seller", {
	id: Schema.String,
});

export const Ai = Schema.TaggedStruct("Ai", {});

export const System = Schema.TaggedStruct("System", {});

export const Actor = Schema.Union(Seller, Ai, System);
export type Actor = typeof Actor.Type;

export class CurrentActor extends Context.Tag("@insurance/actor/CurrentActor")<
	CurrentActor,
	Actor
>() {}

export const actorRef = (actor: Actor): string => {
	switch (actor._tag) {
		case "Seller":
			return `seller:${actor.id}`;
		case "Ai":
			return "ai";
		case "System":
			return "system";
	}
};
