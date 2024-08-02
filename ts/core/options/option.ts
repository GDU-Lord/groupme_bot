import TelegramBot, { Message, MessageId } from "node-telegram-bot-api";
import BotSetup from "../botSetup.js";
import { Listener } from "../listener.js";
import { args } from "../utils.js";
import { ObjectId } from "mongodb";
import { Response } from "../response.js";
import MessageEmitter from "../message.js";

export enum optionType {
  BUTTON = "BUTTON",
  COMMAND = "COMMAND",
  MESSAGE = "MESSAGE",
  ROW = "ROW",
  MENU = "MENU",
};

interface option<L extends Listener = any> {

  parse(inline_keyboard: TelegramBot.InlineKeyboardMarkup["inline_keyboard"], id: string, ...args: any[]): Promise<void>;
  createListener(id: string): L | null;

}

export class OptionInstance<L extends Listener = any> {

  constructor(
    public option: Option<L>,
    public listener: L,
    public id: string,
    public messageInstanceId: ObjectId,
    public toUserId: number | undefined,
    public life: number,
  ) {
    this.option.instances[this.id.toString()] = this;
    setTimeout(() => {
      this.close();
    }, this.life);
  }

  close() {
    if(!this.listener.remove()) return false;
    delete this.option.instances[this.id.toString()];
    return true;
  }

}

export default class Option<L extends Listener = any> implements option<L> {

  originMessage!: MessageEmitter<L, any, any[]>;
  type!: optionType;
  setup!: BotSetup;
  response: Response<any> | undefined;
  instances: {
    [key: string]: OptionInstance;
  } = {};
  id: ObjectId;
  callback: (...args: args<L>) => Promise<boolean> = () => new Promise<boolean>(res => res(true));
  
  constructor(
    public singleUser: boolean = true,
    public life: number = 0
  ) {
    this.id = new ObjectId;
  }

  init(setup: BotSetup, id: string, messageInstanceId: ObjectId, toUserId?: number, data: any = {}) {
    this.setup = setup;
    if(this.life === 0)
      this.life = this.setup.OPTION_LIFE;
    const listener = this.createListener(id);
    if(listener == null) return this;
    new OptionInstance(this, listener, id, messageInstanceId, toUserId, this.life);
    if(this.response == null) return this;
    listener.setPriority(this.response.priority);
    return this;
  }

  setCallback(callback: this["callback"]): this {
    this.callback = callback;
    return this;
  }

  setResponse(response: Response<any, any>): this {
    this.response = response;
    this.setCallback(async (...args: []) => {
      return await response.callback(...args);
    });
    return this;
  }

  setOriginMessage(msg: MessageEmitter<L, any, any[]>) {
    this.originMessage = msg;
    return this;
  }

  getMessageInstanceId(id: string): ObjectId | null {
    return this.instances[id.toString()]?.messageInstanceId ?? null;
  }

  createListener(id: string): L | null {
    return null;
  }

  async parse(inline_keyboard: TelegramBot.InlineKeyboardButton[][], id: string, ...args: any[]) {
    
  }

  userCheck(...args: args<L>) {
    return true;
  }

}