import TelegramBot from "node-telegram-bot-api";
import { Listener } from "./listener.js";

export function getThreadId(msg: TelegramBot.Message) {
  const t = msg.message_thread_id ?? -Infinity;
  const id = msg.message_id;
  return t + 1 === id ? 0 : t;
}

export function isReply(msg: TelegramBot.Message) {
  const threadId = getThreadId(msg);
  if(msg.reply_to_message?.message_id !== threadId)
    return false;
  if(msg.reply_to_message?.message_thread_id === threadId)
    return false;
  return true;
}

export type args<L extends Listener> = L["args"];

export class Insert {

  constructor(
    public text: string
  ) {}

  getText(data: {
    [key: string]: any
  }) {
    let res = this.text;
    const match = this.text.match(/\{[0-9A-Za-z\.]{1,}\}/g);
    match?.forEach((key) => {
      key = key.slice(1, key.length-1);
      res = res.replaceAll(`{${key}}`, String(getBottom(data, key.split(".")) ?? ""));
    });
    return res;
  }

}

export function getBottom<T extends { [key: string]: any }> (o: T, path: string[]): unknown {
  const fragment = path.shift() as string;
  if(fragment == null) return o;
  return getBottom(o[fragment], path);
}

function* makeCounter () {
  let i = 0;
  while(true) {
    i ++;
    yield String(i);
  }
}

export const idCounter = makeCounter();