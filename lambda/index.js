// Commander Simple
//

const Alexa = require('ask-sdk-core');

const http = require('http');
const https = require('https');
const URL = require('url').URL;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
        },
        handle(handlerInput) {
            console.warn('LaunchRequestHandler');

            const speechText = 'Welcome, you can say Hello or Help. Which would you like to try?';
            
            // Examples of SSML for testing & demos
/*            
            let text = 'Einstein is here to help!';
            console.warn('#####################################');
            let speechText = '';
            speechText += '<speak>';
            speechText += '<voice name="Brian">';
            speechText += '<prosody rate="medium"><s>Medium rate</s>' + text + '</prosody>';
            speechText += '<prosody rate="fast"><s>Fast rate</s>' + text + '</prosody>';
            speechText += '<prosody rate="x-fast"><s>Extra fast rate</s>' + text + '</prosody>';
            speechText += '<prosody rate="fast" pitch="x-low"><s>Extra low pitch, fast rate</s>' + text + '</prosody>';
            speechText += '<prosody rate="fast" pitch="low"><s>Low pitch, fast rate</s>' + text + '</prosody>';
            speechText += '<prosody rate="fast" pitch="medium"><s>Medium pitch, fast rate</s>' + text + '</prosody>';
            speechText += '<prosody rate="fast" pitch="high"><s>High pitch, fast rate</s>' + text + '</prosody>';
            speechText += '<prosody rate="fast" pitch="x-high"><s>Extra high pitch, fast rate</s>' + text + '</prosody>';
            speechText += '</voice>';
            speechText += '</speak>';
            console.warn('#####################################');

            try {
                let response = handlerInput.responseBuilder.speak(speechText).getResponse();
                console.warn('response: ', response);
                console.warn('response JSON: ', JSON.stringify(response, null, 2));
            } catch (e) {
                console.error('exception: ', e);
            }            
*/            
            
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(speechText)
                .getResponse();
        }
};

function getSFDCPasswordToken() {

    return new Promise(((resolve, reject) => {

        let appId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
        let appSecret = 'XXXXXXXXXXXXXXXXXXXXX';
        let domain = 'yourdomain-dev-ed';
        let username = 'youp@acme.com';
        let password = 'password1234';
        let securityToken = 'XXXXXXXXXXXXXXXXXXXXX';

        let config = {
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'password',
            username: username,
            password: password + securityToken
        };

        console.warn('config: ', config);

        let postData = JSON.stringify({}); //config);

        let path = '/services/oauth2/token?grant_type=password';
        path += '&client_id=' + appId;
        path += '&client_secret=' + appSecret;
        path += '&username=' + username;
        path += '&password=' + password + securityToken;

        console.warn('path: ', path);

        let options = {
            hostname: domain + '.my.salesforce.com',
            path: path,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        console.warn('options: ', options);

        let body = '';

        let req = https.request(options, (res) => {
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers);

            res.on('data', (d) => {
                console.warn('data: ', d);
                body += d;
            });

            res.on('end', (d) => {
                console.warn('end: ', body);
                let oauthResult = JSON.parse(body);
                resolve(oauthResult);
            });
        });

        req.on('error', (e) => {
            console.error(e);
            reject(e);
        });

        console.warn('writing postData: ', postData);
        //req.write(postData);

        req.end();
    }));

}

async function sfdcRequest(uri, method, config, oauthResult) {

    console.warn('sfdcRequest - uri: ', uri);
    console.warn('sfdcRequest - method: ', method);
    console.warn('sfdcRequest - config: ', config);
    console.warn('sfdcRequest - oauthResult: ', oauthResult);

    return new Promise(((resolve, reject) => {

        let data = JSON.stringify(config);

        let baseUrl = oauthResult.instance_url;

        let url = new URL(baseUrl);
        let hostname = url.hostname;
        let auth = 'Bearer ' + oauthResult.access_token;
        let path = encodeURI(uri);

        console.warn('url: ', url);
        console.warn('hostname: ', hostname);
        console.warn('auth: ', auth);
        console.warn('path: ', path);

        let options = {
            hostname: hostname,
            path: path,
            method: method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': auth,
                'X-Chatter-Entity-Encoding': false
            }
        };

        console.warn('options: ', options);

        let body = '';

        let req = https.request(options, (res) => {
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers);

            res.on('data', (d) => {
                console.warn('data: ', d);
                body += d;
            });

            res.on('end', (d) => {
                console.warn('end: ', body);
                let result = typeof body === 'object' ? body : JSON.parse(body);
                resolve(result);
            });
        });

        req.on('error', (e) => {
            console.error(e);
            reject(e);
        });

        console.warn('writing data: ', data);
        req.write(data);

        req.end();
    }));

}

