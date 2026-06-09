import { Dialog, DialogContent, DialogTitle } from './shadcn/dialog';

interface HtmlSandboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modal title shown above the iframe. */
  title: string;
  /** HTML string rendered inside a sandboxed iframe. */
  html: string;
}

/**
 * Fixed-size centered modal that renders author-provided HTML inside a
 * `sandbox=""` iframe. The frame dimensions are hardcoded — adversarial
 * CSS in the embedded HTML cannot resize the modal or break out of it.
 *
 * The `sandbox=""` attribute (empty value, not absent) maximally
 * restricts the iframe: no scripts, no forms, no same-origin, no popups,
 * no top-level navigation. Authors get styled HTML; the host page stays
 * isolated.
 *
 * Used by both the Tutorial button (`tutorial_html`) and the Hint button
 * (`clue_html`). Same renderer, same guarantees.
 */
export function HtmlSandboxModal({ open, onOpenChange, title, html }: HtmlSandboxModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        // Responsive sizing: full-width up to a 720px cap on desktop, and a
        // height that shrinks to fit phone viewports (min of 80dvh / 520px).
        // The grid layout lets the iframe flex to fill the remaining space.
        className="w-full sm:max-w-[720px] gap-3 p-4 grid-rows-[auto_1fr]"
        style={{ height: 'min(80dvh, 520px)' }}
      >
        <DialogTitle className="text-base font-display">{title}</DialogTitle>
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          // `sandbox=""` already blocks scripts; the iframe fills the
          // dialog's flexible content row so it scales with the viewport
          // without letting CSS inside grow the frame itself.
          className="w-full h-full min-h-0 rounded-lg border border-border bg-background"
        />
      </DialogContent>
    </Dialog>
  );
}
