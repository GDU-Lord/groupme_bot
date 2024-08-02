import TelegramBot from "node-telegram-bot-api";
import { mode, setup } from "../commands/shared.js";
import { ExtendedQuery } from "../core/listener.js";
import { toMessage, toQuery } from "../core/core.js";
import Community from "../community.js";

export function getSign(bool: boolean) {
  if (bool) return "✅";
  return "";
}

export function getState(msg: TelegramBot.Message | ExtendedQuery<any>) {
  return setup.getState(msg.from?.id)?.state ?? null;
}

export function setStateMode(msg: TelegramBot.Message | ExtendedQuery<any>, md: mode) {
  const state = setup.getState(msg.from?.id)?.state!;
  state.mode = md;
}

export function getCommunity(input: TelegramBot.Message | ExtendedQuery<any>) {
  const msg = toMessage(input);
  const query = toQuery(input);
  if(msg) {
    return Community.list[msg.chat.id] ?? null;
  }
  if(query) {
    if(query.message == null) return null;
    return Community.list[query.message?.chat.id] ?? null;
  }
  return null;
}

export function getBottom<T extends { [key: string]: any }> (o: T, path: string[]): unknown {
  const fragment = path.shift() as string;
  if(fragment == null) return o;
  return getBottom(o[fragment], path);
}

