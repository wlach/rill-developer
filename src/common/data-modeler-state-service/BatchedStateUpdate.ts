import type {
    EntityRecord,
    EntityState
} from "$common/data-modeler-state-service/entity-state-service/EntityStateService";
import type {EntityType, StateType} from "$common/data-modeler-state-service/entity-state-service/EntityStateService";
import type {EntityStateService} from "$common/data-modeler-state-service/entity-state-service/EntityStateService";
import {Debounce} from "$common/utils/Debounce";
import type {Patch} from "immer";

const StateUpdateThrottle = 100;

export class BatchedStateUpdate {
    private callbacksByType = new Map<string, Array<(draft: EntityState<EntityRecord>) => void>>();
    private serviceMap = new Map<string, EntityStateService<any>>();
    private debounce = new Debounce();

    constructor(private readonly patchesCallback: (patches: Array<Patch>, entityType: EntityType, stateType: StateType) => void) {
    }

    public updateState(service: EntityStateService<any>,
                       callback: (draft: EntityState<EntityRecord>) => void) {
        const key = BatchedStateUpdate.getKey(service.entityType, service.stateType);

        if (!this.callbacksByType.has(key)) {
            this.callbacksByType.set(key, [callback]);
        } else {
            this.callbacksByType.get(key).push(callback);
        }

        if (!this.serviceMap.has(key)) {
            this.serviceMap.set(key, service);
        }

        this.debounce.debounce(key, async () => {
            await this.batchUpdateState(key);
        }, StateUpdateThrottle);
    }

    private async batchUpdateState(key: string) {
        const callbacks = this.callbacksByType.get(key);
        this.callbacksByType.set(key, []);

        const service = this.serviceMap.get(key);

        service.updateState((draft) => {
            callbacks.forEach(callback => callback(draft));
            draft.lastUpdated = Date.now();
        }, (patches) => {
            this.patchesCallback(patches, service.entityType, service.stateType);
        });
    }

    private static getKey(entityType: EntityType, stateType: StateType): string {
        return `${entityType}-${stateType}`;
    }
}
