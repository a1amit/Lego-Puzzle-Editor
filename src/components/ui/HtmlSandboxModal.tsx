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
        className="!max-w-[720px] !w-[720px] gap-3 p-4"
        style={{ height: 520 }}
      >
        <DialogTitle className="text-base">{title}</DialogTitle>
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          // Hardcoded dimensions — `sandbox=""` already blocks scripts,
          // and the explicit width/height means CSS inside the iframe
          // can't grow the frame itself.
          className="w-full rounded-lg border border-border bg-background"
          style={{ height: 440 }}
        />
      </DialogContent>
    </Dialog>
  );
}
