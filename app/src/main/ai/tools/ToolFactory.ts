import type { AITool } from './AITool';
import { AddImageFromUrlTool } from './tools/AddImageFromUrlTool';
import { AddLogoTool } from './tools/AddLogoTool';
import { AddTextElementTool } from './tools/AddTextElementTool';
import { AlignElementsTool } from './tools/AlignElementsTool';
import { AlignToSlideTool } from './tools/AlignToSlideTool';
import { ArrangeInMatrixTool } from './tools/ArrangeInMatrixTool';
import { CalculatorTool } from './tools/CalculatorTool';
import { ChangeElementZIndexTool } from './tools/ChangeElementZIndexTool';
import { CopyElementsTool } from './tools/CopyElementsTool';
import { CreateBarChartTool } from './tools/CreateBarChartTool';
import { CreatePlotTool } from './tools/CreatePlotTool';
import { CreateShapeTool } from './tools/CreateShapeTool';
import { CreateSlideTool } from './tools/CreateSlideTool';
import { CreateSVGImageTool } from './tools/CreateSVGImageTool';
import { CreateTableTool } from './tools/CreateTableTool';
import { DeleteElementsTool } from './tools/DeleteElementsTool';
import { DeleteElementTool } from './tools/DeleteElementTool';
import { DeleteSlideTool } from './tools/DeleteSlideTool';
import { DuplicateSlideTool } from './tools/DuplicateSlideTool';
import { ExportPresentationToPdfTool } from './tools/ExportPresentationToPdfTool';
import { GenerateImageTool } from './tools/GenerateImageTool';
import { GetAllInfoAboutSlideTool } from './tools/GetAllInfoAboutSlideTool';
import { GetDataFromUrl } from './tools/GetDataFromUrl';
import { GetPresentationInfoTool } from './tools/GetPresentationInfoTool';
import { GetScreenshotOfSlideTool } from './tools/GetScreenshotOfSlideTool';
import { MatchSizeTool } from './tools/MatchSizeTool';
import { MoveElementTool } from './tools/MoveElementTool';
import { MoveSlideTool } from './tools/MoveSlideTool';
import { RedoLastEditTool } from './tools/RedoLastEditTool';
import { SpaceElementsEvenlyTool } from './tools/SpaceElementsEvenlyTool';
import { UndoLastEditTool } from './tools/UndoLastEditTool';
import { UpdateBarChartTool } from './tools/UpdateBarChartTool';
import { UpdateImageElementTool } from './tools/UpdateImageElementTool';
import { UpdatePlotTool } from './tools/UpdatePlotTool';
import { UpdateShapeTool } from './tools/UpdateShapeTool';
import { UpdateSlideTool } from './tools/UpdateSlideTool';
import { UpdateSVGImageTool } from './tools/UpdateSVGImageTool';
import { UpdateTableTool } from './tools/UpdateTableTool';
import { UpdateTextElementTool } from './tools/UpdateTextElementTool';

export class ToolFactory {
    static getBuiltInTools(): AITool[] {
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
            new CreateTableTool(),
            new UpdateTableTool(),
            new CreatePlotTool(),
            new UpdatePlotTool(),
            new CreateShapeTool(),
            new UpdateShapeTool(),
            new AlignElementsTool(),
            new SpaceElementsEvenlyTool(),
            new GetDataFromUrl(),
            new ChangeElementZIndexTool(),
            new CopyElementsTool(),
            new CalculatorTool(),
            new GenerateImageTool(),
            new AddImageFromUrlTool(),
            new AddLogoTool(),
            new UpdateImageElementTool(),
            new UpdateSVGImageTool(),
            new DeleteElementTool(),
            new DeleteElementsTool(),
            new MoveElementTool(),
            new MoveSlideTool(),
            new ExportPresentationToPdfTool(),
            new AlignToSlideTool(),
            new ArrangeInMatrixTool(),
            new MatchSizeTool(),
            new CreateSVGImageTool(),
            new DuplicateSlideTool(),
            new UndoLastEditTool(),
            new RedoLastEditTool(),
        ];
    }
}
