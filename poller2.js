const ConductorClient = require('conductor-client').default
const {doHttpRequest} = require('./httpclient2');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    defaultMeta: { service: 'conductor-poller' },
    transports: [
        new winston.transports.File({ filename: 'conductor_poller_error.log', level: 'error' }),
        new winston.transports.File({ filename: 'conductor_poller.log' }),
    ],
});
const conductorClient = new ConductorClient({
    baseURL: 'http://localhost:8080/api'
})

const httpTaskDef =
    {
        name: 'http_task',
        retryCount: 3,
        timeoutSeconds: 3600,
        inputKeys: ['http_options', 'http_body_data'],
        outputKeys: ['http_response'],
        timeoutPolicy: 'TIME_OUT_WF',
        retryLogic: 'FIXED',
        retryDelaySeconds: 60,
        responseTimeoutSeconds: 3600
    };

let registerHttpWorker = () => conductorClient.registerWatcher(
    httpTaskDef.name,
    async (data, updater) => {
        try {
            logger.verbose('Received task data type: ', data.taskType, ' data: ', data.inputData)

            //TODO do we need in progress??
            await updater.inprogress({
                outputData: { http_response: '' },
                callbackAfterSeconds: 123, //TODO ??
                logs: ['ello', 'eieiei', 'huhu', JSON.stringify({ hello: 'test' })]
            })

            doHttpRequest(data.inputData.http_options, data.inputData.http_body_data, async (err, response) => {
                await conductorClient.updateTask({
                    workflowInstanceId: data.workflowInstanceId,
                    taskId: data.taskId,
                    status: response.status,
                    outputData: {
                        http_response: response.output
                    },
                    logs: ['2233344']
                });
            } )

        } catch (error) {
            logger.error('Unable to do HTTP request ', error);
            //TODO error handling ?
        }
    },
    { pollingIntervals: 1000, autoAck: true, maxRunner: 1 },
    true
);

exports.httpTaskDef = httpTaskDef;
exports.registerHttpWorker = registerHttpWorker;