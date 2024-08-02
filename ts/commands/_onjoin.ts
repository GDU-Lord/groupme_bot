import Community from "../community.js";
import { Listener } from "../core/listener.js";
import { ButtonDeleteOption } from "../core/options/button.js";
import { chain, QueryResponse, responseTarget } from "../core/response.js";
import CustomTextEmitter from "../custom/customTextEmitter.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import { getState } from "../custom/utils.js";
import JoinRequest from "../joinRequest.js";
import Member from "../member.js";
import { hideButton, memberMention, setup } from "./shared.js";

export default function _onJoin() {

  const emitAccepted = new StateInsertEmitter(setup, "Користувача {data.user_mention} додано до групи!", responseTarget.PRIVATE)
    .addOption(hideButton);
  const emitRejected = new StateInsertEmitter(setup, "Заявку {data.user_mention} відхилено!", responseTarget.PRIVATE)
    .addOption(hideButton);

  const emitWelcome = new CustomTextEmitter(setup, "", responseTarget.LOCAL);

  JoinRequest.onAccept = (req: JoinRequest, com: Community): Promise<void> => {
    return new Promise((res, rej) => {
      setup.bot.approveChatJoinRequest(com.chatId, req.id).then(async () => {
        com.members.push(new Member(req.id, req.name, req.username));
        await com.updateMembers();
        await emitWelcome.emit(com.chatId, req.id, com.botThreadId, undefined, {
          text: `Ласкаво просимо! <a href="tg://user?id=${req.id}">@${req.username ?? req.name}</a>! Скористайся командою /groupme, щоб обрати групи, до яких хочеш долучитися!`
        });
        res();
      }).catch((err) => {});
    });
  };

  JoinRequest.onReject = (req: JoinRequest, com: Community): Promise<void> => {
    return new Promise((res, rej) => {
      setup.bot.declineChatJoinRequest(com.chatId, req.id).then(() => {
        res();
      }).catch(() => {});
    });
  };

  // [accept]
  const acceptJoinResponse = new QueryResponse(async () => true, setup, emitAccepted)
    .check(async (query) => {
      const state = getState(query);
      const req_id = state?.data.req_id;
      if(req_id == null)
        return chain.escape;
      JoinRequest.list[req_id].accept();
      return chain.on;
    });
  
  // [reject]
  const rejectJoinResponse = new QueryResponse(async () => true, setup, emitRejected)
    .check(async (query) => {
      const state = getState(query);
      const req_id = state?.data.req_id;
      if(req_id == null)
        return chain.escape;
      JoinRequest.list[req_id].reject();
      return chain.on;
    });

  const acceptButtonOption = new ButtonDeleteOption("Прийняти", "accept_join")
    .setResponse(acceptJoinResponse);
  const rejectButtonOption = new ButtonDeleteOption("Відхилити", "reject_join")
    .setResponse(rejectJoinResponse);

  const emitRequest = new StateInsertEmitter(setup, "Користувач {data.user_mention} хоче приєднатися до групи!", responseTarget.PRIVATE)
    .addOption(acceptButtonOption)
    .addOption(rejectButtonOption);

  // $chat_join_request
  const listener = new Listener(setup, async (msg) => {
    const user = msg.from;
    const chat = msg.chat;
    const community = Community.list[chat.id];
    if(community == null) return true;
    const req = new JoinRequest(user.id, user.username, user.first_name, community.chatId);
    await req.initPromise;
    const owner = community.getOwner();
    if(owner == null) return true;
    const ownerState = setup.getState(owner.id) ?? setup.initState(owner.id);
    if(ownerState == null) return true;
    ownerState.state.data.user_mention = memberMention.getText({
      username: user.username ?? user.first_name,
      id: user.id
    });
    ownerState.state.data.req_id = req._id;
    emitRequest.emit(owner.id, owner.id, undefined, undefined, { from: {id: owner.id} });
    return false;
  });
  listener.event = "chat_join_request";
  listener.init();
    

}