/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/** 
 * Salesforce Service Cloud Voice Demo Connector
 * @author dlouvton
 */

/** @module connector **/
import { Constants } from 'scv-connector-base';
import { Sdk } from './vendor-sdk';
/** 
 * Class representing a Service Cloud Voice Demo Connector
 */
export class Connector {
    /**
     * Create a Connector instance.
     * @param {object} sdk - Telephony SDK
     */
    constructor(state) {
        this.sdk = new Sdk(state);
    }
    /**
     * Called by SFDC to initialize the connector
     * @param {object} callCenterConfig - SFDC Contact Center Settings
     */
    init(callCenterConfig) {
        return this.sdk.init(callCenterConfig);
    }

    /**
     * Called when the connector is loaded, to request the active calls
     */
    getActiveCalls() {
        return this.sdk.getActiveCalls();
    }
    /**
     * Called when call is accepted on the omni widget
     * @param {PhoneCall} call
     */
    acceptCall(call) {
        return this.sdk.acceptCall(call);
    }
    /**
     * Called when call is declined
     * @param {PhoneCall} call
     */
    declineCall(call) {
        // TODO: Update core to pass call on declineCall
        return this.sdk.declineCall(call ? call : { callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }});
    }
    /**
     * Called when agent hangs up or when a participant (customer or third party) is
     * removed by the agent.
     * @param {PhoneCall} call
     * @param {string} agentStatus
     */
    endCall(call, agentStatus) {
        return this.sdk.endCall(call, agentStatus);
    }
    /**
     * Called when call is muted from the sfdc call controls
     */
    mute() {
        return this.sdk.mute();
    }
    /**
     * Called when call is unmuted from the sfdc call controls
     */
    unmute() {
        return this.sdk.unmute()
    }
    /**
     * Called when customer/third party call is put on hold by the agent
     * @param {PhoneCall} call call
     */
    hold(call) {
        return this.sdk.hold(call)
    }
    /**
     * Called when call is resumed (off hold for either customer/third party) from
     * the sfdc call controls
     * @param {PhoneCall} call call
     */
    resume(call) {
        return this.sdk.resume(call);
    }
    /**
     * Called when recording is paused from the sfdc call controls
     * @param {PhoneCall} call
     */
    pauseRecording(call) {
        return this.sdk.pauseRecording(call);
    }
    /**
     * Called when recording is resumed from the sfdc call controls
     * @param {PhoneCall} call
     */
    resumeRecording(call) {
        return this.sdk.resumeRecording(call);
    }
    /**
     * Called when participants on a call are swapped
     * @param {PhoneCall} call1 first call to be swapped
     * @param {PhoneCall} call2 second call to be swapped
     */
    swap(call1, call2) {
        return this.sdk.swapCalls(call1, call2);
    }
    /**
     * Called when participants are joined for a conference
     * @param {PhoneCall[]} calls
     */
    conference(calls) {
        return this.sdk.conference(calls);
    }
    /**
     * Called when agent sets their status/presence (i.e. when changing from
     * Available to Offline) 
     * @param {string} agentStatus agent status, Constants.AGENT_STATUS.ONLINE or Constants.AGENT_STATUS.OFFLINE
     * @param {AgentStatusInfo} agentStatusInfo object contains statusId, statusApiName and statusName
     */
    setAgentStatus(agentStatus, agentStatusInfo) {
        return this.sdk.setAgentStatus(agentStatus, agentStatusInfo)
    }
    /**
     * Called when an outbound call is made 
     * @param {Contact} contact
     */
    dial(contact) {
        return this.sdk.dial(contact);
    }
    /**
     * Called when an agent sends digits on the existing call @digits: a string of
     * digits to send to the existing connected call.
     * @param {string} digits digits
     */
    sendDigits(digits) {
        return this.sdk.sendDigits(digits);
    }
    /**
     * Called when speed dial is clicked in order to request the vendor to get the agent phone contacts
     * @param {Object} filter
     */
    getPhoneContacts(filter) {
        return this.sdk.getPhoneContacts(filter);
    }
    /**
     * add participant to the call through either an address or a free form Phone Number.
     * @param {Contact} contact
     * @param {PhoneCall} call
     */
    addParticipant(contact, call) {
        return this.sdk.addParticipant(contact, call);
    }
    /**
     * logout from the telephony system.
     */
    logout() {
        return this.sdk.omniLogout();
    }
     /**
     * Dispatch an event to Remote Control.
     * @param {string} eventType Event Type
     * @param {object} payload Payload
     */
    dispatchEventToRemote(eventType, payload) {
        const requestBroadcastChannel = new BroadcastChannel('rc-request');
        requestBroadcastChannel.postMessage({type: eventType, payload});
    }
    /**
     * Called when connector is ready to get the agent configuration
     */
    getAgentConfig() {
        return this.sdk.getAgentConfig();
    }

    /**
    * Used to set the agent config, including the selected phone type and number
    */
    setAgentConfig(config) {
        return this.sdk.setAgentConfig(config);
    }

    /**
    * Used to finish wrap-up
    */
    wrapUpCall() {
        this.sdk.endWrapup();
    }

    /**
    * Delegate Message received from sfdc component to sdk
    * @param {object} message - Message
    */
    handleMessage(message) {
        this.sdk.handleMessage(message);
        // dispatchEventToRemote is only for demo purposes
        this.dispatchEventToRemote(Constants.EVENT_TYPE.MESSAGE, message);
    }
}
