/*
 * Copyright 2018 Expedia, Inc.
 *
 *         Licensed under the Apache License, Version 2.0 (the "License");
 *         you may not use this file except in compliance with the License.
 *         You may obtain a copy of the License at
 *
 *             http://www.apache.org/licenses/LICENSE-2.0
 *
 *         Unless required by applicable law or agreed to in writing, software
 *         distributed under the License is distributed on an "AS IS" BASIS,
 *         WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *         See the License for the specific language governing permissions and
 *         limitations under the License.
 */

const Q = require('q');
const _ = require('lodash');

const config = require('../../../config/config');

const tracesConnector = require(`../../traces/${config.connectors.traces.connectorName}/tracesConnector`); // eslint-disable-line import/no-dynamic-require
const trendsConnector = require(`../../trends/${config.connectors.trends.connectorName}/trendsConnector`); // eslint-disable-line import/no-dynamic-require

const fetcher = require('../../fetchers/restFetcher');

const alertHistoryFetcher = fetcher('alertHistory');
const serviceAlertsFetcher = fetcher('serviceAlerts');

const connector = {};
const metricTankUrl = config.connectors.alerts.metricTankUrl;

const alertTypes = ['totalCount', 'durationTp99', 'failureCount'];

function fetchOperations(serviceName) {
   return tracesConnector.getOperations(serviceName);
}

function fetchOperationTrends(serviceName, granularity, from, until) {
    return trendsConnector.getOperationStats(serviceName, granularity, from, until);
}

function toMetricTankOperationName(operationName) {
    return operationName.replace(/\./gi, '___');
}

function fromMetricTankTarget(operationName) {
    return operationName.replace(/___/gi, '.');
}

function parseOperationAlertsResponse(data) {
    const parsedData = [];

    data.forEach((op) => {
        const targetSplit = op.target.split('.');

        const operationNameTagIndex = targetSplit.indexOf('operationName');
        const alertTypeIndex = targetSplit.indexOf('alertType');
        const operationName = fromMetricTankTarget(targetSplit[operationNameTagIndex + 1]);
        const type = fromMetricTankTarget(targetSplit[alertTypeIndex + 1]);

        const latestDatapoint = op.datapoints.sort((a, b) => b[1] - a[1])[0];
        const isUnhealthy = (latestDatapoint[0] === 1);

        let timestamp = latestDatapoint[1] * 1000 * 1000;
        if (!isUnhealthy) {
            const latestUnhealthy = op.datapoints.find(x => x[0]).sort((a, b) => b[1] - a[1]);
            timestamp = latestUnhealthy[1] * 1000 * 1000;
        }

        parsedData.push({
            operationName,
            type,
            isUnhealthy,
            timestamp
        });
    });

    return parsedData;
}

function fetchOperationAlerts(serviceName) {
    const target = `alertType.*.operationName.*.serviceName.${serviceName}.anomaly`;

    return serviceAlertsFetcher
    .fetch(`${metricTankUrl}/render?target=${target}`)
    .then(result => parseOperationAlertsResponse(result));
}

function mergeOperationAlertsAndTrends({operationAlerts, operations, operationTrends}) {
    const alertTypeToTrendMap = {
        totalCount: 'countPoints',
        durationTp99: 'tp99DurationPoints',
        failureCount: 'failurePoints'
    };

    return _.flatten(operations.map(operation => alertTypes.map((alertType) => {
            const operationAlert = operationAlerts.find(alert => (alert.operationName === operation && alert.type === alertType));
            const operationTrend = operationTrends.find(trend => (trend.operationName === operation));

            if (operationAlert) {
                return {
                    ...operationAlert,
                    trend: operationTrend ? operationTrend[alertTypeToTrendMap[alertType]] : []
                };
            }

            return {
                operationName: operation,
                type: alertType,
                isUnhealthy: false,
                timestamp: null,
                trend: operationTrend ? operationTrend[alertTypeToTrendMap[alertType]] : []
            };
        })));
}

function parseAlertDetailResponse(data) {
    if (!data || !data.length) {
        return [];
    }

    const parsedData = [];
    const sortedPoints = data[0].datapoints.sort((a, b) => a[1] - b[1]);
    let lastHealthyPoint = sortedPoints[0][1];

    sortedPoints.forEach((point, index) => {
        if (!point[0]) {
            if (index && sortedPoints[index - 1][0]) {
                parsedData.push({
                    startTimestamp: lastHealthyPoint * 1000 * 1000,
                    endTimestamp: sortedPoints[index - 1][1] * 1000 * 1000
                });
            }

            lastHealthyPoint = point[1];
        }
    });

    return parsedData;
}

connector.getServiceAlerts = (serviceName, query) => {
    const { granularity, from, until} = query;

    return Q
    .all([fetchOperations(serviceName), fetchOperationAlerts(serviceName), fetchOperationTrends(serviceName, granularity, from, until)])
    .then(stats => mergeOperationAlertsAndTrends({
            operations: stats[0],
            operationAlerts: stats[1],
            operationTrends: stats[2]
        })
    );
};

connector.getAlertDetails = (serviceName, operationName, alertType) => {
    const target = `alertType.${alertType}.operationName.${toMetricTankOperationName(operationName)}.serviceName.${serviceName}.anomaly`;

    return alertHistoryFetcher
    .fetch(`${metricTankUrl}/render?target=${target}`)
    .then(result => parseAlertDetailResponse(result));
};

// no-op for now, TODO add the metrictank read logic
connector.getServiceUnhealthyAlertCount = () => Q.fcall(() => 0);

module.exports = connector;
