import { ThemeEditorAdvanced } from '../../../block-theme/components/ThemeEditorAdvanced';
import { ThemeEditorBasic } from '../../../block-theme/components/ThemeEditorBasic';
import ThemeTools from '../../../block-theme/components/ThemeTools';
import ThemeList from '../../../block-theme/components/ThemeList';
import { RoundPanel } from '@core/component/RoundPanel';

export function Appearance() {
  return (
      <div
        class="absolute inset-0 overflow-hidden @container grid grid-cols-1 grid-rows-[min-content_min-content_1fr_1fr] @[650px]:grid-cols-2 @[650px]:grid-rows-[min-content_min-content_1fr] gap-[20px] p-[20px]"
      >
        <div class="@[650px]:col-span-2">
          <RoundPanel>
            <ThemeTools />
            <hr class="border-0 border-b border-b-edge-muted opacity-50"/>
            <ThemeEditorBasic />
          </RoundPanel>
        </div>
        <RoundPanel>
          <ThemeList/>
        </RoundPanel>
        <RoundPanel>
          <ThemeEditorAdvanced />
        </RoundPanel>
      </div>
  );
}
