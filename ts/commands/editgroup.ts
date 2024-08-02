import MessageEmitter from "../core/message.js";
import MessageOption from "../core/options/message.js";
import { chain, responseTarget } from "../core/response.js";
import { breakChain, setData, setMode, verifyAuthority, verifyMode } from "../custom/hooks.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import { StateMessageResponse } from "../custom/stateResponse.js";
import { setup, mode, updateInfoList, editInfoMessage, hideButton } from "./shared.js";
import { cancelButton } from "./shared.js";
import { getCommunity, getState } from "../custom/utils.js";
import Group from "../group.js";
import Community from "../community.js";

export default function editgroup() {

  const emitAddGroupDone = new StateInsertEmitter(setup, "Групу \"{data.title}\" оновлено!", responseTarget.LOCAL)
    .addOption(hideButton);

  // {description: string}
  const respondAddGroupDescription = new StateMessageResponse("", mode.EDITGROUP, setup, emitAddGroupDone)
    .check(verifyAuthority(false))
    .check(setData("description", msg => msg.text))
    .next(async (msg, meta) => {
      const state = getState(msg)!;
      const community = state.data.community as Community;
      const title = state.data.title as string;
      const description = state.data.description as string;
      const group = state.data.group_to_edit as Group;
      group.name = title;
      group.description = description;
      await community.updateGroup(group);
      return chain.on;
    })
    .next(updateInfoList())
    .next(editInfoMessage())
    .next(setMode(mode.NONE))
    .next(breakChain());

  const addGroupDescriptionOption = new MessageOption()
    .setResponse(respondAddGroupDescription);

  const emitAddGroupGetDescription = new MessageEmitter(setup, "Введіть новий опис групи", responseTarget.LOCAL)
    .addOption(cancelButton)
    .addOption(addGroupDescriptionOption);

  // {title: string}
  const respondAddGroupTitle = new StateMessageResponse("", mode.EDITGROUP, setup, emitAddGroupGetDescription)
    .check(verifyAuthority(false))
    .next(setData("title", msg => msg.text))
    .next(breakChain());
  
  const addGroupNameOption = new MessageOption()
    .setResponse(respondAddGroupTitle);

  const emitEditGroupGetTitle = new MessageEmitter(setup, "Введіть нову назву групи", responseTarget.LOCAL)
    .addOption(cancelButton)
    .addOption(addGroupNameOption);
    
  // {group_to_edit: number}
  const respondGroupNumber = new StateMessageResponse("", mode.EDITGROUP, setup, emitEditGroupGetTitle)
    .check(setData("group_to_edit", msg => {
      const n = Number(msg.text?.trim()) - 1;
      const state = getState(msg);
      const group = state?.data?.community?.groups[n] as Group;
      return group;
    }))
    .check(async (msg) => {
      const state = getState(msg);
      const group = state?.data.group_to_edit;
      if (group == null)
        return chain.escape;
      else
        return chain.on;
    })
    .next(breakChain());

  const chooseGroupNumberOption = new MessageOption()
    .setResponse(respondGroupNumber);

  const emitGroupsToEdit = new StateInsertEmitter(setup, "Введіть номер групи, яку хочете <b>ВІДРЕДАГУВАТИ</b>:\n\n{data.groups_to_edit}", responseTarget.LOCAL)
    .addOption(cancelButton)
    .addOption(chooseGroupNumberOption);

  // /editgroup
  const respondEditGroup = new StateMessageResponse(mode.EDITGROUP, mode.ANY, setup, emitGroupsToEdit, 1)
    .check(verifyAuthority(false))
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(setMode(mode.EDITGROUP))
    .check(setData("community", msg => { 
      return getCommunity(msg);
    }))
    .check(setData("groups_to_edit", msg => {
      const community = getState(msg)?.data.community as Community;
      return community?.groups.map((g, i) => `<b>${i+1})</b> "${g.name}"`).join("\n");
    }))
    .next(setData("group_to_edit", () => null))
    .next(setData("title", () => ""))
    .next(setData("description", () => ""))
    .next(breakChain())
    .init();

}