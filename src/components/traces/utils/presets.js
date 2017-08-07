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

function getUnitText(unit) {
    if (unit === 'd') return 'day';
    if (unit === 'h') return 'hour';
    return 'minute';
}

export default function toPresetDisplayText(preset) {
    const count = preset.substr(0, preset.length - 1);
    const unit = getUnitText(preset[preset.length - 1]);

    return `last ${count} ${unit}${count > 1 ? 's' : ''}`;
}
