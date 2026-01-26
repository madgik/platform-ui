import { Injectable } from '@angular/core';
import { ExperimentStudioService } from './experiment-studio.service';
import { DataModel } from '../models/data-model.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExperimentLabelService {
  private cache = new Map<string, Record<string, string>>();
  private inflight = new Map<string, Promise<Record<string, string>>>();

  constructor(private expStudio: ExperimentStudioService) {}

  private findDataModelByCodeVersion(codeVersion: string, models: DataModel[]): DataModel | null {
    if (!codeVersion) return null;
    const [code, version] = codeVersion.split(':');
    return models.find(m => m.code === code && String(m.version) === String(version)) ?? null;
  }

  async getLabelMap(domain: string | null | undefined): Promise<Record<string, string>> {
    if (!domain) return {};

    const cached = this.cache.get(domain);
    if (cached) return cached;

    const inflight = this.inflight.get(domain);
    if (inflight) return inflight;

    const p = (async () => {
      try {
        const models = await firstValueFrom(this.expStudio.loadAllDataModels());
        const model = this.findDataModelByCodeVersion(domain, models);

        if (!model) return {};

        const converted = this.expStudio.convertToD3Hierarchy(model);
        const map: Record<string, string> = {};

        converted.allVariables.forEach((v: any) => {
          if (v?.code) map[v.code] = v.label || v.code;
        });

        return map;
      } catch (err) {
        console.error('[ExperimentLabelService] failed to load data models', err);
        return {};
      } finally {
        this.inflight.delete(domain);
      }
    })();

    this.inflight.set(domain, p);

    const result = await p;
    this.cache.set(domain, result);
    return result;
  }

}
