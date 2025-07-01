import { GetDataFromUrl } from './tools/GetDataFromUrl';

export function registerTools(registry: any): void {
    registry.registerTool(new GetDataFromUrl());
}
