import type AuthService from '../../auth/service';
import type { AITool } from './AITool';
// import { AddImageFromPexelsTool } from './tools/AddImageFromPexelsTool';
import { AddImageFromUrlTool } from './tools/AddImageFromUrlTool';
import { AddTextElementTool } from './tools/AddTextElementTool';
import { AlignElementsTool } from './tools/AlignElementsTool';
import { AlignToSlideTool } from './tools/AlignToSlideTool';
import { ArrangeInMatrixTool } from './tools/ArrangeInMatrixTool';
import { CalculatorTool } from './tools/CalculatorTool';
import { ChangeElementZIndexTool } from './tools/ChangeElementZIndexTool';
import { CopyElementsTool } from './tools/CopyElementsTool';
import { CreateBarChartTool } from './tools/CreateBarChartTool';
import { CreateIconTool } from './tools/CreateIconTool';
import { CreateShapeTool } from './tools/CreateShapeTool';
import { CreateSlideTool } from './tools/CreateSlideTool';
import { CreateSVGImageTool } from './tools/CreateSVGImageTool';
import { CriticTool } from './tools/CriticTool';
import { DeleteElementTool } from './tools/DeleteElementTool';
import { DeleteSlideTool } from './tools/DeleteSlideTool';
import { DuplicateSlideTool } from './tools/DuplicateSlideTool';
import { GetAllInfoAboutSlideTool } from './tools/GetAllInfoAboutSlideTool';
import { GetDataFromUrl } from './tools/GetDataFromUrl';
import { GetPresentationInfoTool } from './tools/GetPresentationInfoTool';
import { GetScreenshotOfSlideTool } from './tools/GetScreenshotOfSlideTool';
import { MatchSizeTool } from './tools/MatchSizeTool';
import { SearchPexelsImagesTool } from './tools/SearchPexelsImagesTool';
import { SpaceElementsEvenlyTool } from './tools/SpaceElementsEvenlyTool';
import { UpdateBarChartTool } from './tools/UpdateBarChartTool';
import { UpdateIconTool } from './tools/UpdateIconTool';
import { UpdateImageElementTool } from './tools/UpdateImageElementTool';
import { UpdateShapeTool } from './tools/UpdateShapeTool';
import { UpdateSlideTool } from './tools/UpdateSlideTool';
import { UpdateTextElementTool } from './tools/UpdateTextElementTool';

export class ToolFactory {
    static getBuiltInTools(authService?: AuthService): AITool[] {
        return [
            new GetPresentationInfoTool(),
            new CreateSlideTool(),
            new UpdateSlideTool(),
            new DeleteSlideTool(),
            new AddTextElementTool(),
            new GetAllInfoAboutSlideTool(),
            new GetScreenshotOfSlideTool(),
            new UpdateTextElementTool(),
            new CreateBarChartTool(),
            new UpdateBarChartTool(),
            new CreateShapeTool(),
            new UpdateShapeTool(),
            new CreateIconTool(),
            new UpdateIconTool(),
            new AlignElementsTool(),
            new SpaceElementsEvenlyTool(),
            new GetDataFromUrl(),
            new ChangeElementZIndexTool(),
            new CopyElementsTool(),
            new CalculatorTool(),
            // authService
            //     ? new AddImageFromPexelsTool(authService)
            //     : new AddImageFromPexelsTool(),
            authService
                ? new SearchPexelsImagesTool(authService)
                : new SearchPexelsImagesTool(),
            new AddImageFromUrlTool(),
            new UpdateImageElementTool(),
            new DeleteElementTool(),
            new CriticTool(),
            new AlignToSlideTool(),
            // new GridAlignTool(),
            new ArrangeInMatrixTool(),
            new MatchSizeTool(),
            new CreateSVGImageTool(),
            new DuplicateSlideTool(),
            // new ExportPowerPointTool(),
        ];
    }
}
