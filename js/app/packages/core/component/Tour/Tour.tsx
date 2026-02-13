import { Show, createEffect, onCleanup, createSignal, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Button } from '@ui/components/Button';
import { registerHotkey } from '@core/hotkey/hotkeys';
import { HOTKEY_PRIORITY_CRITICAL, HOTKEY_PRIORITY_HIGH } from '@core/hotkey/types';
import { Dialog } from '@kobalte/core/dialog';
import { DialogWrapper } from '@core/component/DialogWrapper';
import { ClippedPanel } from '@core/component/ClippedPanel';
import { beveledCorners } from '../../../block-theme/signals/themeSignals';
import { DeprecatedIconButton } from '@core/component/DeprecatedIconButton';
import CloseIcon from '@icon/regular/x.svg';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TourCenteredCard } from './TourCenteredCard';
import { useTourState } from './useTourState';
import type { TourProps } from './types';
import { anchorVersion, resolveTourTargetElement } from './anchors';
import { getActionPerform } from './actionUtils';

export function Tour(props: TourProps) {
  const state = useTourState(props.config, props.onComplete, props.scopeContainer);
  const [showExitConfirm, setShowExitConfirm] = createSignal(false);

  // Register Escape key to skip tour
  createEffect(() => {
    const { dispose } = registerHotkey({
      scopeId: 'global',
      hotkey: 'escape',
      description: 'Skip tour',
      registrationType: 'add', // Don't override existing escape handlers
      runWithInputFocused: true,
      condition: () => !showExitConfirm(),
      keyDownHandler: () => {
        setShowExitConfirm(true);
        return true; // Consume the event to show the confirm dialog
      },
    });
    onCleanup(dispose);
  });

  // Enter advances when no action is required
  createEffect(() => {
    const { dispose } = registerHotkey({
      scopeId: 'global',
      hotkey: 'enter',
      description: 'Advance tour',
      registrationType: 'add',
      handlerPriority: HOTKEY_PRIORITY_CRITICAL,
      runWithInputFocused: true,
      condition: () => !state.actionWaiting() && !showExitConfirm(),
      keyDownHandler: () => {
        state.advanceToNextStep();
        return true;
      },
    });
    onCleanup(dispose);
  });

  // Register left/right arrows to cycle steps
  createEffect(() => {
    const { dispose: disposeLeft } = registerHotkey({
      scopeId: 'global',
      hotkey: 'arrowleft',
      description: 'Previous tour step',
      registrationType: 'add',
      handlerPriority: HOTKEY_PRIORITY_HIGH,
      runWithInputFocused: true,
      condition: () => !showExitConfirm(),
      keyDownHandler: () => {
        state.goToPreviousStep();
        return true;
      },
    });
    const { dispose: disposeRight } = registerHotkey({
      scopeId: 'global',
      hotkey: 'arrowright',
      description: 'Next tour step',
      registrationType: 'add',
      handlerPriority: HOTKEY_PRIORITY_HIGH,
      runWithInputFocused: true,
      condition: () => !showExitConfirm(),
      keyDownHandler: () => {
        if (state.actionWaiting()) {
          const perform = getActionPerform(state.currentStep().action);
          if (perform) {
            perform();
            return true;
          }
          return false;
        }
        state.goToNextStep();
        return true;
      },
    });
    onCleanup(() => {
      disposeLeft();
      disposeRight();
    });
  });

  const handleNext = () => {
    state.advanceToNextStep();
  };

  const hasAnchoredTarget = createMemo(() => {
    const step = state.currentStep();
    if (step.type !== 'anchored' || !step.target) return false;

    anchorVersion();
    return !!resolveTourTargetElement(step.target, props.scopeContainer);
  });

  return (
    <Portal>
      <Dialog open={showExitConfirm()} onOpenChange={setShowExitConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-modal-overlay bg-transparent" />
          <DialogWrapper width="420px">
            <Dialog.Content class="text-ink">
              <ClippedPanel tl={!beveledCorners()} active>
                <div class="flex items-center justify-between px-2 h-[40px] gap-2 border-b border-edge-muted">
                  <Dialog.Title>Leave tour?</Dialog.Title>
                  <Dialog.CloseButton>
                    <DeprecatedIconButton
                      tooltip={{ label: 'Close' }}
                      icon={CloseIcon}
                      iconSize={16}
                      theme="clear"
                      size="sm"
                    />
                  </Dialog.CloseButton>
                </div>
                <div class="px-4 py-3 text-sm text-ink-muted">
                  Are you sure you want to leave the tour? You can restart it later from Settings.
                </div>
                <div class="flex justify-end gap-2 px-4 pb-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowExitConfirm(false)}
                  >
                    Stay
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowExitConfirm(false);
                      props.onSkip();
                    }}
                  >
                    Leave Tour
                  </Button>
                </div>
              </ClippedPanel>
            </Dialog.Content>
          </DialogWrapper>
        </Dialog.Portal>
      </Dialog>

      <Show when={!showExitConfirm()}>
        <TourOverlay
          step={state.currentStep()}
          scopeContainer={props.scopeContainer}
        />
      </Show>

      <Show when={!showExitConfirm()}>
        <Show
          when={state.currentStep().type === 'anchored' && hasAnchoredTarget()}
          fallback={
            <TourCenteredCard
              step={state.currentStep()}
              stepIndex={state.currentStepIndex()}
              totalSteps={props.config.steps.length}
              onNext={handleNext}
              isWaitingForAction={state.actionWaiting()}
              isLastStep={state.isLastStep()}
            />
          }
        >
          <TourTooltip
            step={state.currentStep()}
            stepIndex={state.currentStepIndex()}
            totalSteps={props.config.steps.length}
            scopeContainer={props.scopeContainer}
            onNext={handleNext}
            isWaitingForAction={state.actionWaiting()}
            isLastStep={state.isLastStep()}
          />
        </Show>
      </Show>
    </Portal>
  );
}
