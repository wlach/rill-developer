import "../../src/moduleAlias";
import {FunctionalTestBase} from "../functional/FunctionalTestBase";
import {execSync} from "node:child_process";
import {RootConfig} from "$common/config/RootConfig";
import {DatabaseConfig} from "$common/config/DatabaseConfig";
import {StateConfig} from "$common/config/StateConfig";

const PROFILING_TEST_FOLDER = "temp/profile";

export class ProfilingTest extends FunctionalTestBase {
    public async setup(): Promise<void> {
        execSync(`rm -rf ${PROFILING_TEST_FOLDER}/*`);
        execSync(`mkdir -p ${PROFILING_TEST_FOLDER}`);

        const config = new RootConfig({
            database: new DatabaseConfig({ databaseName: ":memory:" }),
            state: new StateConfig({ autoSync: true, syncInterval: 50 }),
            projectFolder: PROFILING_TEST_FOLDER, profileWithUpdate: true,
        });
        await super.setup(config);
    }

    public async verifyLargeImport(tablePath: string): Promise<void> {
        await this.setup();

        console.log(`Importing ${tablePath}`);
        console.time(tablePath);

        await this.clientDataModelerService.dispatch("addOrUpdateTableFromFile", [tablePath]);

        console.timeEnd(tablePath);

        await this.teardown();
    }
}

new ProfilingTest({}).verifyLargeImport(process.argv[2]);
