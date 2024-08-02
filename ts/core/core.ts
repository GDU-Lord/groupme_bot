import TelegramBot from "node-telegram-bot-api";
import { ExtendedQuery } from "./listener.js";

type Decrement<I extends number> = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][I];

export type OmitArray<T extends any[], I extends number> =
T extends [] ? [] :
T extends [infer Head, ...infer Rest] ? (I extends 0 ? Rest : [Head, ...OmitArray<Rest, Decrement<I>>]) : never;

export function toMessage(obj: any) {
  return "message_id" in obj ? obj as TelegramBot.Message : null;
}

export function toQuery<data>(obj: any) {
  return "data" in obj ? obj as ExtendedQuery<data> : null;
}