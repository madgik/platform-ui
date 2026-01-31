
import { Injectable } from '@angular/core';
import { AlgorithmConfig } from '../models/algorithm-definition.model';
import { D3HierarchyNode } from '../models/data-model.interface';
import { AlgorithmNames, VariableTypes, AlgorithmRoles } from '../core/constants/algorithm.constants';

type SelectionRole = 'y' | 'x' | 'filters';
type RoleSelections = Record<SelectionRole, D3HierarchyNode[]>;

@Injectable({
    providedIn: 'root'
})
export class AlgorithmRulesService {

    constructor() { }

    isAlgorithmAvailable(
        algo: AlgorithmConfig,
        selections: RoleSelections
    ): boolean {
        if (!algo?.inputdata) return false;
        const name = algo.name;

        // SPECIAL CASES

        // 1-way ANOVA: 1 dependent (real/int) + 1 factor (nominal/text)
        if (name === AlgorithmNames.ANOVA_ONEWAY) {
            const { y: vars, x: covs } = selections;

            if (vars.length !== 1) return false;
            if (covs.length !== 1) return false;

            const yType = vars[0].type;
            const xType = covs[0].type;

            // y: real/int, x: nominal/text
            const yOk = [VariableTypes.REAL, VariableTypes.INTEGER, VariableTypes.INT].includes(yType ?? '');
            const xOk = [VariableTypes.NOMINAL, VariableTypes.TEXT].includes(xType ?? '');

            return yOk && xOk;
        }

        // 2-way ANOVA: 1 dependent + 2 nominal factors
        if (name === AlgorithmNames.ANOVA) {
            const { y: vars, x: covs } = selections;

            if (vars.length !== 1) return false;
            if (covs.length !== 2) return false;

            const allCovsNominal = covs.every(c =>
                [VariableTypes.NOMINAL, VariableTypes.TEXT].includes(c.type ?? '')
            );

            const yOk = [VariableTypes.REAL, VariableTypes.INTEGER, VariableTypes.INT].includes(vars[0].type ?? '');

            return yOk && allCovsNominal;
        }

        // One-sample t-test: exactly 1 dependent variable, no covariates
        if (name === AlgorithmNames.TTEST_ONESAMPLE) {
            const { y: vars, x: covs } = selections;

            if (vars.length !== 1) return false;
            if (covs.length !== 0) return false;

            const yType = vars[0].type;
            const yOk = [VariableTypes.REAL, VariableTypes.INTEGER, VariableTypes.INT].includes(yType ?? '');
            return yOk;
        }

        if (name === AlgorithmNames.PCA || name === AlgorithmNames.PCA_WITH_TRANSFORMATION) {
            const { y: vars, x: covs } = selections;
            if (vars.length < 2) return false;
            if (covs.length !== 0) return false;

            // PCA requires numeric variables only; block if any nominal/text is selected.
            const invalidType = vars.find((v) => {
                const t = this.normalizeType(v.type);
                return t === VariableTypes.TEXT || t === VariableTypes.NOMINAL || !t || ![VariableTypes.REAL, VariableTypes.INT, VariableTypes.INTEGER].includes(t);
            });

            return !invalidType;
        }

        const hasRole = (role: string) => Object.prototype.hasOwnProperty.call(algo.inputdata, role);

        if (!hasRole(AlgorithmRoles.Y) && selections[AlgorithmRoles.Y as SelectionRole].length > 0) return false;
        if (!hasRole(AlgorithmRoles.X) && selections[AlgorithmRoles.X as SelectionRole].length > 0) return false;

        // Filters are treated as optional; if the algo doesn't declare them, keep the algo available.
        const filterReq = hasRole(AlgorithmRoles.FILTERS)
            ? (algo.inputdata as any).filters
            : hasRole(AlgorithmRoles.FILTER)
                ? (algo.inputdata as any).filter
                : null;

        for (const [role, req] of Object.entries(algo.inputdata)) {
            if (![AlgorithmRoles.Y, AlgorithmRoles.X].includes(role)) continue;

            const sel: D3HierarchyNode[] = selections[role as SelectionRole] ?? [];
            const notBlank = this.normalizeBool((req as any)?.notblank) === true;
            const multiple = this.normalizeBool((req as any)?.multiple);

            if (notBlank && sel.length === 0) {
                return false;
            }

            if (multiple === false && sel.length > 1) {
                return false;
            }

            if (sel.length === 0) continue;

            // type check
            if ((req as any).types?.length) {
                const reqTypes = (req as any).types as string[];
                const selTypes = sel
                    .map(v => this.normalizeType(v.type))
                    .filter((t): t is string => !!t);

                const badType = selTypes.find(t => !reqTypes.includes(t));
                if (badType) {
                    console.warn(
                        `✘ ${name}: invalid type on role ${role}: ${badType} not in [${reqTypes.join(', ')}]`
                    );
                    return false;
                }
            }
        }

        if (filterReq) {
            const sel: D3HierarchyNode[] = selections[AlgorithmRoles.FILTERS as SelectionRole] ?? [];
            const notBlank = this.normalizeBool(filterReq.notblank) === true;
            const multiple = this.normalizeBool(filterReq.multiple);

            if (notBlank && sel.length === 0) return false;
            if (multiple === false && sel.length > 1) return false;

            if (filterReq.types?.length) {
                const selTypes = sel
                    .map(v => this.normalizeType(v.type))
                    .filter((t): t is string => !!t);

                const badType = selTypes.find(t => !filterReq.types.includes(t));
                if (badType) {
                    console.warn(
                        `✘ ${name}: invalid type on role filters: ${badType} not in [${filterReq.types.join(', ')}]`
                    );
                    return false;
                }
            }
        }

        return true;
    }

