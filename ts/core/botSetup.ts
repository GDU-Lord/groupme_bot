import TelegramBot from "node-telegram-bot-api";
import { Listener } from "./listener.js";
import State from "./state.js";

interface LocalMem {
  event: keyof TelegramBot.TelegramEvents;
  bot: BotSetup;
}

async function callback(this: LocalMem, ...args: any[]): Promise<void> {
  for(const i in this.bot.sorted_listeners[this.event]) {
    const res = await this.bot.sorted_listeners[this.event][i].callback(...args as any);
    if(!res) return;
  }
  await this.bot.onUnhandled(...args);
  return;
}

export interface options {
  sendMessageOptions?: TelegramBot.SendMessageOptions;
};

export default class BotSetup<Schema extends Object = {}> {

  OPTION_LIFE = 1000*60*60;

  listeners: ObjectList<ObjectList<Listener>> = {};
  sorted_listeners: ObjectList<Listener[]> = {};
  states: {
    [key: string]: State<Schema>
  } = {};

  constructor(public bot: TelegramBot, public defaultState: Schema, public options: options = {}, callback: (setup: BotSetup<Schema>) => void = () => {}) {
    callback(this);
  }

  addListener(listener: Listener) {
    if(!(listener.event in this.listeners)) {
      this.listeners[listener.event] = {};
      this.initListener(listener.event);
    }
    this.listeners[listener.event][listener.id.toString()] = listener;
    this.sortListeners(listener.event);
  }

  sortListeners(event: keyof TelegramBot.TelegramEvents) {
    this.sorted_listeners[event] = Object.values(this.listeners[event]).sort((a, b) => {
      if(a.priority > b.priority)
        return 1;
      if(a.priority < b.priority)
        return -1;
      return 0;
    });
  }

  removeListener(listener: Listener) {
    if(!(listener.event in this.listeners) || !(listener.id.toString() in this.listeners[listener.event])) return false;
    delete this.listeners[listener.event][listener.id.toString()];
    return true;
  }

  private initListener(event: keyof TelegramBot.TelegramEvents) {
    this.bot.addListener(event, callback.bind({ event, bot: this }));
  }

  onUnhandled = async (...args: any[]) => {
    return true;
  };

  initState(userId?: number) {
    if(userId == null) return null;
    if(!(userId in this.states))
      this.states[userId] = new State<Schema>(userId, JSON.parse(JSON.stringify(this.defaultState)));;
    return this.states[userId] ?? null;
  }

  resetState(userId?: number) {
    this.removeState(userId);
    return this.initState(userId);
  }

  removeState(userId?: number) {
    if(userId == null) return false;
    if(!(userId in this.states)) return false;
    delete this.states[userId];
    return true;
  }

  getState(userId?: number): State<Schema> | null {
    if(userId == null) return null;
    return this.states[userId] ?? null;
  }

}