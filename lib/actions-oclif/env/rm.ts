/**
 * @license
 * Copyright 2019 Balena Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { flags } from '@oclif/command';
import Command from '../../command';

import * as ec from '../../utils/env-common';
import { getBalenaSdk, stripIndent } from '../../utils/lazy';
import { CommandHelp } from '../../utils/oclif-utils';
import { parseAsInteger } from '../../utils/validation';

type IArg<T> = import('@oclif/parser').args.IArg<T>;

interface FlagsDef {
	config: boolean;
	device: boolean;
	service: boolean;
	yes: boolean;
}

interface ArgsDef {
	id: string;
}

export default class EnvRmCmd extends Command {
	public static description = stripIndent`
		Remove a config or env var from one or more applications, devices or services.

		Remove a configuration or environment variable from one or more applications, devices
		or services, as selected by command-line options.

		${ec.rmRenameHelp.split('\n').join('\n\t\t')}

		Interactive confirmation is normally asked before the variable is deleted.
		The --yes option disables this behavior.
`;
	public static examples = [
		'$ balena env rm 123123',
		'$ balena env rm 123123,234234',
		'$ balena env rm 234234 --yes',
		'$ balena env rm 345345 --config',
		'$ balena env rm 456456 --service',
		'$ balena env rm 567567 --device',
		'$ balena env rm 678678 --device --config',
		'$ balena env rm 789789 --device --service --yes',
	];

	public static args: Array<IArg<any>> = [
		{
			name: 'id',
			required: true,
			description: "variable's numeric database ID",
			parse: (input) => parseAsInteger(input, 'id'),
		},
	];

	// hardcoded 'env rm' to avoid oclif's 'env:rm' topic syntax
	public static usage =
		'env rm ' + new CommandHelp({ args: EnvRmCmd.args }).defaultUsage();

	public static flags: flags.Input<FlagsDef> = {
		config: ec.booleanConfig,
		device: ec.booleanDevice,
		service: ec.booleanService,
		yes: flags.boolean({
			char: 'y',
			description:
				'do not prompt for confirmation before deleting the variable',
			default: false,
		}),
	};

	public async run() {
		const { args: params, flags: opt } = this.parse<FlagsDef, ArgsDef>(
			EnvRmCmd,
		);

		await Command.checkLoggedIn();

		const { confirm } = await import('../../utils/patterns');
		const ids = params.id.toString().split(',');
		await confirm(
			opt.yes || false,
			ids.length > 1
				? `Are you sure you want to delete ${ids.length} environment variables?`
				: `Are you sure you want to delete environment variable ${ids[0]}?`,
			undefined,
			true,
		);

		const balena = getBalenaSdk();
		for (const id of ids) {
			try {
				await balena.pine.delete({
					resource: ec.getVarResourceName(opt.config, opt.device, opt.service),
					id: parseInt(id, 10),
				});
			} catch (err) {
				console.info(`${err.message}, id: ${id}`);
				process.exitCode = 1;
				continue;
			}
		}
	}
}
