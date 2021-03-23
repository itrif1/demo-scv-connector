/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

jest.mock('scv-connector-base', () => ({
    ...(jest.requireActual('scv-connector-base')),
    publishEvent: jest.fn()
}));

import constants from './testConstants';
import { publishEvent, GenericResult, PhoneCall, Contact, ParticipantResult, CallInfo, CallResult,
    Constants, Phone, AgentStatusInfo, HangupResult } from 'scv-connector-base';
import { Connector } from '../main/connector';

global.console.log = jest.fn(); //do not print console.log 
describe('Vendor Sdk tests', () => {
    const connector = new Connector();
    const vendorSdk = connector.sdk;
    const dummyPhoneNumber = 'dummyPhonenumber';
    const dummyCallAttributes = { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER };

    beforeAll(async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ voiceCallId: "someId" })
            })
        );
    });

    beforeEach(() => {
        beforeEach(() => {
            vendorSdk.state.activeCalls = {};
            vendorSdk.state.agentAvailable = true;
            vendorSdk.state.agentConfig = {
                hasMute: true,
                hasMerge: true,
                hasRecord: true,
                hasSwap: true,
                selectedPhone : {type:"SOFT_PHONE"}
            };
        });
    });

    describe('init', () => {
        
        beforeEach(() => {
            global.fetch = jest.fn(() => 
                Promise.resolve({
                    json: () => Promise.resolve({ success: true })
                })
            );
        });
        
        it('Should fail when tenant info is not configured properly', async () => {
            global.fetch = jest.fn(() => 
                Promise.resolve({
                    json: () => Promise.resolve({ success: false })
                })
            );
            await expect(connector.init(constants.CALL_CENTER_CONFIG)).rejects.toBe("Failed to configure tentant information");
        });

        it('Should return a showLogin when showLoginPage is true', async () => {
            vendorSdk.state.showLoginPage = true;
            const result = await connector.init(constants.CALL_CENTER_CONFIG);
            expect(result.showLogin).toBeTruthy();
            expect(result.loginFrameHeight).toBe(350);
        });

        it('Should NOT return a showLogin when showLoginPage is false', async () => {
            vendorSdk.state.showLoginPage = false;
            const result = await connector.init(constants.CALL_CENTER_CONFIG);
            expect(result.showLogin).toBeFalsy();
        });
    });

    describe('getActiveCalls', () => {
        beforeEach(() => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({ voiceCallId: "someId", success : true })
                })
            );
        });
        
        it('Should return a valid active calls result on getActiveCalls', async () => {
            const callResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const result = await connector.getActiveCalls();
            expect(Object.keys(result.activeCalls).length).toEqual(1);
            Object.values(result.activeCalls).forEach(call => {
                expect(call.callId).toBeTruthy();
            });
            await vendorSdk.endCall(callResult.call);
        });

        it('Should return a empty active calls result on getActiveCalls', async () => {
            const result = await connector.getActiveCalls();
            expect(Object.keys(result.activeCalls).length).toEqual(0);
        });
    });

    describe('acceptCall', () => {
        it('Should reject on invalid call', async () => {
            const nonExistantCall = new PhoneCall({ callId: 'callId', callType: 'inbound', state: 'state', callAttributes: {}, phoneNumber: '100'});
            try {
                await connector.acceptCall(nonExistantCall);
            } catch (e) {
                expect(e.message).toEqual("Couldn't find an active call");
            }
        });


        it('Should return a valid call result on acceptCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.acceptCall(call);
            expect(result.call).toBe(call);
        });

        it('Should return a valid call result on acceptCall for callback', async () => {
            connector.sdk.requestCallback({ phoneNumber: '100' });

            const result = await connector.acceptCall(new PhoneCall({
                callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }
            }));
            expect(result.call.state).toBe(Constants.CALL_STATE.RINGING);
        });
    });

    describe('connectCall', () => {
        it('Should publish a valid call result on connectCall', async () => {
            const result = await connector.dial(new Contact({ phoneNumber: '100'}));
            vendorSdk.connectCall();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_CONNECTED, payload: new CallResult({ call: result.call })});
        });
    });

    describe('declineCall', () => {
        it('Should return a valid call result on declineCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.declineCall(call);
            expect(result.call).toBe(call);
        });

        it('Should return a valid call result on declineCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.declineCall();
            expect(result.call).toBe(call);
        });
    });

    describe('endCall', () => {
        it('Should return a valid call result on endCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.endCall(call);
            expect(result.calls.pop()).toBe(call);
        });

        it('Should return a valid call result on endCall for Agent for Initial Caller & Third party', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.AGENT });
            const { call } = startCallResult;

            await expect(connector.endCall(call)).resolves.not.toThrow();
        });

        it('Should return a valid call result on endCall for Agent for just Initial caller', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.AGENT });
            const { call } = startCallResult;
            try {
                connector.endCall(call);
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for participant " + constants.PARTICIPANT_TYPE.THIRD_PARTY);
            }
        });

        it('Should throw an error on endCall for Agent with just Third party but no initial caller', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.AGENT });
            const { call } = startCallResult;
            try {
                connector.endCall(call);
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for participant " + constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            }
        });

        it('Should publish wrap-up started', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            await connector.endCall(call);
            jest.runAllTimers();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.AFTER_CALL_WORK_STARTED, payload: { callId: call.callId }});
        });
    });

    
    describe('dial', () => {
        it('Should return a valid call result on dial', async () => {
            const contact = new Contact({ phoneNumber: '100'});

            const result = await connector.dial(contact);
            expect(result.call.callType).toBe(Constants.CALL_TYPE.OUTBOUND);
            expect(result.call.contact).toBe(contact);
            expect(result.call.callInfo.callStateTimestamp instanceof Date).toBeTruthy();
            expect(result.call.callAttributes.participantType).toBe(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: result });
        });
        it('Should return a valid call result on dial on softphone', async () => {
            const contact = new Contact({ phoneNumber: '100'});

            const result = await vendorSdk.dial(contact, { isSoftphoneCall: true });
            expect(result.call.callType).toBe(Constants.CALL_TYPE.OUTBOUND);
            expect(result.call.contact).toBe(contact);
            expect(result.call.callInfo.callStateTimestamp instanceof Date).toBeTruthy();
            expect(result.call.callAttributes.participantType).toBe(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(publishEvent).not.toBeCalled();
        });
        it('Should return a valid call result on dial from hardphone', async () => {
            const contact = new Contact({ phoneNumber: '100'});

            const result = await vendorSdk.dial(contact, { isSoftphoneCall: false });
            expect(result.call.callType).toBe(Constants.CALL_TYPE.OUTBOUND);
            expect(result.call.contact).toBe(contact);
            expect(result.call.callInfo.callStateTimestamp instanceof Date).toBeTruthy();
            expect(result.call.callAttributes.participantType).toBe(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(result.call.callInfo.isSoftphoneCall).toBe(false);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: result });
        });
        it('Should throw error on dial if there is already an active call', async () => {
            const contact1 = new Contact({ phoneNumber: '100'});
            const contact2 = new Contact({ phoneNumber: '200'});
            await vendorSdk.dial(contact1, { isSoftphoneCall: false });
            vendorSdk.dial(contact2, { isSoftphoneCall: false }).catch((error) => {
                expect(error.message).toEqual("Agent is not available for an outbound call");
            })
        });
    });

    describe('logout', () => {
        it('Should return a valid generic result on logout', async () => {
            const result = await connector.logout();
            expect(result.success).toBeTruthy();
        });
    });

    describe('getAgentConfig', () => {
        it('Should return a valid agent config result on getAgentConfig', async () => {
            const result = await connector.getAgentConfig();
            expect(result.hasMute).toEqual(vendorSdk.state.agentConfig.hasMute);
            expect(result.hasMerge).toEqual(vendorSdk.state.agentConfig.hasMerge);
            expect(result.hasRecord).toEqual(vendorSdk.state.agentConfig.hasRecord);
            expect(result.hasSwap).toEqual(vendorSdk.state.agentConfig.hasSwap);
            expect(result.selectedPhone).toEqual(vendorSdk.state.agentConfig.selectedPhone);
        });
    });

    describe('updateAgentConfig', () => {

        it('setAgentConfig from sfdc', async () => {
            const selectedPhone = new Phone ({type:"DESK_PHONE", number: "111 333 0456"});
            connector.setAgentConfig({ selectedPhone });
            expect(vendorSdk.state.agentConfig.selectedPhone).toEqual(selectedPhone);
        });

        it('setAgentConfig from sfdc when phone type is not changed and just number is updated', async () => {
            const selectedPhone = new Phone ({type:"DESK_PHONE", number: "111 000 1111"});
            connector.setAgentConfig({ selectedPhone });
            expect(vendorSdk.state.agentConfig.selectedPhone).toEqual(selectedPhone);
        });

        it('updateAgentConfig from simulator', async () => {
            vendorSdk.updateAgentConfig({
                hasMute: false,
                hasMerge: false,
                hasRecord: false,
                hasSwap: false,
                selectedPhone : {type:"SOFT_PHONE"}
            });
            expect(vendorSdk.state.agentConfig.hasMute).toEqual(false);
            expect(vendorSdk.state.agentConfig.hasMerge).toEqual(false);
            expect(vendorSdk.state.agentConfig.hasRecord).toEqual(false);
            expect(vendorSdk.state.agentConfig.hasSwap).toEqual(false);
            expect(vendorSdk.state.agentConfig.selectedPhone.type).toEqual("SOFT_PHONE");
            expect(vendorSdk.state.agentConfig.selectedPhone.number).toBeUndefined();
        });
    });

    describe('mute', () => {
        it('Should return a valid mute toggle result on mute', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const result = await connector.mute();
            expect(result.isMuted).toBeTruthy();
        });
    });

    describe('unmute', () => {
        it('Should return a valid mute toggle result on unmute', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const result = await connector.unmute();
            expect(result.isMuted).toBeFalsy();
        });
    });

    describe('hold', () => {
        it('Should return a valid hold toggle result on hold', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.hold(call);
            expect(result.isThirdPartyOnHold).toBeFalsy();
            expect(result.isCustomerOnHold).toBeTruthy();
            expect(result.calls).toEqual(vendorSdk.state.activeCalls);
        });
        it('Should return undefined when isOnHold is called for an invalid call', async () => {
            const result = vendorSdk.isOnHold({});
            expect(result).toBeUndefined();
        });
    });

    describe('resume', () => {
        it('Should return a valid hold toggle result on resume', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.resume(call);
            expect(result.isThirdPartyOnHold).toBeFalsy();
            expect(result.isCustomerOnHold).toBeFalsy();
            expect(result.calls).toEqual(vendorSdk.state.activeCalls);
        });
    });

    describe('pauseRecording', () => {
        it('Should return a valid recording toggle result on pauseRecording', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.pauseRecording(call);
            expect(result.isRecordingPaused).toBeTruthy();
        });
    });

    describe('resumeRecording', () => {
        it('Should return a valid recording toggle result on resumeRecording', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.resumeRecording(call);
            expect(result.isRecordingPaused).toBeFalsy();
        });
    });

    describe('swap', () => {
        it('Should return a valid hold toggle result on swap', async () => {
            const startCallResult1 = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const call1 = startCallResult1.call;
            const startCallResult2 = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const call2 = startCallResult2.call;

            const result = await connector.swap(call1, call2);
            expect(result.isThirdPartyOnHold).toBe(false);
            expect(result.isCustomerOnHold).toBe(false);
            expect(result.calls).toEqual(vendorSdk.state.activeCalls);
        });
        it('Should not error on swap when call2 is invalid', async () => {
            const startCallResult1 = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const call1 = startCallResult1.call;
            const invalidParticipant = "invalid";
            const startCallResult2 = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: invalidParticipant });
            const call2 = startCallResult2.call;
            try {
                vendorSdk.swapCalls(call1, call2);
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for participant " + invalidParticipant);
            }
        });
    });

    describe('conference', () => {
        it('Should return a valid conference result on conference', async () => {
            const startCallResult1 = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const call1 = startCallResult1.call;
            const startCallResult2 = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const call2 = startCallResult2.call;
            const calls = [call1, call2];

            const result = await connector.conference(calls);
            expect(result.isThirdPartyOnHold).toBeFalsy();
            expect(result.isCustomerOnHold).toBeFalsy();
        });
    });

    describe('addParticipant', () => {
        it('Should return a participant result on addParticipant', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            const result = await connector.addParticipant(contact, call);

            expect(result.phoneNumber).toEqual(dummyPhoneNumber);
            expect(result.initialCallHasEnded).toBeFalsy();
            expect(result.callInfo).toEqual(new CallInfo({ isOnHold: false }));
            expect(result.callId).not.toBeNull();
        });
        it('Should throw error on adParticipant if there is already an active call', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            try {
                await connector.addParticipant(contact, call);
            } catch(e) {
                expect(e.message).toEqual("Agent is not available for a transfer call");
            }
        });
    });

    describe('connectParticipant', () => {
        it('Should publish a participant result on connectParticipant', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            connector.sdk.connectParticipant();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.PARTICIPANT_CONNECTED, payload: new ParticipantResult({
                phoneNumber: dummyPhoneNumber,
                callInfo: new CallInfo({ isOnHold: false }),
                initialCallHasEnded: false,
                callId: expect.anything()
            })});
        });
    });

    describe('removeParticipant', () => {
        it('Should publish a participant removed result on removeParticipant', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            const callResult = await connector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.THIRD_PARTY);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.PARTICIPANT_REMOVED, payload: callResult });
        });

        it('Should publish wrap-up started', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            connector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            jest.runAllTimers();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.AFTER_CALL_WORK_STARTED, payload: { callId: call.callId }});
        });

        it('should not publish wrap-up started when call is on-going', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            await connector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.THIRD_PARTY);
            jest.runAllTimers();
            expect(publishEvent).toBeCalledTimes(2);
        });
    });

    describe('hangup', () => {
        it('Should publish a call result on hangUp', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            connector.sdk.hangup();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.HANGUP, payload: new HangupResult({ calls: [call] })});
        });

        it('Should publish a call result on hangUp', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber);
            const initialCall = startCallResult.call;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            const thirdPartyCallResult = await connector.sdk.addParticipant(contact, initialCall);
            const thirdPartyCall = connector.sdk.getCall(thirdPartyCallResult);
            const hangupCalls = [initialCall, thirdPartyCall];
            connector.sdk.hangup();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.HANGUP, payload: new HangupResult({ calls: hangupCalls })});
        });

        it('Should publish wrap-up started', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            connector.sdk.hangup();
            jest.runAllTimers();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.AFTER_CALL_WORK_STARTED, payload: { callId: call.callId }});
        });
    });

    describe('beginWrapup', () => {
        let testConnector;
        let sdk;

        beforeEach(() => {
            testConnector = new Connector(); 
            sdk = testConnector.sdk;
            sdk.state.activeCalls = {};
            sdk.state.agentAvailable = true;
            sdk.beginWrapup = jest.fn();
        });

        it('hangup should call beginWrap-up', async () => {
            const startCallResult = await sdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            testConnector.sdk.hangup();
            expect(sdk.beginWrapup).toBeCalledWith(call);
        });

        it('endcall should call beginWrap-up', async () => {
            const startCallResult = await sdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            testConnector.endCall(call);
            expect(sdk.beginWrapup).toBeCalledWith(call);
        });

        it('removeParticipant should call beginWrap-up', async () => {
            const startCallResult = await sdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            await testConnector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(sdk.beginWrapup).toBeCalledWith(call);
        });
    });

    describe('endWrapup', () => {
        let testConnector = new Connector(); 
        let sdk = testConnector.sdk;

        afterEach(() => {
            testConnector = new Connector(); 
            sdk = testConnector.sdk;
        });

        it('Should call sdk wrapup', () => {
            sdk.endWrapup = jest.fn();
            testConnector.wrapUpCall();
            expect(sdk.endWrapup).toBeCalled();
        });

        it('Should call log with "endWrapup" during endWrapup', () => {
            sdk.log = jest.fn();
            testConnector.wrapUpCall();
            expect(sdk.log).toBeCalledWith("endWrapup");
        });
    });

    describe('setAgentStatus', () => {
        it('Should return a valid generic result on setAgentStatus', async () => {
            const result = await connector.setAgentStatus(Constants.AGENT_STATUS.ONLINE);
            expect(result.success).toBeTruthy();
        });
    });

    describe('setAgentStatus', () => {
        it('Should return a valid generic result on setAgentStatus', async () => {
            const result = await connector.setAgentStatus(Constants.AGENT_STATUS.ONLINE, new AgentStatusInfo({statusId: 'dummyStatusId', statusApiName: 'dummyStatusApiName', statusName: 'dummyStatusName'}));
            expect(result.success).toBeTruthy();
        });
    });

    describe('handleMessage', () => {
        it('Should handle message', () => {
            const mockPostMessage = jest.fn();
            window.BroadcastChannel = jest.fn(() => {
                return { postMessage: mockPostMessage }
            });

            const message = { message: 'message' };
            connector.handleMessage(message);
            expect(mockPostMessage).toBeCalledWith({ type: Constants.EVENT_TYPE.MESSAGE, payload: message });
        });
    });

    describe('publishMessage', () => {
        it('Should be able to publishMessage', () => {
            const message = { message: 'message' };
            vendorSdk.publishMessage(message)
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.MESSAGE, payload: message });
        });
    });

    describe('sendDigits', () => {
        it('Should NOT throw on sendDigits', async () => {
            expect(connector.sendDigits('dummydigits')).resolves.not.toThrow();
        });
    });

    describe('subsystemLoginResult', () => {
        it('Should publish succesful LOGIN_RESULT on subsystemLoginResult', () => {
            vendorSdk.showLoginPage(true);
            vendorSdk.subsystemLoginResult(true);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.LOGIN_RESULT, payload: new GenericResult({
                success: true
            })});
        });

        it('Should publish failed LOGIN_RESULT on subsystemLoginResult', () => {
            vendorSdk.showLoginPage(true);
            vendorSdk.subsystemLoginResult(false);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.LOGIN_RESULT, payload: new GenericResult({
                success: false
            })});
        });
    });

    describe('getPhoneContacts', () => {
        it('Should return a valid result without filter', async () => {
            const result = await connector.getPhoneContacts();
            const { contacts } = result;
            expect(contacts).toBe(vendorSdk.state.phoneContacts);
        });

        it('Should return a valid result with contains filter', async () => {
            const filter = '123';
            const contact = new Contact({phoneNumber: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            const result = await connector.getPhoneContacts({ contains: filter });
            const { contacts } = result;
            expect(contacts).toEqual([contact]);
        });

        it('Should return a valid result with type filter', async () => {
            const filter = Constants.CONTACT_TYPE.QUEUE;
            const contact = new Contact({type: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            const result = await connector.getPhoneContacts({ type: filter });
            const { contacts } = result;
            expect(contacts).toEqual([contact]);
        });
    });

    describe('subsystemLogout', () => {
        it('Should publish a logout result on subsystemLogout', async () => {
            vendorSdk.subsystemLogout();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.LOGOUT_RESULT, payload: new GenericResult({ success: true })});
        });
    });

    describe('throwError', () => {
        afterAll(() => {
            vendorSdk.throwError(false);
        });

        it('Should throw error', async () => {
            vendorSdk.throwError(true);
            expect(vendorSdk.state.throwError).toBeTruthy();
        });

        it('Should throw error', async () => {
            vendorSdk.throwError(true);
            expect(connector.sdk.executeAsync('someMethod')).rejects.toStrictEqual('demo error');
        });
    });

    describe('deskphone errors when action not supported', () => {
        it('Mute should throw error', async () => {
            vendorSdk.state.agentConfig.hasMute = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.mute()).rejects.toStrictEqual(new Error("Mute is not supported"));
        });
        it('Unmute should throw error', async () => {
            vendorSdk.state.agentConfig.hasMute = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.unmute()).rejects.toStrictEqual(new Error("Mute is not supported"));
        });
        it('conference should throw error', async () => {
            vendorSdk.state.agentConfig.hasMerge = false;
            await expect(connector.sdk.conference([])).rejects.toStrictEqual(new Error("Conference is not supported"));
        });
        it('swapCalls should throw error', async () => {
            vendorSdk.state.agentConfig.hasSwap = false;
            await expect(connector.sdk.executeAsync("swapCalls")).rejects.toStrictEqual(new Error("Swap Calls is not supported"));
        });
        it('pauseRecording should throw error', async () => {
            vendorSdk.state.agentConfig.hasRecord = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.pauseRecording()).rejects.toStrictEqual(new Error("Recording is not supported"));
        });
        it('resumeRecording should throw error', async () => {
            vendorSdk.state.agentConfig.hasRecord = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.resumeRecording()).rejects.toStrictEqual(new Error("Recording is not supported"));
        });
    });

    describe('getCall', () => {
        it('Should error when no active calls are present', async () => {
            try {
                vendorSdk.getCall();
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call");
            }
        });

        it('Should error when callId is not in activeCalls', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            try {
                vendorSdk.getCall({ callId: 123 });
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for callId 123");
            }
        });

        it('Should error when call is unknown', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            try {
                vendorSdk.getCall({ callType: 'unknown' });
            } catch(e) {
                expect(e.message).toEqual("Call is not valid. It must have callAttributes and/or callId.");
            }
        });

        it('Should return call when callId is known', async () => {
            const result = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(vendorSdk.getCall({ callId: result.call.callId })).toEqual(result.call);
        });

        it('Should return call when type is HANGUP', async () => {
            const result = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(vendorSdk.getCall({ callId: result.call.callId })).toEqual(result.call);
        });
    });

    describe('startInboundCall', () => {
        afterAll(() => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({ voiceCallId: "someId" })
                })
            );
        });

        it('Should publish CALL_STARTED on succesfull call creation', async () => {
            const callResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: callResult });
        });

        it('Should not publish CALL_STARTED if Agent is not available', async () => {
            expect.hasAssertions();
            vendorSdk.state.agentAvailable = false;
            const errorMessage = `Agent is not available for a inbound call from phoneNumber - ${dummyPhoneNumber}`;
            vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes).catch((error) => {
                expect(error.message).toEqual(errorMessage);
            });
        });

        it('Should reject on failed call creation', async () => {
            const error = 'Failed call creation';
            global.fetch = jest.fn(() => 
                Promise.reject(error)
            );
            await expect(vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes)).rejects.toBe(error);
        });
        it('Should still publish CALL_STARTED when createVoiceCall API is not available', async () => {
            global.fetch = jest.fn(() => 
                Promise.resolve({
                    json: () => Promise.resolve({ success : false })
                })
            );
            const callResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: callResult });
        });
    });

    describe('requestCallback', () => {
        it('Should publish a queued call back event on requestCallback', async () => {
            connector.sdk.requestCallback({ phoneNumber: '100' });
            const argument = publishEvent.mock.calls[0][0];
            expect(argument.eventType).toEqual(Constants.EVENT_TYPE.QUEUED_CALL_STARTED);
            expect(argument.payload.call.callType.toLowerCase()).toEqual(Constants.CALL_TYPE.CALLBACK.toLowerCase());
            expect(argument.payload.call.phoneNumber).toEqual('100');
        });
    });
});
