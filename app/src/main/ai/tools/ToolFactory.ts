import { AITool } from './AITool';
import AuthService from '../../auth/service';
import { GetPresentationInfoTool } from './tools/GetPresentationInfoTool';
import { CreateSlideTool } from './tools/CreateSlideTool';
import { UpdateSlideTool } from './tools/UpdateSlideTool';
import { DeleteSlideTool } from './tools/DeleteSlideTool';
import { AddTextElementTool } from './tools/AddTextElementTool';
import { GetAllInfoAboutSlideTool } from './tools/GetAllInfoAboutSlideTool';
import { GetScreenshotOfSlideTool } from './tools/GetScreenshotOfSlideTool';
import { UpdateTextElementTool } from './tools/UpdateTextElementTool';
import { CreateBarChartTool } from './tools/CreateBarChartTool';
import { UpdateBarChartTool } from './tools/UpdateBarChartTool';
import { CreateShapeTool } from './tools/CreateShapeTool';
import { UpdateShapeTool } from './tools/UpdateShapeTool';
import { AlignElementsTool } from './tools/AlignElementsTool';
import { SpaceElementsEvenlyTool } from './tools/SpaceElementsEvenlyTool';
import { GetDataFromUrl } from './tools/GetDataFromUrl';
import { ChangeElementZIndexTool } from './tools/ChangeElementZIndexTool';
import { AddImageFromPexelsTool } from './tools/AddImageFromPexelsTool';
import { UpdateImageElementTool } from './tools/UpdateImageElementTool';
import { DeleteElementTool } from './tools/DeleteElementTool';
import { CriticTool } from './tools/CriticTool';
import { AlignToSlideTool } from './tools/AlignToSlideTool';
import { GridAlignTool } from './tools/GridAlignTool';
import { MatchSizeTool } from './tools/MatchSizeTool';
import { CreateSVGImageTool } from './tools/CreateSVGImageTool';
import { DuplicateSlideTool } from './tools/DuplicateSlideTool';

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
      new AlignElementsTool(),
      new SpaceElementsEvenlyTool(),
      new GetDataFromUrl(),
      new ChangeElementZIndexTool(),
      authService ? new AddImageFromPexelsTool(authService) : new AddImageFromPexelsTool(),
      new UpdateImageElementTool(),
      new DeleteElementTool(),
      new CriticTool(),
      new AlignToSlideTool(),
      new GridAlignTool(),
      new MatchSizeTool(),
      new CreateSVGImageTool(),
      new DuplicateSlideTool(),
    ];
  }
}
