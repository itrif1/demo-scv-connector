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
import { Constants, VendorConnector } from '@salesforce/scv-connector-base';
import { Sdk } from './vendor-sdk';
import Keycloak from 'keycloak-js';

/** 
 * Class representing a Service Cloud Voice Demo Connector
 */
export class Connector extends VendorConnector {
    /**
     * Create a Connector instance.
     * @param {object} sdk - Telephony SDK
     */
    constructor(state) {
        super();
        this.sdk = new Sdk(state);
    }
    /**
     * Called by SFDC to initialize the connector
     * @param {object} callCenterConfig - SFDC Contact Center Settings
     */
    async init(callCenterConfig) {
        console.log('!!! INIT CCCONFIG', callCenterConfig);

        const keycloak = new Keycloak({
            url: 'https://dev-19.ixcc-sandbox.avayacloud.com/',
            realm: 'QZGJSV',
            clientId: '9e95559d-ac6d-4fb3-93e6-47b1f2eb7d35'
        });
        
        try {
            const authenticated = await keycloak.init();
            console.log(`User is ${authenticated ? 'authenticated' : 'not authenticated'}`);
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
        }
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
     * @param {boolean} enqueueNextState true if the state should be enqueued, which will update the agent's status after a call ends
     */
    setAgentStatus(agentStatus, agentStatusInfo, enqueueNextState) {
        return this.sdk.setAgentStatus(agentStatus, agentStatusInfo, enqueueNextState)
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
    addParticipant(contact, call, isBlindTransfer) {
        return this.sdk.addParticipant(contact, call, isBlindTransfer);
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
        console.log('!!! SET AGENT CONFIG', config);
        return this.sdk.setAgentConfig(config);
    }

    /**
     * Called when connector is ready to get the vendor or agent capabilities
     */
    getCapabilities() {
        return this.sdk.getCapabilities();
    }
    
    /**
    * Used to set the vendor or agent capabilities
    */
    setCapabilities(capabilities) {
        return this.sdk.setCapabilities(capabilities);
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

    /**
     * Get the signed recording url
     * @param {String} recordingUrl
     * @param {String} vendorCallKey
     * @param {String} callId
     * @returns {Promise<SignedRecordingUrlResult>} 
     */
    getSignedRecordingUrl(recordingUrl, vendorCallKey, callId) {
        return this.sdk.getSignedRecordingUrl(recordingUrl, vendorCallKey, callId);
    }

    superviseCall(parentCall){
        console.log("superviseCall", parentCall);
        return this.sdk.superviseCall(parentCall);  
    }

    supervisorDisconnect(parentCall){
        console.log("supervisorDisconnect", parentCall); 
        return this.sdk.supervisorDisconnect(parentCall);
    }

    supervisorBargeIn(parentCall){
        console.log("supervisorBargeIn", parentCall); 
        return this.sdk.supervisorBargeIn(parentCall);
    }
}
