import { ObjectId } from "mongodb";
import { MessageListener } from "../listener.js";
import Option from "./option.js";

export default class MessageOption extends Option<MessageListener> {
  
  createListener(id: string): MessageListener | null {
    const originMessage = this.originMessage;
    return new MessageListener(this.setup, async (msg, meta) => {
      if(this.singleUser && !this.userCheck(msg, meta)) return true;
      const messageInstanceId = this.getMessageInstanceId(id);
      if(messageInstanceId == null) return true;
      const res = await this.callback(msg, meta);
      if(!res)
        originMessage.closeOptionInstanceBlock(messageInstanceId);
      return res;
    });
  }

}