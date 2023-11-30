import { ObjectId } from "mongodb";
import { CallbackQuery, Message, Metadata } from "node-telegram-bot-api";

export class Listener {

  static list: {
    [key: string]: Listener
  } = {};

  id: ObjectId;

  constructor(
    public callback: (...args: any[]) => boolean | void | Promise<boolean | void>
  ) {
    this.id = new ObjectId;
    this.init();
  }

  init() {
    Listener.list[this.id.toString()] = this;
  }

  remove() {
    if(!(this.id.toString() in Listener.list)) return
    delete Listener.list[this.id.toString()];
  }

  restore() {
    this.init();
  }
}

export class MessageListener extends Listener {

  constructor(
    public callback: (msg: Message, meta: Metadata) => boolean | void | Promise<boolean | void>
  ) {
    super(callback);
  }

}

export class QueryListener extends Listener {

  constructor(
    public callback: (query: CallbackQuery, data?: any) => boolean | void | Promise<boolean | void>
  ) {
    super(callback);
  }
  
}