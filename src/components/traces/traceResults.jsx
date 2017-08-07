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
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';

import Loading from '../common/loading';
import TraceResultsTable from './traceResultsTable';

@observer
export default class TraceResults extends React.Component {
    static propTypes = {
        history: PropTypes.object.isRequired,
        tracesSearchStore: PropTypes.object.isRequired
    }

    render() {
        const results = this.props.tracesSearchStore.searchResults;
        return (
            <section>
                { results && results.length ?
                    <TraceResultsTable tracesSearchStore={this.props.tracesSearchStore} history={this.props.history} /> :
                    <Loading /> }
            </section>
        );
    }
}