    getAlgorithmRequirementOverrides(algo: { name?: string; inputdata?: any } | null | undefined): { y?: string; x?: string; filters?: string } | null {
        const name = algo?.name;
        const formatTypes = (types?: string[] | null) =>
            Array.isArray(types) && types.length ? ` • types: ${types.join(',')}` : '';
        const yTypes = Array.isArray(algo?.inputdata?.y?.types) ? algo?.inputdata?.y?.types : null;
        const xTypes = Array.isArray(algo?.inputdata?.x?.types) ? algo?.inputdata?.x?.types : null;

        switch (name) {
            case AlgorithmNames.ANOVA_ONEWAY:
                return {
                    y: `Variable: exactly 1${formatTypes([VariableTypes.REAL, VariableTypes.INT])}`,
                    x: `Covariate: exactly 1${formatTypes([VariableTypes.NOMINAL, VariableTypes.TEXT])}`,
                };
            case AlgorithmNames.ANOVA:
                return {
                    y: `Variable: exactly 1${formatTypes([VariableTypes.REAL, VariableTypes.INT])}`,
                    x: `Covariate: exactly 2${formatTypes([VariableTypes.NOMINAL, VariableTypes.TEXT])}`,
                };
            case AlgorithmNames.TTEST_ONESAMPLE:
                return {
                    y: `Variable: exactly 1${formatTypes([VariableTypes.REAL, VariableTypes.INT])}`,
                    x: 'Covariate: none',
                };
            case AlgorithmNames.PCA:
                return {
                    y: `Variable: 2+${formatTypes(yTypes ?? [VariableTypes.REAL, VariableTypes.INT])}`,
                    x: 'Covariate: none',
                };
            default:
                return null;
        }
    }

    // helper: normalize types from UI -> backend
    private normalizeType(t: string | undefined | null): string | undefined {
        if (!t) return undefined;
        switch (t) {
            case VariableTypes.NOMINAL: return VariableTypes.TEXT;
            case VariableTypes.INTEGER: return VariableTypes.INT;
            default: return t; // real, text, binary...
        }
    }

    private normalizeBool(value: boolean | string | undefined | null): boolean | null {
        if (value === undefined || value === null) return null;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
        return null;
    }
}