async function _interpretAndInvoke(command, sessionAttributes, callback) {
    
        try {
            const oauthResult = JSON.parse(sessionAttributes.oauthResult);
            const channel = JSON.parse(sessionAttributes.channel || null);
            const state = JSON.parse(sessionAttributes.state || null);
            
            let uri = '/services/data/v46.0/einstein-conduit/actions/?q=' + command;
            
            if (state) {
             	uri += '&state=' + state;   
            }

            let method = 'GET';
            
            let config = {
                state: state
            };

            console.warn('query config: ', config);
            console.warn('query config JSON: ', JSON.stringify(config, null, 2));

            let queryResult = await sfdcRequest(uri, method, config, oauthResult);
            console.warn('queryResult: ', queryResult);
            console.warn('queryResult JSON: ', JSON.stringify(queryResult, null, 2));
            
            let actions = queryResult.actions;
            let action = actions[0];

            uri = action.request.uri;
            method = action.request.method;
            config = {
                payload: action.request.payload,
                destination: {
                    channel: channel ? { id: channel.id } : null,
                    includeResponse: true
                },
                token: action.request.token,
                state: state
            };

            console.warn('action config: ', config);
            console.warn('action config JSON: ', JSON.stringify(config, null, 2));

            let actionsResult = await sfdcRequest(uri, method, config, oauthResult);
            console.warn('actionsResult: ', actionsResult);
            console.warn('actionsResult JSON: ', JSON.stringify(actionsResult, null, 2));
            
            
            if (typeof callback === 'function') {
                callback(null, actionsResult);
            }

        } catch (e) {        
            if (typeof callback === 'function') {
                callback(e, null);
            }
        }

}

async function interpretAndInvoke(command, sessionAttributes) {
    return new Promise(((resolve, reject) => {
        try {
            _interpretAndInvoke(command, sessionAttributes, function(err, result) {
                console.warn('_internal_interpretAndInvoke returned: ', err, result);
                if (err) {
                    reject(err);
                } else {
                    resolve(result); 
                }
            });
            
        } catch (e) {
            reject(e);
        }
    })); 
}

const SubscribeIntentHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'SubscribeIntent';
        },
        async handle(handlerInput) {
            console.warn('SubscribeIntentHandler');

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            const oauthResult = JSON.parse(sessionAttributes.oauthResult);

            console.warn('SubscribeIntentHandler - oauthResult: ', oauthResult);

            const {
                intent
            } = handlerInput.requestEnvelope.request;

            console.warn('intent: ', intent);
            console.warn('intent.slots: ', intent.slots);

            const searchExpr = intent.slots.searchExpr;
            console.warn('searchExpr: ', searchExpr);
            console.warn('searchExpr.value: ', searchExpr.value);

            let command = 'subscribe channel ' + searchExpr.value;

            let result = await interpretAndInvoke(command, sessionAttributes);

            console.warn('sfdcRequest result: ', result);
            console.warn('sfdcRequest result JSON: ', JSON.stringify(result, null, 2));

            // Store the channel in the session, in this case only one is handled
            try {
                const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
                let channel = result.response.channels[0];
                sessionAttributes.channel = JSON.stringify(channel);
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);                
                
            } catch (e) {
                console.error('Exception: ', e);
            }

            // Store the state in the session
            try {
                const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

                let state = result.response.state;
                sessionAttributes.state = JSON.stringify(state);
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);                
                
            } catch (e) {
                console.error('Exception: ', e);
            }
                
            const speechText = 'Okay, subscribed to channel ' + searchExpr.value;

            return handlerInput.responseBuilder
                .speak(speechText)
                .getResponse();
        }
    
}

const ShowDashboardIntentHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'ShowDashboardIntent';
        },
        async handle(handlerInput) {
            console.warn('ShowDashboardIntentHandler');

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            const {
                intent
            } = handlerInput.requestEnvelope.request;

            console.warn('intent: ', intent);
            console.warn('intent.slots: ', intent.slots);

            const dashboardName = intent.slots.dashboardName;
            console.warn('dashboardName: ', dashboardName);
            console.warn('dashboardName.value: ', dashboardName.value);

            let command = 'show dashboard ' + dashboardName.value;

            let result = await interpretAndInvoke(command, sessionAttributes);
            
            console.warn('sfdcRequest result: ', result);
            console.warn('sfdcRequest result JSON: ', JSON.stringify(result, null, 2));

            let speechText = '';
            
            try {
                let items = result.response.items;
                let item = items[0];
                if (items.length > 0) {
                    sessionAttributes.state = JSON.stringify(item.state);
                } else {
                    sessionAttributes.state = JSON.stringify(result.response.state);
                }
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                speechText = 'Now showing the ' + (item.label || item.name || 'undefined') + ' dashboard';
            } catch (e) {
                console.error('Exception: ', e);
                speechText = 'Unable to process the command.';
            }

            return handlerInput.responseBuilder
                .speak(speechText)
                .getResponse();
        }
};

const DashboardPageIntentHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'DashboardPageIntent';
        },
        async handle(handlerInput) {
            console.warn('DashboardPageIntentHandler');

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            const {
                intent
            } = handlerInput.requestEnvelope.request;

            console.warn('intent: ', intent);
            console.warn('intent.slots: ', intent.slots);

            const direction = intent.slots.direction;
            console.warn('direction: ', direction);
            console.warn('direction.value: ', direction.value);

            let command = 'view ' + direction.value + ' page';

            let result = await interpretAndInvoke(command, sessionAttributes);
            
            console.warn('sfdcRequest result: ', result);
            console.warn('sfdcRequest result JSON: ', JSON.stringify(result, null, 2));

            let speechText = '';
            
            try {
                let items = result.response.items;
                let item = items[0];
                if (items.length > 0) {
                    sessionAttributes.state = JSON.stringify(item.state);
                } else {
                    sessionAttributes.state = JSON.stringify(result.response.state);
                }
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                speechText = 'Now viewing the ' + (item.label || item.name || 'undefined') + ' page';
            } catch (e) {
                console.error('Exception: ', e);
                speechText = 'Unable to process the command.';
            }


            return handlerInput.responseBuilder
                .speak(speechText)
                .getResponse();
        }
}

const LoginToSalesforceIntentHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'LoginToSalesforceIntent';
            //&& handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
        },
        async handle(handlerInput) {
            console.warn('LoginToSalesforceIntentHandler');

            console.warn('calling getSFDCPasswordToken');

            let speechText = '';

            try {
                const oauthResult = await getSFDCPasswordToken();

                speechText = 'Logged in to ' + oauthResult.instance_url;

                const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
                sessionAttributes.oauthResult = JSON.stringify(oauthResult);
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            } catch (e) {
                console.error('Login exception: ', e);
                speechText = 'There was an problem with logging in.';

            }
            return handlerInput.responseBuilder
                .speak(speechText)
                .getResponse();
        }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
        },
        handle(handlerInput) {
            console.warn('HelloWorldIntentHandler');

            const speechText = 'Hello World!';
            return handlerInput.responseBuilder
                .speak(speechText)
                //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
                .getResponse();
        }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
        },
        handle(handlerInput) {
            console.warn('HelpIntentHandler');

            const speechText = 'You can say hello to me! How can I help?';

            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(speechText)
                .getResponse();
        }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest' && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
        },
        handle(handlerInput) {
            console.warn('CancelAndStopIntentHandler');
            const speechText = 'Goodbye!';
            return handlerInput.responseBuilder
                .speak(speechText)
                .getResponse();
        }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
        },
        handle(handlerInput) {
            console.warn('SessionEndedRequestHandler');
            // Any cleanup logic goes here.
            console.warn(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
            return handlerInput.responseBuilder.getResponse();
        }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest';
        },
        handle(handlerInput) {
            console.warn('IntentReflectorHandler');
            const intentName = handlerInput.requestEnvelope.request.intent.name;
            const speechText = `You just triggered ${intentName}`;

            return handlerInput.responseBuilder
                .speak(speechText)
                //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
                .getResponse();
        }
};

const ErrorHandler = {
    canHandle() {
            return true;
        },
        handle(handlerInput, error) {
            console.warn('ErrorHandler');
            console.error(`~~~~ Error handled: ${error.message}`);
            const speechText = `Sorry, I couldn't understand what you said. Please try again.`;

            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(speechText)
                .getResponse();
        }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        LoginToSalesforceIntentHandler,
        SubscribeIntentHandler,
        ShowDashboardIntentHandler,
        DashboardPageIntentHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addErrorHandlers(
        ErrorHandler)
    .lambda();