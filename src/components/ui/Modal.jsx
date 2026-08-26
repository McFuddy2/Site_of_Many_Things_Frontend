// The site's reusable modal.
//
// Built on Radix Dialog (already a dependency, used by HelpDialog and the
// character sheet) so focus trapping, scroll locking and escape handling come for
// free. Styled to match the hand-rolled .modal-overlay modals elsewhere on the
// site.
//
// Pass dismissible={false} for a blocking modal: no close button, escape and
// outside clicks ignored. Used by the over-limit gate, which the user must
// resolve rather than dismiss.

import * as Dialog from "@radix-ui/react-dialog";
import "./Modal.css";

function CloseIcon() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
			<line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

export default function Modal({
	isOpen,
	onClose,
	title,
	description,
	children,
	footer,
	dismissible = true,
	size = "medium",
	className = "",
}) {
	const blockDismissal = (event) => {
		if (!dismissible) {
			event.preventDefault();
		}
	};

	return (
		<Dialog.Root
			open={isOpen}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && dismissible) {
					onClose?.();
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="som-modal-overlay" />
				<Dialog.Content
					className={`som-modal som-modal-${size} ${className}`.trim()}
					onEscapeKeyDown={blockDismissal}
					onPointerDownOutside={blockDismissal}
					onInteractOutside={blockDismissal}
				>
					<div className="som-modal-header">
						<Dialog.Title className="som-modal-title">{title}</Dialog.Title>
						{dismissible ? (
							<Dialog.Close asChild>
								<button type="button" className="som-modal-close" aria-label="Close">
									<CloseIcon />
								</button>
							</Dialog.Close>
						) : null}
					</div>

					{description ? (
						<Dialog.Description className="som-modal-description">{description}</Dialog.Description>
					) : (
						// Radix warns when Content has no Description; this keeps the
						// tree valid without showing anything.
						<Dialog.Description className="som-modal-visually-hidden">{title}</Dialog.Description>
					)}

					<div className="som-modal-body">{children}</div>

					{footer ? <div className="som-modal-footer">{footer}</div> : null}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
