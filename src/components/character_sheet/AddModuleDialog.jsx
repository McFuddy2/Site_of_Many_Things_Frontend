import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MODULE_TYPE_OPTIONS } from "../../utils/character_sheet/schema";
import { ConfigureModuleForm, CONFIGURE_INSTRUCTIONS } from "./CustomCardBuilder";

// "Add Module…" on an existing card: the same two steps the Custom Card
// builder uses (pick a type, then configure it), for one module.

export default function AddModuleDialog({ card, onAdd, onClose }) {
	const [typeId, setTypeId] = useState("");
	const [configuring, setConfiguring] = useState(false);

	return (
		<Dialog.Root open onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="cs-modal-overlay" />
				<Dialog.Content className="cs-modal cs-builder-panel" aria-describedby={undefined}>
					<Dialog.Title className="cs-modal-title">Add a Module to “{card.title}”</Dialog.Title>
					{!configuring ? (
						<>
							<p className="cs-builder-instructions">What kind of module?</p>
							<select
								className="cs-select cs-builder-input"
								value={typeId}
								onChange={(event) => setTypeId(event.target.value)}
								autoFocus
							>
								<option value="" disabled>
									Module type…
								</option>
								{MODULE_TYPE_OPTIONS.map((option) => (
									<option key={option.id} value={option.id} disabled={!option.available}>
										{option.label}
										{option.available ? "" : " (coming soon)"}
									</option>
								))}
							</select>
							<div className="cs-builder-actions">
								<button
									type="button"
									className="cs-layout-btn cs-layout-btn--confirm"
									disabled={!typeId}
									onClick={() => setConfiguring(true)}
								>
									Next
								</button>
								<button type="button" className="cs-layout-btn" onClick={onClose}>
									Cancel
								</button>
							</div>
						</>
					) : (
						<>
							<p className="cs-builder-instructions">{CONFIGURE_INSTRUCTIONS[typeId] || "Configure this module:"}</p>
							<ConfigureModuleForm
								key={typeId}
								typeId={typeId}
								addLabel="Add Module"
								onAdd={(module) => {
									onAdd(module);
									onClose();
								}}
								onBack={() => setConfiguring(false)}
							/>
						</>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
