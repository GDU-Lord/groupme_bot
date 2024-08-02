import MessageEmitter from "../core/message.js";
import MessageOption from "../core/options/message.js";
import { chain, responseTarget } from "../core/response.js";
import { breakChain, setData, setMode, verifyAuthority, verifyMode } from "../custom/hooks.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import {StateMessageResponse} from "../custom/stateResponse.js";
import { setup, mode, updateInfoList, editInfoMessage, hideButton } from "./shared.js";
import { cancelButton } from "./shared.js";
import { getCommunity, getState } from "../custom/utils.js";
import Group from "../group.js";

export default function addgroup () {

  const emitAddGroupDone = new StateInsertEmitter(setup, "Групу \"{data.title}\" додано до списку!", responseTarget.LOCAL)
    .addOption(hideButton);

  // {description: string}
  const respondAddGroupDescription = new StateMessageResponse("", mode.ADDGROUP, setup, emitAddGroupDone)
    .check(verifyAuthority(false))
    .check(setData("description", msg => msg.text))
    .next(async (msg, meta) => {
      const state = getState(msg)!;
      const {
        title,
        descriptiopn
      } = state.data;
      const community = getCommunity(msg)!;
      const group = new Group(title, descriptiopn, msg.chat.id);
      await community.addGroup(group);
      return chain.on;
    })
    .next(updateInfoList())
    .next(editInfoMessage())
    .next(setMode(mode.NONE))
    .next(breakChain());
  
  const addGroupDescriptionOption = new MessageOption()
    .setResponse(respondAddGroupDescription);

  const emitAddGroupGetDescription = new MessageEmitter(setup, "Введіть опис групи", responseTarget.LOCAL)
    .addOption(cancelButton)
    .addOption(addGroupDescriptionOption);

  // {title: string}
  const respondAddGroupTitle = new StateMessageResponse("", mode.ADDGROUP, setup, emitAddGroupGetDescription)
    .check(verifyAuthority(false))
    .next(setData("title", msg => msg.text))
    .next(breakChain());
  
  const addGroupNameOption = new MessageOption()
    .setResponse(respondAddGroupTitle);

  const emitAddGroupGetTitle = new MessageEmitter(setup, "Введіть назву групи", responseTarget.LOCAL)
    .addOption(cancelButton)
    .addOption(addGroupNameOption);

  // /addgroup
  const respondAddGroup = new StateMessageResponse(mode.ADDGROUP, mode.ANY, setup, emitAddGroupGetTitle, 1)
    .check(verifyAuthority(false))
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(setMode(mode.ADDGROUP))
    .next(setData("title", () => ""))
    .next(setData("description", () => ""))
    .next(breakChain())
    .init();
  
}