import BotSetup from "../botSetup.js";
import { ExtendedQuery, QueryListener } from "../listener.js";
import Option, { optionType } from "./option.js";
import TelegramBot from "node-telegram-bot-api";
import { Insert } from "../utils.js";

type dataType<PrototypeData, InstanceData> = {
  p?: PrototypeData,
  i?: InstanceData,
}

export interface instanceDataType<T = any> {
  getInstanceData(state: BotSetup["states"][string]): Promise<T>;
}

export default class ButtonOption<PrototypeData, InstanceData = any> extends Option<QueryListener<dataType<PrototypeData, InstanceData>>> {

  type: optionType = optionType.BUTTON;
  public data!: ExtendedQuery<dataType<PrototypeData, InstanceData>>["data"]["data"];

  constructor(public name: string, data?: PrototypeData, singleUser?: boolean, life?: number) {
    super(singleUser, life);
    this.data = {
      p: data
    };
  }

  createListener(id: string) {
    const originMessage = this.originMessage;
    return new QueryListener(this.setup, async (query: ExtendedQuery<dataType<PrototypeData, InstanceData>>) => {
      if(query.data.id.toString() !== id.toString()) return true;
      if(this.singleUser && !this.userCheck(query)) return true;
      const messageInstanceId = this.getMessageInstanceId(id);
      if(messageInstanceId == null) return true;
      const res = await this.callback(query);
      if(!res)
        originMessage.closeOptionInstanceBlock(messageInstanceId);
      return res;
    });
  };

  async parse(inline_keyboard: TelegramBot.InlineKeyboardButton[][], id: string, instanceData: InstanceData, state: BotSetup["states"][string]) {
    let data: string = "{}";
    try {
      data = JSON.stringify({
        data: this.data,
        id: id
      });
    } catch {}
    inline_keyboard[inline_keyboard.length-1].push({
      text: this.name,
      callback_data: data
    });
  }

  userCheck(query: ExtendedQuery<dataType<PrototypeData, InstanceData>>): boolean {
    const id = query.data.id;
    const userId = this.instances[id.toString()]?.toUserId;
    return userId === query.from.id;
  }

}

export class ButtonDeleteOption<PrototypeData, InstanceData = any> extends ButtonOption<PrototypeData, InstanceData> {

  setCallback(callback: this["callback"]): this {
    this.callback = async (...args) => {
      const [query] = args;
      const msg = query.message;
      if(msg != null) {
        this.setup.bot.deleteMessage(msg.chat.id, msg.message_id);
      }
      return callback(...args);
    };
    return this;
  }

}



export class ButtonMenuOption<PrototypeData extends [], InstanceData extends instanceDataType<any[]> = any> extends ButtonOption<PrototypeData, InstanceData> {

  type: optionType = optionType.MENU;

  constructor(public insert: Insert, data: PrototypeData, singleUser?: boolean, life?: number) {
    super("", data, singleUser, life);
  }
  
  async parse(inline_keyboard: TelegramBot.InlineKeyboardButton[][], id: string, instanceData: InstanceData, state: BotSetup["states"][string]) {
    let data: any[] = [];
    try {
      data = (await instanceData.getInstanceData(state)).map(d => ({
        data: {
          p: this.data.p,
          i: d
        },
        id: id
      }));
    } catch(err) {
      console.error(err);
    }
    for(const i in data) {
      let json: string = "{}";
      try {
        json = JSON.stringify(data[i].data.i.$);
      } catch(err) {
        console.error(err);
      }
      inline_keyboard.push([{
        text: this.insert.getText(data[i].data) ?? "ERROR",
        callback_data: json
      }]);
    }
  }

}

export class DeleteButtonMenuOption<PrototypeData extends [], InstanceData extends instanceDataType<any[]> = any> extends ButtonMenuOption<PrototypeData, InstanceData> {

  setCallback(callback: this["callback"]): this {
    this.callback = async (...args) => {
      const [query] = args;
      const msg = query.message;
      if(msg != null) {
        this.setup.bot.deleteMessage(msg.chat.id, msg.message_id);
      }
      return callback(...args);
    };
    return this;
  }

}