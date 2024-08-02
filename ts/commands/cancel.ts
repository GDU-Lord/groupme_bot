import { chain, responseTarget } from "../core/response.js";
import { setData, verifyMode } from "../custom/hooks.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import { StateMessageResponse } from "../custom/stateResponse.js";
import { getState, setStateMode } from "../custom/utils.js";
import { hideButton, mode, setup } from "./shared.js";

export default function cancel () {

  const emitCancel = new StateInsertEmitter(setup, "{data.text}", responseTarget.LOCAL)
    .addOption(hideButton);

  // /cancel
  const respondCancel = new StateMessageResponse(mode.CANCEL, mode.ANY, setup, emitCancel)
    .check(verifyMode(mode.ANY, chain.on, chain.break))
    .check(setData("text", msg => {
      console.log("CHECK");
      const state = getState(msg);
      if(state?.mode === mode.NONE)
        return "Нічого скасовувати";
      return "Команду скасовано!";
    }))
    .check(async msg => {
      setStateMode(msg, mode.NONE);
      return chain.on;
    })
    .init();
    

}