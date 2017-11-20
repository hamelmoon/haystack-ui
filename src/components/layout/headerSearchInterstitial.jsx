/*
 * Copyright 2017 Expedia, Inc.
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Redirect} from 'react-router-dom';
import {observer} from 'mobx-react';

import traceDetailsStore from '../traces/stores/traceDetailsStore';
import Loading from '../common/loading';
import Error from '../common/error';

@observer
export default class HeaderSearchInterstitial extends React.Component {
    static propTypes = {
        match: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        traceDetailsStore.fetchTraceDetails(this.props.match.params.traceId);
    }

    render() {
            return (
                traceDetailsStore.promiseState && traceDetailsStore.promiseState.case({
                    pending: () => <Loading />,
                    rejected: () => <Error errorMessage={`TraceId ${this.props.match.params.traceId} not found.`}/>,
                    fulfilled: () => {
                        if (traceDetailsStore.spans && traceDetailsStore.spans.length) {
                            const rootSpan = (traceDetailsStore.spans.find(span => !span.parentSpanId));
                            return (<Redirect
                                to={`/service/${rootSpan.serviceName}/traces?serviceName=${rootSpan.serviceName}&operationName=${rootSpan.operationName}&traceId=${this.props.match.params.traceId}`}
                            />);
                        }
                        return <Error errorMessage={`TraceId ${this.props.match.params.traceId} not found.`}/>;
                    }
                })
            );
    }
}
