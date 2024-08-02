import { ObjectId } from "mongodb";
import TelegramBot, { CallbackQuery, Message, Metadata } from "node-telegram-bot-api";
import BotSetup from "./botSetup.js";

export interface ListenerConstructor<L extends Listener> {
  new (bot: BotSetup, callback: (...args: L["args"]) => Promise<boolean>, priority?: number): L;
}

export class Listener<T extends any[] = any, T2 extends any[] = T> {

  declare args: T;
  declare event: keyof TelegramBot.TelegramEvents;
  id: ObjectId;

  constructor(
    public setup: BotSetup,
    public callback: (...args: T2) => Promise<boolean | void>,
    public priority: number = 0,
  ) {
    this.id = new ObjectId;
  }

  init() {
    this.setup.addListener(this);
  }

  remove() {
    return this.setup.removeListener(this);
  }

  restore() {
    this.init();
  }

  emulate(...args: T2) {
    this.callback(...args);
  }

  setPriority(priority: number) {
    this.priority = priority;
    this.setup.sortListeners(this.event);
  }

}

export interface ExtendedQuery<T> extends Omit<TelegramBot.CallbackQuery, "data"> {
  data: {
    data: T
    id: ObjectId
  };
}


export class MessageListener extends Listener<[TelegramBot.Message, TelegramBot.Metadata]> {

  event: keyof TelegramBot.TelegramEvents = "message";

  constructor(setup: Listener["setup"], callback: Listener["callback"]) {
    super(setup, callback);
    this.init();
  }

}

export class QueryListener<data = any> extends Listener<[ExtendedQuery<data>], [CallbackQuery]> {
  
  event: keyof TelegramBot.TelegramEvents = "callback_query";

  constructor(setup: Listener["setup"], callback: Listener["callback"]) {
    super(setup, async (query: CallbackQuery) => {
      try {
        const newQuery = JSON.parse(JSON.stringify(query)) as ExtendedQuery<any>;
        newQuery.data = JSON.parse(query.data ?? "{}");
        return await callback(newQuery);
      } catch {
        return false;
      }
    });
    this.init();
  }
  
}